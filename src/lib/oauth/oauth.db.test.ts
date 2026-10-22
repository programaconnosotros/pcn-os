import prisma from '@/lib/prisma';
import { resetRateLimits } from '@/lib/rate-limit';
import { actAs } from '@/test/db/fixtures';
import { quickUser, uid } from '@/test/db/actions-fixtures';
import { approveAuthorization } from '@/actions/oauth/approve-authorization';
import { revokeAllMcpConnections, revokeMcpConnection } from '@/actions/oauth/mcp-connections';
import { listMcpConnections } from './connections';
import { POST as register } from '@/app/oauth/register/route';
import { POST as token } from '@/app/oauth/token/route';
import { POST as revoke } from '@/app/oauth/revoke/route';
import { generateTotpSecret, hashRecoveryCode, timeStep, totpAt } from '@/lib/totp';
import { encryptTwoFactorSecret } from '@/lib/two-factor-crypto';
import { hashSecret, newSecret, pkceChallengeFor } from './crypto';
import {
  purgeDeadOAuthRows,
  resetOAuthPurge,
  revokeUserOAuthAccess,
  verifyAccessToken,
} from './tokens';

// The whole OAuth flow of the MCP server against real Postgres: a client registers, an admin
// approves, the client trades the code and rotates its tokens, and every way of misusing a code
// or a token fails.

const ORIGIN = 'http://localhost:3000';
const RESOURCE = `${ORIGIN}/api/mcp`;
const REDIRECT = 'http://localhost:33418/callback';

// Each test registers from its own IP: the per-IP cap on registrations is counted in the database,
// which every test shares.
const randomIp = () =>
  `198.51.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

const json = (path: string, body: unknown, ip = randomIp()) =>
  new Request(`${ORIGIN}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });

const form = (path: string, body: Record<string, string>) =>
  new Request(`${ORIGIN}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'x-forwarded-for': '198.51.100.9',
    },
    body: new URLSearchParams(body).toString(),
  });

// Recovery codes left for each test admin: approving a connection spends one, like at sign-in.
const recoveryCodes = new Map<string, string[]>();
const totpSecrets = new Map<string, string>();

/** An admin with 2FA on: a real TOTP secret and a stack of recovery codes. */
const mcpAdmin = async () => {
  const admin = await quickUser({ role: 'ADMIN' });
  const codes = Array.from({ length: 20 }, (_, i) => `rc-${uid()}-${i}`);
  const secret = generateTotpSecret();
  recoveryCodes.set(admin.id, codes);
  totpSecrets.set(admin.id, secret);
  return prisma.user.update({
    where: { id: admin.id },
    data: {
      twoFactorEnabledAt: new Date(),
      twoFactorSecret: encryptTwoFactorSecret(secret, admin.id),
      twoFactorRecoveryCodes: codes.map(hashRecoveryCode),
    },
  });
};

const nextCode = (userId: string) => recoveryCodes.get(userId)?.shift() ?? 'no-code';

const approve = (userId: string, query: Record<string, string>, code = nextCode(userId)) =>
  approveAuthorization({ query, code });

const registerClient = async (redirectUris = [REDIRECT], ip?: string) => {
  const response = await register(
    json('/oauth/register', { client_name: 'Claude Code', redirect_uris: redirectUris }, ip),
  );
  return { response, body: await response.json() };
};

const authorizeQuery = (
  clientId: string,
  verifier: string,
  extra: Record<string, string> = {},
) => ({
  response_type: 'code',
  client_id: clientId,
  redirect_uri: REDIRECT,
  code_challenge: pkceChallengeFor(verifier),
  code_challenge_method: 'S256',
  state: 'state-123',
  resource: RESOURCE,
  ...extra,
});

/** Registers a client and has `userId` approve it; returns the code from the redirect. */
const approvedCode = async (userId: string) => {
  const { body: client } = await registerClient();
  const verifier = newSecret();
  await actAs(userId);
  const result = await approve(userId, authorizeQuery(client.client_id, verifier));
  if (!result.ok) throw new Error(result.error);
  const redirect = new URL(result.redirectTo);
  return { clientId: client.client_id as string, verifier, redirect };
};

const exchange = (clientId: string, code: string, verifier: string, extra = {}) =>
  token(
    form('/oauth/token', {
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
      code_verifier: verifier,
      redirect_uri: REDIRECT,
      resource: RESOURCE,
      ...extra,
    }),
  );

const refresh = (clientId: string, refreshToken: string) =>
  token(
    form('/oauth/token', {
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: refreshToken,
    }),
  );

beforeEach(() => resetRateLimits());

describe('client registration', () => {
  it('registers a public client with an allowlisted redirect URI', async () => {
    const { response, body } = await registerClient();
    expect(response.status).toBe(201);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body).toMatchObject({
      client_name: 'Claude Code',
      redirect_uris: [REDIRECT],
      token_endpoint_auth_method: 'none',
    });
    expect(body).not.toHaveProperty('client_secret');
  });

  it('refuses redirect URIs outside the allowlist', async () => {
    const { response, body } = await registerClient(['https://evil.example/callback']);
    expect(response.status).toBe(400);
    expect(body.error).toBe('invalid_redirect_uri');
  });

  it('answers a client that asks for a secret with a public registration', async () => {
    const response = await register(
      json('/oauth/register', {
        client_name: `Otro ${uid()}`,
        redirect_uris: [REDIRECT],
        token_endpoint_auth_method: 'client_secret_post',
        grant_types: ['authorization_code', 'refresh_token', 'client_credentials'],
      }),
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
    });
    expect(body).not.toHaveProperty('client_secret');
  });

  it('gives the same app registering again the same client', async () => {
    const name = `Claude ${uid()}`;
    const first = await (
      await register(json('/oauth/register', { client_name: name, redirect_uris: [REDIRECT] }))
    ).json();
    const second = await (
      await register(json('/oauth/register', { client_name: name, redirect_uris: [REDIRECT] }))
    ).json();
    expect(second.client_id).toBe(first.client_id);
  });

  it("doesn't count claude.ai's registrations per IP", async () => {
    // claude.ai registers from its own servers: one IP for every claude.ai user.
    const ip = randomIp();
    const statuses = [];
    for (let i = 0; i < 12; i++) {
      const response = await register(
        json(
          '/oauth/register',
          {
            client_name: `Claude ${uid()}`,
            redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
          },
          ip,
        ),
      );
      statuses.push(response.status);
    }
    expect(statuses.every((status) => status === 201)).toBe(true);
  });

  it('refuses bodies over the size cap', async () => {
    const response = await register(
      json('/oauth/register', { client_name: 'x'.repeat(20_000), redirect_uris: [REDIRECT] }),
    );
    expect(response.status).toBe(400);
  });

  it('strips control characters from the client name', async () => {
    const response = await register(
      json('/oauth/register', { client_name: 'Claude‮\u0000 Code', redirect_uris: [REDIRECT] }),
    );
    expect((await response.json()).client_name).toBe('Claude Code');
  });

  it('rate limits registrations per IP', async () => {
    const statuses = [];
    const ip = randomIp();
    for (let i = 0; i < 11; i++)
      statuses.push(
        (
          await register(
            json('/oauth/register', { client_name: `CC ${uid()}`, redirect_uris: [REDIRECT] }, ip),
          )
        ).status,
      );
    expect(statuses.at(-1)).toBe(429);
  });
});

describe('consent', () => {
  it('only lets an admin with 2FA approve', async () => {
    const { body: client } = await registerClient();
    const query = authorizeQuery(client.client_id, newSecret());

    const member = await quickUser();
    await actAs(member.id);
    expect(await approve(member.id, query, '123456')).toEqual({
      ok: false,
      error: 'No autorizado',
    });

    const adminWithout2fa = await quickUser({ role: 'ADMIN' });
    await actAs(adminWithout2fa.id);
    expect(await approve(adminWithout2fa.id, query, '123456')).toEqual({
      ok: false,
      error: 'No autorizado',
    });

    await actAs();
    expect(await approve('nobody', query, '123456')).toEqual({ ok: false, error: 'No autorizado' });
  });

  it('asks for a fresh second-factor code, and spends it', async () => {
    const admin = await mcpAdmin();
    const { body: client } = await registerClient();
    const query = authorizeQuery(client.client_id, newSecret());
    await actAs(admin.id);

    expect(await approve(admin.id, query, '')).toMatchObject({ ok: false });
    expect(await approve(admin.id, query, '000000')).toEqual({
      ok: false,
      error: 'El código no es válido.',
    });
    expect(await approve(admin.id, query, 'not-a-recovery-code')).toMatchObject({ ok: false });

    // A code from the authenticator app works once.
    const totp = totpAt(totpSecrets.get(admin.id)!, timeStep());
    expect((await approve(admin.id, query, totp)).ok).toBe(true);
    expect(await approve(admin.id, query, totp)).toMatchObject({ ok: false });

    // So does each recovery code.
    const recovery = nextCode(admin.id);
    expect((await approve(admin.id, query, recovery)).ok).toBe(true);
    expect(await approve(admin.id, query, recovery)).toMatchObject({ ok: false });
  });

  it('rejects a request with the plain PKCE method or a foreign resource', async () => {
    const admin = await mcpAdmin();
    const { body: client } = await registerClient();
    await actAs(admin.id);
    const verifier = newSecret();
    for (const extra of <Record<string, string>[]>[
      { code_challenge_method: 'plain', code_challenge: verifier.slice(0, 43) },
      { resource: 'https://evil.example/api/mcp' },
      { redirect_uri: 'https://claude.ai/api/mcp/auth_callback' },
    ]) {
      const result = await approve(admin.id, authorizeQuery(client.client_id, verifier, extra));
      expect(result.ok).toBe(false);
    }
  });

  it('sends the code with the state and the issuer, and stores only its hash', async () => {
    const admin = await mcpAdmin();
    const { redirect } = await approvedCode(admin.id);
    const code = redirect.searchParams.get('code')!;
    expect(redirect.searchParams.get('state')).toBe('state-123');
    expect(redirect.searchParams.get('iss')).toBe(ORIGIN);
    expect(await prisma.oAuthAuthorizationCode.findUnique({ where: { id: code } })).toBeNull();
    expect(
      await prisma.oAuthAuthorizationCode.findUnique({ where: { id: hashSecret(code) } }),
    ).not.toBeNull();
  });
});

describe('token endpoint', () => {
  it('trades a code for tokens that open the MCP', async () => {
    const admin = await mcpAdmin();
    const { clientId, verifier, redirect } = await approvedCode(admin.id);
    const response = await exchange(clientId, redirect.searchParams.get('code')!, verifier);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const tokens = await response.json();
    expect(tokens).toMatchObject({ token_type: 'Bearer', expires_in: 3600, scope: 'mcp' });

    const access = await verifyAccessToken(tokens.access_token, RESOURCE);
    expect(access?.userId).toBe(admin.id);
    expect(await verifyAccessToken(tokens.access_token, 'https://evil.example/api/mcp')).toBeNull();
    expect(await verifyAccessToken(tokens.refresh_token, RESOURCE)).toBeNull();
  });

  it('rejects a wrong verifier, client or redirect, and burns the code anyway', async () => {
    const admin = await mcpAdmin();
    const { clientId, verifier, redirect } = await approvedCode(admin.id);
    const code = redirect.searchParams.get('code')!;
    const wrong = await exchange(clientId, code, newSecret());
    expect((await wrong.json()).error).toBe('invalid_grant');
    // Even with the right verifier now, the code is gone.
    expect((await (await exchange(clientId, code, verifier)).json()).error).toBe('invalid_grant');

    const second = await approvedCode(admin.id);
    const otherClient = await exchange(
      'another-client',
      second.redirect.searchParams.get('code')!,
      second.verifier,
    );
    expect((await otherClient.json()).error).toBe('invalid_grant');

    const third = await approvedCode(admin.id);
    const otherRedirect = await exchange(
      third.clientId,
      third.redirect.searchParams.get('code')!,
      third.verifier,
      { redirect_uri: 'http://localhost:9999/callback' },
    );
    expect((await otherRedirect.json()).error).toBe('invalid_grant');
  });

  it('revokes what a code issued when the code is replayed', async () => {
    const admin = await mcpAdmin();
    const { clientId, verifier, redirect } = await approvedCode(admin.id);
    const code = redirect.searchParams.get('code')!;
    const tokens = await (await exchange(clientId, code, verifier)).json();
    const replay = await exchange(clientId, code, verifier);
    expect((await replay.json()).error).toBe('invalid_grant');
    expect(await verifyAccessToken(tokens.access_token, RESOURCE)).toBeNull();
  });

  it('rejects an expired code', async () => {
    const admin = await mcpAdmin();
    const { clientId, verifier, redirect } = await approvedCode(admin.id);
    const code = redirect.searchParams.get('code')!;
    await prisma.oAuthAuthorizationCode.update({
      where: { id: hashSecret(code) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect((await (await exchange(clientId, code, verifier)).json()).error).toBe('invalid_grant');
  });

  it('rotates refresh tokens and revokes the connection when a rotated one comes back', async () => {
    const admin = await mcpAdmin();
    const { clientId, verifier, redirect } = await approvedCode(admin.id);
    const first = await (
      await exchange(clientId, redirect.searchParams.get('code')!, verifier)
    ).json();

    const second = await (await refresh(clientId, first.refresh_token)).json();
    expect(second.access_token).toBeDefined();
    expect(await verifyAccessToken(first.access_token, RESOURCE)).toBeNull();
    expect(await verifyAccessToken(second.access_token, RESOURCE)).not.toBeNull();

    // Someone replays the old refresh token: the whole connection goes.
    expect((await (await refresh(clientId, first.refresh_token)).json()).error).toBe(
      'invalid_grant',
    );
    expect(await verifyAccessToken(second.access_token, RESOURCE)).toBeNull();
    expect((await (await refresh(clientId, second.refresh_token)).json()).error).toBe(
      'invalid_grant',
    );
  });

  it('refuses a refresh token from another client', async () => {
    const admin = await mcpAdmin();
    const { clientId, verifier, redirect } = await approvedCode(admin.id);
    const tokens = await (
      await exchange(clientId, redirect.searchParams.get('code')!, verifier)
    ).json();
    expect((await (await refresh('someone-else', tokens.refresh_token)).json()).error).toBe(
      'invalid_grant',
    );
  });

  it('rejects unknown grant types', async () => {
    const response = await token(
      form('/oauth/token', { grant_type: 'password', client_id: 'x', username: 'a' }),
    );
    expect((await response.json()).error).toBe('unsupported_grant_type');
  });

  it('rejects repeated parameters', async () => {
    const request = new Request(`${ORIGIN}/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=authorization_code&code=a&code=b&client_id=x',
    });
    expect((await (await token(request)).json()).error).toBe('invalid_request');
  });
});

describe('losing access', () => {
  const connect = async () => {
    const admin = await mcpAdmin();
    const { clientId, verifier, redirect } = await approvedCode(admin.id);
    const tokens = await (
      await exchange(clientId, redirect.searchParams.get('code')!, verifier)
    ).json();
    return { admin, clientId, tokens };
  };

  it.each([
    ['demoted', { role: 'REGULAR' as const }],
    ['suspended', { suspendedAt: new Date() }],
    ['deactivated', { deactivatedAt: new Date() }],
    ['without 2FA', { twoFactorEnabledAt: null }],
  ])('stops working when the admin is %s', async (_label, data) => {
    const { admin, clientId, tokens } = await connect();
    await prisma.user.update({ where: { id: admin.id }, data });
    expect(await verifyAccessToken(tokens.access_token, RESOURCE)).toBeNull();
    expect((await (await refresh(clientId, tokens.refresh_token)).json()).error).toBe(
      'invalid_grant',
    );
  });

  it('revokes every connection of a user', async () => {
    const { admin, tokens } = await connect();
    await prisma.$transaction(revokeUserOAuthAccess(admin.id));
    expect(await verifyAccessToken(tokens.access_token, RESOURCE)).toBeNull();
  });

  it('revokes the connection from the revocation endpoint', async () => {
    const { clientId, tokens } = await connect();
    const response = await revoke(
      form('/oauth/revoke', { token: tokens.refresh_token, client_id: clientId }),
    );
    expect(response.status).toBe(200);
    expect(await verifyAccessToken(tokens.access_token, RESOURCE)).toBeNull();
    // Unknown tokens get the same answer.
    expect(
      (await revoke(form('/oauth/revoke', { token: 'nope', client_id: clientId }))).status,
    ).toBe(200);
  });

  it('expires access tokens', async () => {
    const { tokens } = await connect();
    await prisma.oAuthToken.updateMany({
      where: { accessTokenHash: hashSecret(tokens.access_token) },
      data: { accessExpiresAt: new Date(Date.now() - 1000) },
    });
    expect(await verifyAccessToken(tokens.access_token, RESOURCE)).toBeNull();
  });
});

describe('/admin/conexiones-mcp', () => {
  it('lists live connections and lets an admin revoke one or all', async () => {
    const admin = await mcpAdmin();
    const { clientId, verifier, redirect } = await approvedCode(admin.id);
    const tokens = await (
      await exchange(clientId, redirect.searchParams.get('code')!, verifier)
    ).json();

    const listed = (await listMcpConnections()).find((item) => item.user.id === admin.id);
    expect(listed).toMatchObject({ clientName: 'Claude Code', redirectHosts: ['localhost:33418'] });

    const member = await quickUser();
    await actAs(member.id);
    await expect(revokeMcpConnection(listed!.familyId)).rejects.toThrow('No autorizado');
    await expect(revokeAllMcpConnections()).rejects.toThrow('No autorizado');
    expect(await verifyAccessToken(tokens.access_token, RESOURCE)).not.toBeNull();

    await actAs(admin.id);
    await expect(revokeMcpConnection('not-a-uuid')).rejects.toThrow();
    await revokeMcpConnection(listed!.familyId);
    expect(await verifyAccessToken(tokens.access_token, RESOURCE)).toBeNull();
    expect((await listMcpConnections()).some((item) => item.familyId === listed!.familyId)).toBe(
      false,
    );

    const other = await approvedCode(admin.id);
    const otherTokens = await (
      await exchange(other.clientId, other.redirect.searchParams.get('code')!, other.verifier)
    ).json();
    await actAs(admin.id);
    await revokeAllMcpConnections();
    expect(await verifyAccessToken(otherTokens.access_token, RESOURCE)).toBeNull();
  });
});

describe('cleanup and revocation of pending codes', () => {
  it('kills codes approved but not exchanged when access is revoked', async () => {
    const admin = await mcpAdmin();
    const { clientId, verifier, redirect } = await approvedCode(admin.id);
    await prisma.$transaction(revokeUserOAuthAccess(admin.id));
    const response = await exchange(clientId, redirect.searchParams.get('code')!, verifier);
    expect((await response.json()).error).toBe('invalid_grant');
  });

  it('purges dead rows at most once an hour', async () => {
    const admin = await mcpAdmin();
    const client = await prisma.oAuthClient.create({
      data: {
        name: 'Viejo',
        redirectUris: [REDIRECT],
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
    });
    const dead = await prisma.oAuthToken.create({
      data: {
        accessTokenHash: hashSecret(newSecret()),
        refreshTokenHash: hashSecret(newSecret()),
        familyId: crypto.randomUUID(),
        clientId: (await registerClient()).body.client_id,
        userId: admin.id,
        resource: RESOURCE,
        accessExpiresAt: new Date(Date.now() - 2000),
        refreshExpiresAt: new Date(Date.now() - 1000),
      },
    });
    resetOAuthPurge();
    expect(await purgeDeadOAuthRows()).toBe(true);
    expect(await prisma.oAuthToken.findUnique({ where: { id: dead.id } })).toBeNull();
    expect(await prisma.oAuthClient.findUnique({ where: { id: client.id } })).toBeNull();
    expect(await purgeDeadOAuthRows()).toBe(false);
  });
});

describe('concurrency', () => {
  it('revokes everything when the same refresh token is used twice at once', async () => {
    const admin = await mcpAdmin();
    const { clientId, verifier, redirect } = await approvedCode(admin.id);
    const tokens = await (
      await exchange(clientId, redirect.searchParams.get('code')!, verifier)
    ).json();
    const results = await Promise.all([
      refresh(clientId, tokens.refresh_token).then((r) => r.json()),
      refresh(clientId, tokens.refresh_token).then((r) => r.json()),
    ]);
    const winner = results.find((result) => result.access_token);
    expect(results.filter((result) => result.error === 'invalid_grant')).toHaveLength(1);
    // The pair the winner got is revoked too: nobody keeps a working token.
    expect(await verifyAccessToken(winner.access_token, RESOURCE)).toBeNull();
  });

  it('lets only one of two concurrent exchanges of a code through, and revokes it', async () => {
    const admin = await mcpAdmin();
    const { clientId, verifier, redirect } = await approvedCode(admin.id);
    const code = redirect.searchParams.get('code')!;
    const results = await Promise.all([
      exchange(clientId, code, verifier).then((r) => r.json()),
      exchange(clientId, code, verifier).then((r) => r.json()),
    ]);
    const winner = results.find((result) => result.access_token);
    expect(results.filter((result) => result.error === 'invalid_grant')).toHaveLength(1);
    expect(await verifyAccessToken(winner.access_token, RESOURCE)).toBeNull();
  });
});
