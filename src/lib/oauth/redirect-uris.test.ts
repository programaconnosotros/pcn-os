import {
  allowedRedirectUris,
  isAllowedRedirectUri,
  matchesRegisteredRedirect,
} from './redirect-uris';

describe('isAllowedRedirectUri', () => {
  it.each([
    'https://claude.ai/api/mcp/auth_callback',
    'https://claude.com/api/mcp/auth_callback',
    'http://localhost:33418/callback',
    'http://127.0.0.1:6274/oauth/callback',
    'http://[::1]:8080/cb',
    'http://localhost/callback',
  ])('accepts %s', (uri) => {
    expect(isAllowedRedirectUri(uri)).toBe(true);
  });

  it.each([
    // Look-alikes of the allowlist
    'https://claude.ai/api/mcp/auth_callback/',
    'https://claude.ai/api/mcp/auth_callback?x=1',
    'https://claude.ai/api/mcp/auth_callback#frag',
    'https://CLAUDE.ai/api/mcp/auth_callback',
    'https://claude.ai.evil.com/api/mcp/auth_callback',
    'https://evil.com/api/mcp/auth_callback',
    'http://claude.ai/api/mcp/auth_callback',
    'https://user@claude.ai/api/mcp/auth_callback',
    // Loopback tricks
    'http://localhost.evil.com/callback',
    'http://evil.com@localhost:3000/callback',
    'http://localhost:3000@evil.com/callback',
    'http://localhost:3000/callback#x',
    'https://localhost:3000/callback',
    'http://LOCALHOST:3000/callback',
    'http://localhost:3000\\@evil.com',
    'http://0x7f000001:3000/callback',
    'http://127.0.0.2:3000/callback',
    'http://xn--localhst-0za.com/callback',
    // Other schemes
    'javascript:alert(1)',
    'data:text/html,hi',
    'myapp://callback',
    '',
    'not a url',
    `http://localhost:3000/${'a'.repeat(600)}`,
  ])('rejects %s', (uri) => {
    expect(isAllowedRedirectUri(uri)).toBe(false);
  });

  it('rejects non-strings', () => {
    expect(isAllowedRedirectUri(undefined)).toBe(false);
    expect(isAllowedRedirectUri(['https://claude.ai/api/mcp/auth_callback'])).toBe(false);
  });

  it('adds the URIs of MCP_ALLOWED_REDIRECT_URIS', () => {
    process.env.MCP_ALLOWED_REDIRECT_URIS = 'https://example.com/cb, https://other.example/cb';
    try {
      expect(allowedRedirectUris()).toContain('https://other.example/cb');
      expect(isAllowedRedirectUri('https://example.com/cb')).toBe(true);
    } finally {
      delete process.env.MCP_ALLOWED_REDIRECT_URIS;
    }
    expect(isAllowedRedirectUri('https://example.com/cb')).toBe(false);
  });
});

describe('matchesRegisteredRedirect', () => {
  const registered = ['https://claude.ai/api/mcp/auth_callback', 'http://localhost:3000/callback'];

  it('matches a registered URI exactly', () => {
    expect(matchesRegisteredRedirect(registered, 'https://claude.ai/api/mcp/auth_callback')).toBe(
      true,
    );
  });

  it('lets a loopback URI change only its port', () => {
    expect(matchesRegisteredRedirect(registered, 'http://localhost:51234/callback')).toBe(true);
    expect(matchesRegisteredRedirect(registered, 'http://localhost:51234/other')).toBe(false);
    expect(matchesRegisteredRedirect(registered, 'http://127.0.0.1:3000/callback')).toBe(false);
    expect(matchesRegisteredRedirect(registered, 'http://localhost:3000/callback?x=1')).toBe(false);
  });

  it('rejects URIs the client did not register, even allowlisted ones', () => {
    expect(matchesRegisteredRedirect(registered, 'https://claude.com/api/mcp/auth_callback')).toBe(
      false,
    );
    expect(matchesRegisteredRedirect([], 'http://localhost:3000/callback')).toBe(false);
  });
});
