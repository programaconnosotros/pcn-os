// Where the OAuth server may send an authorization code. Dynamic client registration lets anyone
// register a client, so without this list someone could register "Claude" with their own
// redirect URI, send an admin the consent link and collect a code for their account. Only
// Claude's own callbacks and loopback addresses (apps on the admin's own machine, like Claude
// Code, RFC 8252) are accepted.

/** The callbacks claude.ai and Claude Desktop use for custom connectors. */
const CLAUDE_CALLBACKS = [
  'https://claude.ai/api/mcp/auth_callback',
  'https://claude.com/api/mcp/auth_callback',
];

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const MAX_LENGTH = 500;

/** The fixed allowlist plus any URIs in `MCP_ALLOWED_REDIRECT_URIS` (comma separated). */
export const allowedRedirectUris = () => [
  ...CLAUDE_CALLBACKS,
  ...(process.env.MCP_ALLOWED_REDIRECT_URIS ?? '')
    .split(',')
    .map((uri) => uri.trim())
    .filter(Boolean),
];

const parse = (value: string) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

/**
 * A loopback redirect: plain `http` to localhost, 127.0.0.1 or ::1 on any port, written exactly
 * as the URL parser normalizes it (no userinfo, fragment, backslashes or odd encodings).
 */
const loopbackUrl = (value: string) => {
  const url = parse(value);
  if (!url || url.protocol !== 'http:' || !LOOPBACK_HOSTS.has(url.hostname)) return null;
  if (url.username || url.password || url.hash || url.href !== value) return null;
  return url;
};

/** `true` if a client may register `value` as a redirect URI. */
export const isAllowedRedirectUri = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.length > MAX_LENGTH) return false;
  if (loopbackUrl(value)) return true;
  // Everything else must be one of the allowlisted URIs, character by character.
  return allowedRedirectUris().includes(value);
};

/**
 * `true` if `requested` (the `redirect_uri` of an authorization or token request) matches one the
 * client registered. The match is exact, except that a loopback URI may change its port (RFC
 * 8252 §7.3): native apps listen on whatever port is free.
 */
export const matchesRegisteredRedirect = (registered: string[], requested: unknown) => {
  if (!isAllowedRedirectUri(requested)) return false;
  if (registered.includes(requested)) return true;
  const url = loopbackUrl(requested);
  if (!url) return false;
  return registered.some((uri) => {
    const candidate = loopbackUrl(uri);
    return (
      candidate !== null &&
      candidate.hostname === url.hostname &&
      candidate.pathname === url.pathname &&
      candidate.search === url.search
    );
  });
};
