import { randomUUID } from 'node:crypto';
import prisma from '@/lib/prisma';
import { alertAdmins } from '@/lib/security-alerts';
import { MCP_SCOPE, OAUTH_TTL } from './config';
import { hashSecret, newSecret, verifyPkce } from './crypto';
import { auditMcp } from './audit';
import { MCP_USER_SELECT, canUseMcp } from './eligibility';
import { matchesRegisteredRedirect } from './redirect-uris';

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
export const revokeFamily = (familyId: string) =>
  prisma.oAuthToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

/**
 * Revokes every MCP connection of a user. Called when they stop being allowed to use it (demoted,
 * suspended, deactivated) or their credentials change (password, 2FA), so a token issued before
 * doesn't outlive the reason it was granted.
 */
export const revokeUserOAuthTokens = (userId: string) =>
  prisma.oAuthToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

const issueTokens = async (input: {
  userId: string;
  clientId: string;
  resource: string;
  familyId: string;
}): Promise<TokenResponse> => {
  const accessToken = newSecret();
  const refreshToken = newSecret();
  const now = Date.now();
  await prisma.oAuthToken.create({
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

type CodeExchange = {
  code: unknown;
  codeVerifier: unknown;
  clientId: unknown;
  redirectUri: unknown;
  resource?: unknown;
};

/**
 * `grant_type=authorization_code`: trades a code for the first token pair. The code is burned
 * before anything else is checked, so two concurrent requests can't both use it; a code used
 * twice revokes what it issued the first time (RFC 6749 §4.1.2: someone intercepted it).
 */
export const exchangeAuthorizationCode = async (input: CodeExchange): Promise<GrantResult> => {
  if (typeof input.code !== 'string' || input.code.length > 200) return failure('Código inválido');
  const id = hashSecret(input.code);
  const code = await prisma.oAuthAuthorizationCode.findUnique({
    where: { id },
    include: { client: { select: { redirectUris: true } } },
  });
  if (!code) return failure('Código inválido');

  const burned = await prisma.oAuthAuthorizationCode.updateMany({
    where: { id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (burned.count === 0) {
    if (code.familyId) await revokeFamily(code.familyId);
    await auditMcp('authorization code replayed; its tokens were revoked', {
      userId: code.userId,
      metadata: { clientId: code.clientId },
    });
    return failure('El código ya se usó');
  }

  if (code.expiresAt <= new Date()) return failure('El código venció');
  if (input.clientId !== code.clientId) return failure('El código es de otro cliente');
  // The redirect_uri must be the very one the code was sent to (RFC 6749 §4.1.3).
  if (input.redirectUri !== code.redirectUri) return failure('redirect_uri distinto');
  if (!matchesRegisteredRedirect(code.client.redirectUris, input.redirectUri))
    return failure('redirect_uri no registrado');
  if (!verifyPkce(input.codeVerifier, code.codeChallenge)) return failure('PKCE inválido');
  if (input.resource !== undefined && input.resource !== code.resource)
    return failure('El recurso no coincide', 'invalid_target');

  const user = await prisma.user.findUnique({
    where: { id: code.userId },
    select: MCP_USER_SELECT,
  });
  if (!canUseMcp(user)) return failure('La cuenta ya no puede usar el MCP');

  const familyId = randomUUID();
  await prisma.oAuthAuthorizationCode.update({ where: { id }, data: { familyId } });
  const tokens = await issueTokens({
    userId: code.userId,
    clientId: code.clientId,
    resource: code.resource,
    familyId,
  });
  await auditMcp('tokens issued', {
    userId: code.userId,
    metadata: { clientId: code.clientId, familyId },
  });
  return { ok: true, tokens, userId: code.userId };
};

type Refresh = { refreshToken: unknown; clientId: unknown; resource?: unknown };

/**
 * `grant_type=refresh_token`: rotates the pair. The old pair is revoked as it's used; if a
 * rotated refresh token shows up again, two parties have it (the client and whoever copied it),
 * so the whole connection is revoked and the admins are told.
 */
export const refreshTokens = async (input: Refresh): Promise<GrantResult> => {
  if (typeof input.refreshToken !== 'string' || input.refreshToken.length > 200)
    return failure('Refresh token inválido');
  const current = await prisma.oAuthToken.findUnique({
    where: { refreshTokenHash: hashSecret(input.refreshToken) },
  });
  if (!current || current.clientId !== input.clientId) return failure('Refresh token inválido');

  const reuse = async () => {
    await revokeFamily(current.familyId);
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
  };

  if (current.rotatedAt) return reuse();
  if (current.revokedAt) return failure('La conexión fue revocada');
  if (current.refreshExpiresAt <= new Date()) return failure('El refresh token venció');
  if (input.resource !== undefined && input.resource !== current.resource)
    return failure('El recurso no coincide', 'invalid_target');

  const now = new Date();
  const rotated = await prisma.oAuthToken.updateMany({
    where: { id: current.id, rotatedAt: null, revokedAt: null },
    data: { rotatedAt: now, revokedAt: now },
  });
  if (rotated.count === 0) return reuse();

  const user = await prisma.user.findUnique({
    where: { id: current.userId },
    select: MCP_USER_SELECT,
  });
  if (!canUseMcp(user)) {
    await revokeFamily(current.familyId);
    return failure('La cuenta ya no puede usar el MCP');
  }

  const tokens = await issueTokens({
    userId: current.userId,
    clientId: current.clientId,
    resource: current.resource,
    familyId: current.familyId,
  });
  return { ok: true, tokens, userId: current.userId };
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
