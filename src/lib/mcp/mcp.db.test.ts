import { randomUUID } from 'node:crypto';
import prisma from '@/lib/prisma';
import { resetRateLimits } from '@/lib/rate-limit';
import { quickUser, uid } from '@/test/db/actions-fixtures';
import { hashSecret, newSecret } from '@/lib/oauth/crypto';
import { OAUTH_TTL } from '@/lib/oauth/config';
import { handleMcpRequest } from './handler';
import { MCP_TOOLS } from './registry';

// The MCP endpoint end to end against real Postgres: authentication, the Origin check, every read
// tool (with secrets planted in the database that must never come out) and the writes.

const ORIGIN = 'http://localhost:3000';
const RESOURCE = `${ORIGIN}/api/mcp`;

jest.mock('@/lib/youtube-metadata', () => ({
  fetchYoutubeMetadata: jest.fn(async () => ({
    channel: 'Canal de prueba',
    durationSeconds: 754,
    publishedAt: new Date('2026-10-01T00:00:00.000Z'),
  })),
}));

/** Planted in every secret column; no tool output may contain any of them. */
const CANARY = `canary-${uid()}`;

const mcpAdmin = async () => {
  const admin = await quickUser({ role: 'ADMIN', name: `Admin ${uid()}` });
  return prisma.user.update({
    where: { id: admin.id },
    data: {
      twoFactorEnabledAt: new Date(),
      twoFactorSecret: `${CANARY}-totp`,
      twoFactorRecoveryCodes: [`${CANARY}-recovery`],
      password: `${CANARY}-password-hash`,
    },
  });
};

/** A connection for `userId`, made straight in the database. Returns its access token. */
const connect = async (userId: string, overrides: { resource?: string } = {}) => {
  const client = await prisma.oAuthClient.create({
    data: { name: 'Claude', redirectUris: ['http://localhost:3000/callback'] },
  });
  const accessToken = newSecret();
  await prisma.oAuthToken.create({
    data: {
      accessTokenHash: hashSecret(accessToken),
      refreshTokenHash: hashSecret(newSecret()),
      familyId: randomUUID(),
      clientId: client.id,
      userId,
      resource: overrides.resource ?? RESOURCE,
      accessExpiresAt: new Date(Date.now() + OAUTH_TTL.accessSeconds * 1000),
      refreshExpiresAt: new Date(Date.now() + OAUTH_TTL.refreshSeconds * 1000),
    },
  });
  return accessToken;
};

let requestId = 0;

const rpc = (
  method: string,
  params: Record<string, unknown>,
  { token, origin }: { token?: string; origin?: string } = {},
) =>
  handleMcpRequest(
    new Request(RESOURCE, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        'mcp-protocol-version': '2025-06-18',
        ...(token && { authorization: `Bearer ${token}` }),
        ...(origin && { origin }),
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++requestId, method, params }),
    }),
  );

/** The JSON-RPC message of a response, whether it came as JSON or as one SSE event. */
const message = async (response: Response) => {
  const text = await response.text();
  if ((response.headers.get('content-type') ?? '').includes('text/event-stream')) {
    const data = text
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .join('');
    return JSON.parse(data);
  }
  return JSON.parse(text);
};

const callTool = async (token: string, name: string, args: Record<string, unknown> = {}) => {
  const response = await rpc('tools/call', { name, arguments: args }, { token });
  const body = await message(response);
  if (body.error) throw new Error(`${name}: ${JSON.stringify(body.error)}`);
  const text: string = body.result.content[0].text;
  return { text, isError: !!body.result.isError, json: () => JSON.parse(text) };
};

beforeEach(() => resetRateLimits());

describe('authentication', () => {
  it('asks for a token, pointing at the protected resource metadata', async () => {
    const response = await rpc('tools/list', {});
    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toContain(
      `resource_metadata="${ORIGIN}/.well-known/oauth-protected-resource/api/mcp"`,
    );
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('rejects unknown, revoked and other-resource tokens', async () => {
    const admin = await mcpAdmin();
    expect((await rpc('tools/list', {}, { token: newSecret() })).status).toBe(401);

    const otherResource = await connect(admin.id, { resource: 'https://evil.example/api/mcp' });
    expect((await rpc('tools/list', {}, { token: otherResource })).status).toBe(401);

    const revoked = await connect(admin.id);
    await prisma.oAuthToken.updateMany({
      where: { accessTokenHash: hashSecret(revoked) },
      data: { revokedAt: new Date() },
    });
    expect((await rpc('tools/list', {}, { token: revoked })).status).toBe(401);
  });

  it('rejects the token of someone who is no longer an admin', async () => {
    const admin = await mcpAdmin();
    const token = await connect(admin.id);
    await prisma.user.update({ where: { id: admin.id }, data: { role: 'REGULAR' } });
    expect((await rpc('tools/list', {}, { token })).status).toBe(401);
  });

  it('rejects cross-origin browser requests', async () => {
    const admin = await mcpAdmin();
    const token = await connect(admin.id);
    const response = await rpc('tools/list', {}, { token, origin: 'https://evil.example' });
    expect(response.status).toBe(403);
    expect((await rpc('tools/list', {}, { token, origin: ORIGIN })).status).toBe(200);
  });

  it('turns off with the kill switch', async () => {
    process.env.MCP_ENABLED = 'false';
    try {
      expect((await rpc('tools/list', {})).status).toBe(404);
    } finally {
      delete process.env.MCP_ENABLED;
    }
  });
});

describe('tools', () => {
  let token: string;
  let adminId: string;

  beforeAll(async () => {
    const admin = await mcpAdmin();
    adminId = admin.id;
    token = await connect(admin.id);
  });

  it('lists every tool with read-only and destructive hints', async () => {
    const body = await message(await rpc('tools/list', {}, { token }));
    const tools: { name: string; annotations: Record<string, boolean> }[] = body.result.tools;
    expect(tools.map((tool) => tool.name).sort()).toEqual(
      MCP_TOOLS.map((tool) => tool.name).sort(),
    );
    const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool.annotations]));
    expect(byName.list_events.readOnlyHint).toBe(true);
    expect(byName.create_event.readOnlyHint).toBe(false);
    expect(byName.delete_announcement.destructiveHint).toBe(true);
  });

  it('has unique tool names', () => {
    const names = MCP_TOOLS.map((tool) => tool.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('never returns a secret from any read tool', async () => {
    // Secrets in every place a careless select could reach.
    const member = await quickUser({ name: `Canario ${uid()}` });
    await prisma.user.update({
      where: { id: member.id },
      data: { password: `${CANARY}-member-hash`, twoFactorSecret: `${CANARY}-member-totp` },
    });
    await prisma.pushSubscription.create({
      data: {
        userId: member.id,
        endpoint: `https://push.example/${CANARY}`,
        p256dh: `${CANARY}-p256dh`,
        auth: `${CANARY}-auth`,
      },
    });
    const event = await prisma.event.create({
      data: {
        name: `Evento ${uid()}`,
        description: 'Un evento para probar el MCP',
        date: new Date(Date.now() + 7 * 86400000),
        isOnline: true,
        createdById: adminId,
      },
    });
    await prisma.eventRegistration.create({ data: { eventId: event.id, userId: member.id } });
    await prisma.advice.create({ data: { authorId: member.id, content: `Consejo ${uid()}` } });
    const category = await prisma.forumCategory.create({
      data: { slug: `mcp-${uid()}`, name: 'MCP', description: 'Categoría de prueba' },
    });
    const post = await prisma.forumPost.create({
      data: {
        title: 'Un tema',
        content: 'Texto del tema',
        authorId: member.id,
        categoryId: category.id,
      },
    });

    const argsFor = (name: string) => {
      if (name === 'get_event') return { id: event.id };
      if (name === 'get_event_registrations') return { eventId: event.id, includeCancelled: true };
      if (name === 'get_member') return { id: member.id };
      if (name === 'search_site') return { query: 'Canario' };
      if (name === 'get_forum_post') return { id: post.id };
      return {};
    };

    const outputs: string[] = [];
    for (const tool of MCP_TOOLS.filter((candidate) => candidate.kind === 'read')) {
      const result = await callTool(token, tool.name, argsFor(tool.name));
      expect([tool.name, result.isError, result.text.slice(0, 200)]).toEqual([
        tool.name,
        false,
        expect.any(String),
      ]);
      outputs.push(result.text);
    }
    const all = outputs.join('\n');
    expect(all).not.toContain(CANARY);
    for (const key of ['"password"', '"twoFactorSecret"', '"twoFactorRecoveryCodes"', '"p256dh"'])
      expect(all).not.toContain(key);
    // But the private data an admin needs is there.
    const registrations = JSON.parse(
      (await callTool(token, 'get_event_registrations', { eventId: event.id })).text,
    );
    expect(registrations.registrations[0].user.email).toBe(member.email);

    // Other test files expect only the forum categories the migration created.
    await prisma.forumPost.delete({ where: { id: post.id } });
    await prisma.forumCategory.delete({ where: { id: category.id } });
  });

  it('reports a missing row as a tool error, not a crash', async () => {
    const result = await callTool(token, 'get_event', { id: 'no-such-event' });
    expect(result).toMatchObject({ isError: true, text: 'Evento no encontrado' });
  });

  it('rejects invalid arguments', async () => {
    const body = await message(
      await rpc('tools/call', { name: 'list_events', arguments: { limit: 5000 } }, { token }),
    );
    expect(JSON.stringify(body)).toMatch(/limit|too_big|Invalid/i);
  });

  it('creates, edits, publishes and deletes an announcement, and audits each write', async () => {
    const created = await callTool(token, 'create_announcement', {
      title: 'Anuncio desde Claude',
      content: 'Un anuncio que se creó con el servidor MCP.',
      category: 'noticia',
      published: false,
    });
    expect(created.isError).toBe(false);
    const { id } = created.json();
    expect(await prisma.announcement.findUnique({ where: { id } })).toMatchObject({
      authorId: adminId,
      published: false,
    });

    const updated = await callTool(token, 'update_announcement', { id, published: true });
    expect(updated.json().updated).toEqual(['published']);
    expect(await prisma.announcement.findUnique({ where: { id } })).toMatchObject({
      title: 'Anuncio desde Claude',
      published: true,
    });

    expect((await callTool(token, 'delete_announcement', { id })).isError).toBe(false);
    expect(await prisma.announcement.findUnique({ where: { id } })).toBeNull();

    const audit = await prisma.appLog.findMany({
      where: { userId: adminId, message: { startsWith: '[mcp] tool' } },
      select: { message: true, metadata: true },
    });
    expect(audit.map((row) => row.message)).toEqual(
      expect.arrayContaining([
        '[mcp] tool create_announcement',
        '[mcp] tool update_announcement',
        '[mcp] tool delete_announcement',
      ]),
    );
    // The audit keeps ids and field names, never the text.
    expect(audit.map((row) => row.metadata).join()).not.toContain('Un anuncio que se creó');
  });

  it('creates and edits an online event', async () => {
    const created = await callTool(token, 'create_event', {
      name: `Meetup MCP ${uid()}`,
      description: 'Un meetup virtual creado desde Claude.',
      date: '2020-01-10T19:00:00-03:00',
      isOnline: true,
    });
    expect(created.isError).toBe(false);
    const { id } = created.json();
    const event = await prisma.event.findUnique({
      where: { id },
      include: { organizers: true },
    });
    expect(event?.organizers.map((organizer) => organizer.userId)).toEqual([adminId]);

    const updated = await callTool(token, 'update_event', { id, capacity: 40 });
    expect(updated.isError).toBe(false);
    expect(await prisma.event.findUnique({ where: { id } })).toMatchObject({
      capacity: 40,
      description: 'Un meetup virtual creado desde Claude.',
    });
  });

  it('explains what an in-person event is missing', async () => {
    const result = await callTool(token, 'create_event', {
      name: 'Evento presencial',
      description: 'Le faltan los datos del lugar.',
      date: '2020-01-10T19:00:00-03:00',
    });
    expect(result.isError).toBe(true);
    expect(result.text).toContain('ciudad');
  });

  it('recommends a talk video, already approved', async () => {
    const videoId = `m${uid()}${uid()}`.slice(0, 11);
    const result = await callTool(token, 'recommend', {
      kind: 'VIDEO',
      url: `https://www.youtube.com/watch?v=${videoId}`,
      title: 'Una charla recomendada desde Claude',
      author: 'Alguien',
      isTalk: true,
    });
    expect(result.isError).toBe(false);
    expect(result.json().status).toBe('APPROVED');
    const item = await prisma.recommendation.findFirst({ where: { kind: 'VIDEO', slug: videoId } });
    expect(item).toMatchObject({ isTalk: true, source: 'Canal de prueba', submittedById: adminId });

    const updated = await callTool(token, 'update_recommendation', {
      id: item!.id,
      author: 'Otra persona',
    });
    expect(updated.isError).toBe(false);
    expect(await prisma.recommendation.findUnique({ where: { id: item!.id } })).toMatchObject({
      author: 'Otra persona',
      title: 'Una charla recomendada desde Claude',
      isTalk: true,
    });

    // A video has no description: saying so beats dropping it silently.
    const unused = await callTool(token, 'update_recommendation', {
      id: item!.id,
      description: 'Muy buena',
    });
    expect(unused.isError).toBe(true);
    expect(unused.text).toContain('VIDEO no usa description');
  });

  it('audits reads of private data, but not public reads', async () => {
    const fresh = await mcpAdmin();
    const freshToken = await connect(fresh.id);
    await callTool(freshToken, 'search_members', { query: 'nadie' });
    await callTool(freshToken, 'list_events', {});
    const reads = await prisma.appLog.findMany({
      where: { userId: fresh.id, message: { startsWith: '[mcp] read' } },
      select: { message: true },
    });
    expect(reads.map((row) => row.message)).toEqual(['[mcp] read search_members']);
  });

  it('caps the writes that notify the community per connection', async () => {
    const fresh = await mcpAdmin();
    const freshToken = await connect(fresh.id);
    const results = [];
    for (let i = 0; i < 6; i++) {
      results.push(
        await callTool(freshToken, 'create_announcement', {
          title: `Borrador ${i}`,
          content: 'Un borrador para probar el límite.',
          category: 'general',
          published: false,
        }),
      );
    }
    expect(results.slice(0, 5).every((result) => !result.isError)).toBe(true);
    expect(results[5]).toMatchObject({ isError: true });
    expect(results[5].text).toContain('avisos');
    // Other writes still have their own, wider budget.
    const other = await callTool(freshToken, 'reject_recommendation', { id: 'no-such-item' });
    expect(other.text).toBe('Recomendación no encontrada');
  });

  it('rate limits each connection', async () => {
    let status = 200;
    for (let i = 0; i < 301 && status === 200; i++)
      status = (await rpc('tools/list', {}, { token })).status;
    expect(status).toBe(429);
  });
});
