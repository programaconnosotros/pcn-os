// Settings shared by the OAuth server and the MCP endpoint (docs/mcp.md).

/** Where the MCP server listens. The OAuth tokens are only valid for this resource. */
export const MCP_PATH = '/api/mcp';

/** The single scope this server grants: everything the MCP tools can do, as an admin. */
export const MCP_SCOPE = 'mcp';

export const OAUTH_TTL = {
  /** An authorization code is exchanged right away by the client: a few minutes is plenty. */
  codeSeconds: 5 * 60,
  /** Short-lived, so a leaked access token is useful for an hour at most. */
  accessSeconds: 60 * 60,
  /** Rotated on every use; an unused connection expires after a month. */
  refreshSeconds: 30 * 24 * 60 * 60,
} as const;

/** Kill switch: `MCP_ENABLED=false` makes the MCP endpoint and the whole OAuth server 404. */
export const isMcpEnabled = () => process.env.MCP_ENABLED !== 'false';

const PRODUCTION_ORIGIN = 'https://programaconnosotros.com';

// Hosts the local dev server answers on: `localhost:3000`, portless's `pcn-website.localhost` and
// its worktree subdomains.
const DEV_HOST = /^(?:localhost|127\.0\.0\.1|(?:[a-z0-9-]+\.)+localhost)(?::\d{1,5})?$/i;

type HeaderReader = Pick<Headers, 'get'>;

const firstValue = (value: string | null) => value?.split(',')[0]?.trim() || null;

/**
 * The site's public origin, used as the OAuth issuer and to build the MCP resource URL. In
 * production it's fixed (`MCP_PUBLIC_ORIGIN`, `NEXT_PUBLIC_SITE_URL` or the real domain) and never
 * read from the request: a forged `Host` or `X-Forwarded-Host` can't change the issuer or the
 * audience tokens are checked against. In development it follows the request, so every worktree
 * URL works, but only for local hosts.
 */
export const publicOrigin = (headers: HeaderReader): string => {
  const configured = process.env.MCP_PUBLIC_ORIGIN;
  if (process.env.NODE_ENV === 'production') {
    return new URL(configured || process.env.NEXT_PUBLIC_SITE_URL || PRODUCTION_ORIGIN).origin;
  }
  if (configured) return new URL(configured).origin;

  const host = firstValue(headers.get('x-forwarded-host')) || headers.get('host');
  if (!host || !DEV_HOST.test(host)) return 'http://localhost:3000';
  const forwardedProto = firstValue(headers.get('x-forwarded-proto'));
  const proto =
    forwardedProto === 'https' || forwardedProto === 'http'
      ? forwardedProto
      : host.split(':')[0].endsWith('.localhost')
        ? 'https'
        : 'http';
  return `${proto}://${host.toLowerCase()}`;
};

/** The RFC 8707 resource identifier of the MCP server: the canonical URL of its endpoint. */
export const mcpResourceUrl = (origin: string) => `${origin}${MCP_PATH}`;
