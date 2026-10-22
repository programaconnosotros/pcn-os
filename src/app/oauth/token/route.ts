import { isMcpEnabled } from '@/lib/oauth/config';
import { limitByIp } from '@/lib/oauth/request-guard';
import {
  corsPreflight,
  disabledResponse,
  oauthError,
  oauthJson,
  readParams,
} from '@/lib/oauth/responses';
import { exchangeAuthorizationCode, purgeDeadOAuthRows, refreshTokens } from '@/lib/oauth/tokens';

// Token endpoint of the MCP's OAuth server: authorization code + PKCE, and refresh rotation.
export const dynamic = 'force-dynamic';

/**
 * Public clients send their client_id in the body. Some send it as HTTP Basic with an empty
 * secret instead; both are accepted, but never two different ids.
 */
const clientIdOf = (request: Request, params: Record<string, string>) => {
  const header = request.headers.get('authorization');
  if (!header?.toLowerCase().startsWith('basic ')) return params.client_id;
  try {
    const decoded = Buffer.from(header.slice(6).trim(), 'base64').toString('utf8');
    const basicId = decodeURIComponent(decoded.split(':')[0] ?? '');
    if (params.client_id && params.client_id !== basicId) return undefined;
    return basicId || params.client_id;
  } catch {
    return undefined;
  }
};

export async function POST(request: Request) {
  if (!isMcpEnabled()) return disabledResponse();
  const { wait } = limitByIp(request, 'oauthToken');
  if (wait > 0)
    return oauthError('slow_down', 'Demasiados pedidos.', 429, { 'Retry-After': String(wait) });

  const params = await readParams(request);
  if (!params) return oauthError('invalid_request', 'Solicitud inválida.');
  await purgeDeadOAuthRows();
  const clientId = clientIdOf(request, params);
  // 400, not 401: a 401 would need a Basic challenge, and browsers answer that with a login box.
  if (!clientId) return oauthError('invalid_client', 'Falta el client_id.');

  const result =
    params.grant_type === 'authorization_code'
      ? await exchangeAuthorizationCode({
          code: params.code,
          codeVerifier: params.code_verifier,
          clientId,
          redirectUri: params.redirect_uri,
          resource: params.resource,
        })
      : params.grant_type === 'refresh_token'
        ? await refreshTokens({
            refreshToken: params.refresh_token,
            clientId,
            resource: params.resource,
          })
        : null;

  if (!result) return oauthError('unsupported_grant_type', 'Grant no soportado.');
  if (!result.ok) return oauthError(result.error, result.description);
  return oauthJson(result.tokens);
}

export const OPTIONS = () => (isMcpEnabled() ? corsPreflight() : disabledResponse());
