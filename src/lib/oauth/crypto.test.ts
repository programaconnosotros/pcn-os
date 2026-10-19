import { hashSecret, newSecret, pkceChallengeFor, verifyPkce } from './crypto';

describe('OAuth secrets', () => {
  it('makes 256-bit base64url secrets, different every time', () => {
    const a = newSecret();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newSecret()).not.toBe(a);
  });

  it('stores a SHA-256 hash, never the secret', () => {
    const secret = newSecret();
    expect(hashSecret(secret)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSecret(secret)).not.toContain(secret);
  });
});

describe('verifyPkce', () => {
  // RFC 7636, appendix B.
  const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
  const challenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

  it('accepts the verifier of the challenge', () => {
    expect(pkceChallengeFor(verifier)).toBe(challenge);
    expect(verifyPkce(verifier, challenge)).toBe(true);
  });

  it.each([
    ['another verifier', `${verifier.slice(0, -1)}A`],
    ['the challenge itself (plain method)', challenge],
    ['a short verifier', 'abc'],
    ['a verifier with invalid characters', `${verifier}!`],
    ['nothing', undefined],
  ])('rejects %s', (_label, candidate) => {
    expect(verifyPkce(candidate, challenge)).toBe(false);
  });
});
