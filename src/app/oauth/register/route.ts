import { auditMcp } from '@/lib/oauth/audit';
import { registerClient } from '@/lib/oauth/clients';
import { isMcpEnabled } from '@/lib/oauth/config';
import { limitByIp } from '@/lib/oauth/request-guard';
import { corsPreflight, disabledResponse, oauthError, oauthJson } from '@/lib/oauth/responses';

// Dynamic client registration (RFC 7591) for the MCP server: claude.ai and Claude Code register
// themselves here before sending an admin to the consent screen.
export const dynamic = 'force-dynamic';

const MAX_BODY = 16 * 1024;

export async function POST(request: Request) {
  if (!isMcpEnabled()) return disabledResponse();
  const { ip, wait } = limitByIp(request, 'oauthRegister');
  if (wait > 0)
    return oauthError('slow_down', 'Demasiados registros.', 429, { 'Retry-After': String(wait) });

  if (!(request.headers.get('content-type') ?? '').includes('application/json'))
    return oauthError('invalid_client_metadata', 'El cuerpo tiene que ser JSON.');
  const text = await request.text();
  if (text.length > MAX_BODY)
    return oauthError('invalid_client_metadata', 'Cuerpo demasiado grande.');
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return oauthError('invalid_client_metadata', 'JSON inválido.');
  }

  const result = await registerClient(body, ip);
  if (!result.ok)
    return oauthError(result.error, result.description, result.error === 'slow_down' ? 429 : 400);

  await auditMcp('client registered', {
    ipAddress: ip,
    userAgent: request.headers.get('user-agent'),
    metadata: {
      clientId: result.body.client_id,
      name: result.body.client_name,
      redirectUris: result.body.redirect_uris,
    },
  });
  return oauthJson(result.body, 201);
}

export const OPTIONS = () => (isMcpEnabled() ? corsPreflight() : disabledResponse());
