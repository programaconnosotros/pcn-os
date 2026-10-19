'use server';

import { headers } from 'next/headers';
import * as z from 'zod';
import { getCurrentSession } from '@/actions/auth/get-current-session';
import { clientIpFrom } from '@/lib/client-ip';
import { displayName } from '@/lib/people-names';
import { RATE_LIMITS, consumeRateLimit } from '@/lib/rate-limit';
import { alertAdmins } from '@/lib/security-alerts';
import { auditMcp } from '@/lib/oauth/audit';
import { issueAuthorizationCode, resolveAuthorizeRequest } from '@/lib/oauth/authorize';
import { isMcpEnabled, publicOrigin } from '@/lib/oauth/config';
import { canUseMcp } from '@/lib/oauth/eligibility';

type ApproveResult = { ok: true; redirectTo: string } | { ok: false; error: string };

// The query of /oauth/autorizar, sent back as it was. It's validated again from scratch: nothing
// the browser sends is trusted just because the page rendered it.
const querySchema = z.record(z.string().max(64), z.string().max(1000));

/**
 * "Permitir" on the consent screen: an admin with 2FA lets an MCP client act as them. Issues a
 * single-use code and returns the client's redirect URL carrying it.
 */
export async function approveAuthorization(query: unknown): Promise<ApproveResult> {
  if (!isMcpEnabled()) return { ok: false, error: 'El servidor MCP está apagado.' };
  const session = await getCurrentSession();
  if (!session || !canUseMcp(session.user)) return { ok: false, error: 'No autorizado' };

  const headerStore = await headers();
  const ip = clientIpFrom(headerStore);
  if (consumeRateLimit(`oauthAuthorize:user:${session.user.id}`, RATE_LIMITS.oauthAuthorize) > 0)
    return { ok: false, error: 'Demasiados intentos seguidos. Probá de nuevo en unos minutos.' };

  const parsed = querySchema.safeParse(query);
  if (!parsed.success) return { ok: false, error: 'La solicitud no es válida.' };
  const origin = publicOrigin(headerStore);
  const resolved = await resolveAuthorizeRequest(parsed.data, origin);
  if (resolved.kind !== 'ok') return { ok: false, error: 'La solicitud ya no es válida.' };

  const { request } = resolved;
  const redirectTo = await issueAuthorizationCode(request, session.user.id, origin);
  await auditMcp('connection authorized', {
    userId: session.user.id,
    ipAddress: ip,
    userAgent: headerStore.get('user-agent'),
    metadata: {
      clientId: request.client.id,
      clientName: request.client.name,
      redirectHost: request.redirectHost,
    },
  });
  await alertAdmins(`mcp-authorized:${request.client.id}:${session.user.id}`, {
    type: 'security_mcp',
    title: 'Nueva conexión al servidor MCP',
    message: `${displayName(session.user.name)} conectó "${request.client.name}" (${request.redirectHost}) al servidor MCP. Si no fue a propósito, revocala en /admin/conexiones-mcp.`,
    metadata: { clientId: request.client.id, userId: session.user.id },
  });
  return { ok: true, redirectTo };
}
