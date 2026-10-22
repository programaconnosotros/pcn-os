import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** A fresh 256-bit secret (authorization code, access or refresh token), base64url. */
export const newSecret = () => randomBytes(32).toString('base64url');

/**
 * What the database keeps instead of a secret. Someone who reads the OAuth tables (a backup, a
 * query log) can't use the hashes to call the MCP server.
 */
export const hashSecret = (secret: string) => createHash('sha256').update(secret).digest('hex');

// RFC 7636: the verifier is 43 to 128 unreserved characters; the S256 challenge is the base64url
// SHA-256 of it, always 43 characters.
export const PKCE_VERIFIER = /^[A-Za-z0-9\-._~]{43,128}$/;
export const PKCE_CHALLENGE = /^[A-Za-z0-9_-]{43}$/;

export const pkceChallengeFor = (verifier: string) =>
  createHash('sha256').update(verifier).digest('base64url');

/** `true` when `verifier` is the one the S256 `challenge` was made from. */
export const verifyPkce = (verifier: unknown, challenge: string) => {
  if (typeof verifier !== 'string' || !PKCE_VERIFIER.test(verifier)) return false;
  const expected = Buffer.from(challenge);
  const actual = Buffer.from(pkceChallengeFor(verifier));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};
