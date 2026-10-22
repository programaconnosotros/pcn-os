// Responses of the OAuth endpoints. Tokens and codes must never sit in a cache (CloudFront, the
// browser), so every response says `no-store` (RFC 6749 §5.1).

export const NO_STORE_HEADERS = { 'Cache-Control': 'no-store', Pragma: 'no-cache' };

/**
 * OAuth endpoints are called with no cookies or other ambient credentials (a public client proves
 * itself with PKCE), so letting browser-based MCP clients call them cross-origin is safe.
 */
export const OAUTH_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, MCP-Protocol-Version',
  'Access-Control-Max-Age': '86400',
};

export const oauthJson = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, {
    status,
    headers: { ...NO_STORE_HEADERS, ...OAUTH_CORS_HEADERS, ...headers },
  });

export type OAuthErrorCode =
  | 'invalid_request'
  | 'invalid_client'
  | 'invalid_grant'
  | 'unauthorized_client'
  | 'unsupported_grant_type'
  | 'invalid_scope'
  | 'invalid_target'
  | 'invalid_redirect_uri'
  | 'invalid_client_metadata'
  | 'access_denied'
  | 'slow_down'
  | 'temporarily_unavailable';

export const oauthError = (
  error: OAuthErrorCode,
  description: string,
  status = 400,
  headers: Record<string, string> = {},
) => oauthJson({ error, error_description: description }, status, headers);

export const corsPreflight = () =>
  new Response(null, { status: 204, headers: { ...NO_STORE_HEADERS, ...OAUTH_CORS_HEADERS } });

/** What every OAuth and MCP route answers while the kill switch is on. */
export const disabledResponse = () =>
  new Response('Not found', { status: 404, headers: NO_STORE_HEADERS });

/**
 * The request body as text, or null past `maxBytes`: refused up front by Content-Length, and
 * counted while reading so a body without one (chunked) can't be bigger either.
 */
export const readBodyText = async (request: Request, maxBytes = 16 * 1024) => {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > maxBytes) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
};

/** Reads a form-encoded (or JSON) request body into plain strings, with a size cap. */
export const readParams = async (request: Request, maxBytes = 16 * 1024) => {
  const text = await readBodyText(request, maxBytes);
  if (text === null) return null;
  const type = request.headers.get('content-type') ?? '';
  if (type.includes('application/json')) {
    try {
      const body: unknown = JSON.parse(text);
      if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
      return Object.fromEntries(
        Object.entries(body).filter(
          (entry): entry is [string, string] => typeof entry[1] === 'string',
        ),
      );
    } catch {
      return null;
    }
  }
  const params = new URLSearchParams(text);
  // A repeated parameter is ambiguous; RFC 6749 §3.1 says to reject the request.
  const keys = [...params.keys()];
  if (new Set(keys).size !== keys.length) return null;
  return Object.fromEntries(params);
};
