'use server';

import { headers } from 'next/headers';
import * as z from 'zod';
import { getCurrentSession } from '@/actions/auth/get-current-session';
import { clientIpFrom } from '@/lib/client-ip';
import { displayName } from '@/lib/people-names';
import prisma from '@/lib/prisma';
import { RATE_LIMITS, consumeRateLimit } from '@/lib/rate-limit';
import { alertAdmins } from '@/lib/security-alerts';
import { checkSecondFactor, claimSecondFactor, secondFactorSelect } from '@/lib/two-factor';
import { auditMcp } from '@/lib/oauth/audit';
import { issueAuthorizationCode, resolveAuthorizeRequest } from '@/lib/oauth/authorize';
import { isMcpEnabled, publicOrigin } from '@/lib/oauth/config';
import { canUseMcp } from '@/lib/oauth/eligibility';

type ApproveResult = { ok: true; redirectTo: string } | { ok: false; error: string };

const inputSchema = z.object({
  // The query of /oauth/autorizar, sent back as it was. It's validated again from scratch:
  // nothing the browser sends is trusted just because the page rendered it.
  query: z.record(z.string().max(64), z.string().max(1000)),
  // A fresh code from the authenticator app (or a recovery code).
  code: z.string().trim().min(1).max(20),
});

/**
 * "Permitir" on the consent screen: an admin with 2FA lets an MCP client act as them. The
 * session alone isn't enough (a stolen cookie or a script on the page could approve a connection
 * that outlives it), so it also takes a fresh second-factor code, spent like at sign-in. Issues a
 * single-use code and returns the client's redirect URL carrying it.
 */
export async function approveAuthorization(input: unknown): Promise<ApproveResult> {
  if (!isMcpEnabled()) return { ok: false, error: 'El servidor MCP está apagado.' };
  const session = await getCurrentSession();
  if (!session || !canUseMcp(session.user)) return { ok: false, error: 'No autorizado' };

  const userId = session.user.id;
  if (consumeRateLimit(`oauthAuthorize:user:${userId}`, RATE_LIMITS.oauthAuthorize) > 0)
    return { ok: false, error: 'Demasiados intentos seguidos. Probá de nuevo en unos minutos.' };

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Ingresá el código de tu app de autenticación.' };

  // Same budget as the sign-in's second step: guessing a 6-digit code takes many tries.
  if (consumeRateLimit(`verifyCode:user:${userId}`, RATE_LIMITS.verifyCode) > 0)
    return { ok: false, error: 'Probaste demasiados códigos. Esperá unos minutos.' };
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: secondFactorSelect,
  });
  const check = checkSecondFactor(user, parsed.data.code);
  if (!check.ok || !(await claimSecondFactor(user, check)))
    return { ok: false, error: 'El código no es válido.' };

  const headerStore = await headers();
  const origin = publicOrigin(headerStore);
  const resolved = await resolveAuthorizeRequest(parsed.data.query, origin);
  if (resolved.kind !== 'ok') return { ok: false, error: 'La solicitud ya no es válida.' };

  const { request } = resolved;
  const redirectTo = await issueAuthorizationCode(request, userId, origin);
  await auditMcp('connection authorized', {
    userId,
    ipAddress: clientIpFrom(headerStore),
    userAgent: headerStore.get('user-agent'),
    metadata: {
      clientId: request.client.id,
      clientName: request.client.name,
      redirectHost: request.redirectHost,
    },
  });
  await alertAdmins(`mcp-authorized:${request.client.id}:${userId}`, {
    type: 'security_mcp',
    title: 'Nueva conexión al servidor MCP',
    message: `${displayName(session.user.name)} conectó "${request.client.name}" (${request.redirectHost}) al servidor MCP. Si no fue a propósito, revocala en /admin/conexiones-mcp.`,
    metadata: { clientId: request.client.id, userId },
  });
  return { ok: true, redirectTo };
}
