import { auditMcp } from '@/lib/oauth/audit';
import { registerClient } from '@/lib/oauth/clients';
import { isMcpEnabled } from '@/lib/oauth/config';
import { clientIpFrom } from '@/lib/client-ip';
import { RATE_LIMITS, consumeRateLimit } from '@/lib/rate-limit';
import { limitByIp } from '@/lib/oauth/request-guard';
import { isLoopbackRedirectUri } from '@/lib/oauth/redirect-uris';
import { purgeDeadOAuthRows } from '@/lib/oauth/tokens';
import {
  corsPreflight,
  disabledResponse,
  oauthError,
  oauthJson,
  readBodyText,
} from '@/lib/oauth/responses';

// Dynamic client registration (RFC 7591) for the MCP server: claude.ai and Claude Code register
// themselves here before sending an admin to the consent screen.
export const dynamic = 'force-dynamic';

const MAX_BODY = 16 * 1024;

export async function POST(request: Request) {
  if (!isMcpEnabled()) return disabledResponse();
  const tooMany = (wait: number) =>
    oauthError('slow_down', 'Demasiados registros.', 429, { 'Retry-After': String(wait) });
  const global = consumeRateLimit('oauthRegisterGlobal', RATE_LIMITS.oauthRegisterGlobal);
  if (global > 0) return tooMany(global);

  if (!(request.headers.get('content-type') ?? '').includes('application/json'))
    return oauthError('invalid_client_metadata', 'El cuerpo tiene que ser JSON.');
  const text = await readBodyText(request, MAX_BODY);
  if (text === null) return oauthError('invalid_client_metadata', 'Cuerpo demasiado grande.');
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return oauthError('invalid_client_metadata', 'JSON inválido.');
  }

  // Loopback clients (Claude Code) come from the admin's machine: counted per IP. Claude's own
  // callbacks come from claude.ai's shared servers: only the global limit above.
  const uris = (body as { redirect_uris?: unknown })?.redirect_uris;
  const ip = clientIpFrom(request.headers);
  if (Array.isArray(uris) && uris.some(isLoopbackRedirectUri)) {
    const { wait } = limitByIp(request, 'oauthRegister');
    if (wait > 0) return tooMany(wait);
  }

  await purgeDeadOAuthRows();
  const result = await registerClient(body, ip);
  if (!result.ok)
    return oauthError(result.error, result.description, result.error === 'slow_down' ? 429 : 400);

  if (!result.reused) {
    await auditMcp('client registered', {
      ipAddress: ip,
      userAgent: request.headers.get('user-agent'),
      metadata: {
        clientId: result.body.client_id,
        name: result.body.client_name,
        redirectUris: result.body.redirect_uris,
      },
    });
  }
  return oauthJson(result.body, 201);
}

export const OPTIONS = () => (isMcpEnabled() ? corsPreflight() : disabledResponse());
