import { randomUUID } from 'node:crypto';
import prisma from '@/lib/prisma';
import { alertAdmins } from '@/lib/security-alerts';
import { MCP_SCOPE, OAUTH_TTL } from './config';
import { hashSecret, newSecret, verifyPkce } from './crypto';
import { auditMcp } from './audit';
import { MCP_USER_SELECT, canUseMcp } from './eligibility';
import { matchesRegisteredRedirect } from './redirect-uris';

// The client or a transaction of it (what `$transaction(async (tx) => …)` hands over).
type Db = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>;

export type TokenResponse = {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
  scope: string;
};

type GrantError = 'invalid_grant' | 'invalid_target';

export type GrantResult =
  | { ok: true; tokens: TokenResponse; userId: string }
  | { ok: false; error: GrantError; description: string };

const failure = (description: string, error: GrantError = 'invalid_grant') =>
  ({ ok: false, error, description }) as const;

/** Revokes every token of a connection (all the rotations of one authorization). */
export const revokeFamily = (familyId: string, db: Db = prisma) =>
  db.oAuthToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

/**
 * Everything that gives a user access to the MCP: their tokens and the codes they approved but
 * nobody exchanged yet. Called when they stop being allowed to use it (demoted, suspended,
 * deactivated) or their credentials change (password, 2FA), so nothing issued before outlives the
 * reason it was granted. Returns the queries so callers can put them in their own transaction.
 */
export const revokeUserOAuthAccess = (userId: string) => {
  const now = new Date();
  return [
    prisma.oAuthToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } }),
    prisma.oAuthAuthorizationCode.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: now },
    }),
  ];
};

/** Every connection and pending code, for everyone: the button for a suspected leak. */
export const revokeAllOAuthAccess = () => {
  const now = new Date();
  return prisma.$transaction([
    prisma.oAuthToken.updateMany({ where: { revokedAt: null }, data: { revokedAt: now } }),
    prisma.oAuthAuthorizationCode.updateMany({ where: { usedAt: null }, data: { usedAt: now } }),
  ]);
};

const issueTokens = async (
  db: Db,
  input: { userId: string; clientId: string; resource: string; familyId: string },
): Promise<TokenResponse> => {
  const accessToken = newSecret();
  const refreshToken = newSecret();
  const now = Date.now();
  await db.oAuthToken.create({
    data: {
      ...input,
      accessTokenHash: hashSecret(accessToken),
      refreshTokenHash: hashSecret(refreshToken),
      accessExpiresAt: new Date(now + OAUTH_TTL.accessSeconds * 1000),
      refreshExpiresAt: new Date(now + OAUTH_TTL.refreshSeconds * 1000),
    },
  });
  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: OAUTH_TTL.accessSeconds,
    refresh_token: refreshToken,
    scope: MCP_SCOPE,
  };
};

const eligibleUser = async (db: Db, userId: string) =>
  canUseMcp(await db.user.findUnique({ where: { id: userId }, select: MCP_USER_SELECT }));

type CodeExchange = {
  code: unknown;
  codeVerifier: unknown;
  clientId: unknown;
  redirectUri: unknown;
  resource?: unknown;
};

type ExchangeOutcome =
  | { kind: 'issued'; tokens: TokenResponse; userId: string; clientId: string; familyId: string }
  | { kind: 'replayed'; userId: string; clientId: string }
  | { kind: 'rejected'; result: GrantResult };

/**
 * `grant_type=authorization_code`: trades a code for the first token pair. The code's row is
 * locked for the whole exchange, so a concurrent request with the same code waits, then finds it
 * used and revokes what the first one issued (RFC 6749 §4.1.2: someone intercepted it). A code is
 * burned before anything else is checked, so a failed attempt can't be retried.
 */
export const exchangeAuthorizationCode = async (input: CodeExchange): Promise<GrantResult> => {
  if (typeof input.code !== 'string' || input.code.length > 200) return failure('Código inválido');
  const id = hashSecret(input.code);

  const outcome = await prisma.$transaction(async (tx): Promise<ExchangeOutcome | null> => {
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "OAuthAuthorizationCode" WHERE "id" = ${id} FOR UPDATE`;
    if (locked.length === 0) return null;
    const code = await tx.oAuthAuthorizationCode.findUniqueOrThrow({
      where: { id },
      include: { client: { select: { redirectUris: true } } },
    });
    const reject = (description: string, error: GrantError = 'invalid_grant') =>
      ({ kind: 'rejected', result: failure(description, error) }) as const;

    if (code.usedAt) {
      if (code.familyId) await revokeFamily(code.familyId, tx);
      return { kind: 'replayed', userId: code.userId, clientId: code.clientId };
    }
    await tx.oAuthAuthorizationCode.update({ where: { id }, data: { usedAt: new Date() } });

    if (code.expiresAt <= new Date()) return reject('El código venció');
    if (input.clientId !== code.clientId) return reject('El código es de otro cliente');
    // The redirect_uri must be the very one the code was sent to (RFC 6749 §4.1.3).
    if (input.redirectUri !== code.redirectUri) return reject('redirect_uri distinto');
    if (!matchesRegisteredRedirect(code.client.redirectUris, input.redirectUri))
      return reject('redirect_uri no registrado');
    if (!verifyPkce(input.codeVerifier, code.codeChallenge)) return reject('PKCE inválido');
    if (input.resource !== undefined && input.resource !== code.resource)
      return reject('El recurso no coincide', 'invalid_target');
    if (!(await eligibleUser(tx, code.userId))) return reject('La cuenta ya no puede usar el MCP');

    const familyId = randomUUID();
    await tx.oAuthAuthorizationCode.update({ where: { id }, data: { familyId } });
    const tokens = await issueTokens(tx, {
      userId: code.userId,
      clientId: code.clientId,
      resource: code.resource,
      familyId,
    });
    return { kind: 'issued', tokens, userId: code.userId, clientId: code.clientId, familyId };
  });

  if (!outcome) return failure('Código inválido');
  if (outcome.kind === 'rejected') return outcome.result;
  if (outcome.kind === 'replayed') {
    await auditMcp('authorization code replayed; its tokens were revoked', {
      userId: outcome.userId,
      metadata: { clientId: outcome.clientId },
    });
    return failure('El código ya se usó');
  }
  await auditMcp('tokens issued', {
    userId: outcome.userId,
    metadata: { clientId: outcome.clientId, familyId: outcome.familyId },
  });
  return { ok: true, tokens: outcome.tokens, userId: outcome.userId };
};

type Refresh = { refreshToken: unknown; clientId: unknown; resource?: unknown };

type RefreshOutcome =
  | { kind: 'issued'; tokens: TokenResponse }
  | { kind: 'reused' }
  | { kind: 'rejected'; result: GrantResult };

/**
 * `grant_type=refresh_token`: rotates the pair. The row is locked while it rotates, so two
 * requests with the same refresh token are serialized: the second one finds it already rotated,
 * which means two parties hold it (the client and whoever copied it), and revokes the whole
 * connection, the pair the first request just got included. The admins are told.
 */
export const refreshTokens = async (input: Refresh): Promise<GrantResult> => {
  if (typeof input.refreshToken !== 'string' || input.refreshToken.length > 200)
    return failure('Refresh token inválido');
  const current = await prisma.oAuthToken.findUnique({
    where: { refreshTokenHash: hashSecret(input.refreshToken) },
    select: { id: true, clientId: true, userId: true, familyId: true },
  });
  if (!current || current.clientId !== input.clientId) return failure('Refresh token inválido');

  const outcome = await prisma.$transaction(async (tx): Promise<RefreshOutcome> => {
    await tx.$queryRaw`SELECT "id" FROM "OAuthToken" WHERE "id" = ${current.id} FOR UPDATE`;
    const row = await tx.oAuthToken.findUniqueOrThrow({ where: { id: current.id } });
    const reject = (description: string, error: GrantError = 'invalid_grant') =>
      ({ kind: 'rejected', result: failure(description, error) }) as const;

    if (row.rotatedAt) {
      await revokeFamily(row.familyId, tx);
      return { kind: 'reused' };
    }
    if (row.revokedAt) return reject('La conexión fue revocada');
    if (row.refreshExpiresAt <= new Date()) return reject('El refresh token venció');
    if (input.resource !== undefined && input.resource !== row.resource)
      return reject('El recurso no coincide', 'invalid_target');
    if (!(await eligibleUser(tx, row.userId))) {
      await revokeFamily(row.familyId, tx);
      return reject('La cuenta ya no puede usar el MCP');
    }

    const now = new Date();
    await tx.oAuthToken.update({ where: { id: row.id }, data: { rotatedAt: now, revokedAt: now } });
    const tokens = await issueTokens(tx, {
      userId: row.userId,
      clientId: row.clientId,
      resource: row.resource,
      familyId: row.familyId,
    });
    return { kind: 'issued', tokens };
  });

  if (outcome.kind === 'rejected') return outcome.result;
  if (outcome.kind === 'reused') {
    await auditMcp('rotated refresh token reused; connection revoked', {
      userId: current.userId,
      metadata: { clientId: current.clientId, familyId: current.familyId },
    });
    await alertAdmins(`mcp-refresh-reuse:${current.familyId}`, {
      type: 'security_mcp',
      title: 'Token del MCP reutilizado',
      message:
        'Alguien usó un refresh token del MCP que ya se había rotado. La conexión se revocó por las dudas: si fuiste vos, volvé a conectar Claude.',
      metadata: { familyId: current.familyId, userId: current.userId },
    });
    return failure('Refresh token inválido');
  }
  return { ok: true, tokens: outcome.tokens, userId: current.userId };
};

/**
 * RFC 7009: revokes the connection an access or refresh token belongs to. Unknown tokens are not
 * an error (the response is the same either way, so it can't be used to probe tokens).
 */
export const revokeToken = async (token: unknown, clientId?: unknown) => {
  if (typeof token !== 'string' || token.length > 200) return;
  const hash = hashSecret(token);
  const row = await prisma.oAuthToken.findFirst({
    where: { OR: [{ accessTokenHash: hash }, { refreshTokenHash: hash }] },
    select: { familyId: true, clientId: true, userId: true },
  });
  if (!row || (clientId !== undefined && clientId !== row.clientId)) return;
  await revokeFamily(row.familyId);
  await auditMcp('connection revoked by its client', {
    userId: row.userId,
    metadata: { clientId: row.clientId, familyId: row.familyId },
  });
};

export type VerifiedAccess = {
  tokenId: string;
  familyId: string;
  clientId: string;
  userId: string;
  expiresAt: Date;
};

const LAST_USED_RESOLUTION_MS = 60 * 1000;

/**
 * Checks a bearer token on an MCP request: it exists, isn't revoked or expired, was issued for
 * this resource, and its user can still use the MCP right now. Returns null otherwise.
 */
export const verifyAccessToken = async (
  token: unknown,
  resource: string,
): Promise<VerifiedAccess | null> => {
  if (typeof token !== 'string' || token.length < 20 || token.length > 200) return null;
  const row = await prisma.oAuthToken.findUnique({
    where: { accessTokenHash: hashSecret(token) },
    include: { user: { select: MCP_USER_SELECT } },
  });
  const now = new Date();
  if (!row || row.revokedAt || row.accessExpiresAt <= now || row.resource !== resource) return null;
  if (!canUseMcp(row.user)) return null;

  if (!row.lastUsedAt || now.getTime() - row.lastUsedAt.getTime() > LAST_USED_RESOLUTION_MS) {
    await prisma.oAuthToken.update({ where: { id: row.id }, data: { lastUsedAt: now } });
  }
  return {
    tokenId: row.id,
    familyId: row.familyId,
    clientId: row.clientId,
    userId: row.userId,
    expiresAt: row.accessExpiresAt,
  };
};

const PURGE_INTERVAL_MS = 60 * 60 * 1000;
const KEEP_DEAD_ROWS_MS = 30 * 24 * 60 * 60 * 1000;
let lastPurge = 0;

/**
 * Deletes what can never be used again: tokens whose refresh expired or that were revoked a month
 * ago, codes that expired a day ago and registrations nobody approved within an hour. Runs at
 * most once an hour, from the OAuth endpoints (the site has no job scheduler).
 */
export const purgeDeadOAuthRows = async (now = Date.now()) => {
  if (now - lastPurge < PURGE_INTERVAL_MS) return false;
  lastPurge = now;
  const monthAgo = new Date(now - KEEP_DEAD_ROWS_MS);
  try {
    await prisma.$transaction([
      prisma.oAuthToken.deleteMany({
        where: {
          OR: [{ refreshExpiresAt: { lt: new Date(now) } }, { revokedAt: { lt: monthAgo } }],
        },
      }),
      prisma.oAuthAuthorizationCode.deleteMany({
        where: { expiresAt: { lt: new Date(now - 24 * 60 * 60 * 1000) } },
      }),
      prisma.oAuthClient.deleteMany({
        where: {
          createdAt: { lt: new Date(now - 60 * 60 * 1000) },
          tokens: { none: {} },
          codes: { none: {} },
        },
      }),
    ]);
  } catch (error) {
    console.error('Failed to purge OAuth rows:', error instanceof Error ? error.message : error);
  }
  return true;
};

export const resetOAuthPurge = () => {
  lastPurge = 0;
};
