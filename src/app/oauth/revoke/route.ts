import { isMcpEnabled } from '@/lib/oauth/config';
import { limitByIp } from '@/lib/oauth/request-guard';
import {
  corsPreflight,
  disabledResponse,
  oauthError,
  oauthJson,
  readParams,
} from '@/lib/oauth/responses';
import { revokeToken } from '@/lib/oauth/tokens';

// RFC 7009: a client disconnecting revokes its whole connection.
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isMcpEnabled()) return disabledResponse();
  const { wait } = limitByIp(request, 'oauthToken');
  if (wait > 0)
    return oauthError('slow_down', 'Demasiados pedidos.', 429, { 'Retry-After': String(wait) });

  const params = await readParams(request);
  if (!params) return oauthError('invalid_request', 'Solicitud inválida.');
  await revokeToken(params.token, params.client_id);
  // Same answer whether the token existed or not (RFC 7009 §2.2).
  return oauthJson({});
}

export const OPTIONS = () => (isMcpEnabled() ? corsPreflight() : disabledResponse());
