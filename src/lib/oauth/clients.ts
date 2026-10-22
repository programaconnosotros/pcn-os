import * as z from 'zod';
import prisma from '@/lib/prisma';
import { isAllowedRedirectUri, isLoopbackRedirectUri } from './redirect-uris';

/**
 * Loopback clients one IP may register per day. Claude Code registers from the admin's own
 * machine, so this is generous.
 */
export const MAX_LOOPBACK_CLIENTS_PER_IP_PER_DAY = 10;
/**
 * Clients nobody approved yet, site-wide. Registrations for Claude's own callbacks come from
 * claude.ai's servers (one shared IP for everyone), so they can't be capped per IP without
 * letting any claude.ai user lock the admins out; this caps the table instead.
 */
export const MAX_PENDING_CLIENTS = 500;
const DAY_MS = 24 * 60 * 60 * 1000;

// Control characters and bidi overrides could make a client name look like something else on the
// consent screen ("Claude" followed by a hidden suffix).
const UNSAFE_NAME_CHARS = /[\p{Cc}\p{Cf}]/gu;

export const cleanClientName = (name: string | undefined) =>
  (name ?? '').replace(UNSAFE_NAME_CHARS, '').replace(/\s+/g, ' ').trim().slice(0, 80) ||
  'Cliente MCP';

/**
 * RFC 7591 metadata. Only the redirect URIs and the name matter; the rest is accepted as sent and
 * answered with what this server actually does (public client, authorization code + refresh), as
 * §3.2.1 allows, so clients that ask for something else still register.
 */
export const registrationSchema = z.object({
  redirect_uris: z.array(z.string().max(500)).min(1).max(5),
  client_name: z.string().max(200).optional(),
  token_endpoint_auth_method: z.string().max(50).optional(),
  grant_types: z.array(z.string().max(100)).max(10).optional(),
  response_types: z.array(z.string().max(50)).max(10).optional(),
});

export type RegistrationResult =
  | { ok: true; body: Record<string, unknown>; reused: boolean }
  | {
      ok: false;
      error: 'invalid_client_metadata' | 'invalid_redirect_uri' | 'slow_down';
      description: string;
    };

const responseBody = (client: {
  id: string;
  name: string;
  redirectUris: string[];
  createdAt: Date;
}) => ({
  client_id: client.id,
  client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
  client_name: client.name,
  redirect_uris: client.redirectUris,
  grant_types: ['authorization_code', 'refresh_token'],
  response_types: ['code'],
  token_endpoint_auth_method: 'none',
});

/** Dynamic client registration (RFC 7591) for public clients only. */
export const registerClient = async (
  input: unknown,
  ip: string | null,
): Promise<RegistrationResult> => {
  const parsed = registrationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'invalid_client_metadata',
      description: 'Faltan redirect_uris o hay campos inválidos.',
    };
  }
  const { client_name: rawName } = parsed.data;
  const redirectUris = [...new Set(parsed.data.redirect_uris)].sort();
  if (!redirectUris.every(isAllowedRedirectUri)) {
    return {
      ok: false,
      error: 'invalid_redirect_uri',
      description:
        'Solo se aceptan los callbacks de Claude o direcciones locales (http://localhost:<puerto>/callback).',
    };
  }
  const name = cleanClientName(rawName);

  // The same app registering again (claude.ai does it for every connector) gets the same client.
  const existing = await prisma.oAuthClient.findFirst({
    where: { name, redirectUris: { equals: redirectUris } },
    orderBy: { createdAt: 'desc' },
  });
  if (existing) return { ok: true, body: responseBody(existing), reused: true };

  const since = new Date(Date.now() - DAY_MS);
  const loopback = redirectUris.some(isLoopbackRedirectUri);
  if (loopback && ip) {
    const recent = await prisma.oAuthClient.count({
      where: { registeredFromIp: ip, createdAt: { gte: since } },
    });
    if (recent >= MAX_LOOPBACK_CLIENTS_PER_IP_PER_DAY) {
      return {
        ok: false,
        error: 'slow_down',
        description: 'Demasiados clientes registrados desde esta IP.',
      };
    }
  }
  const pending = await prisma.oAuthClient.count({
    where: { tokens: { none: {} }, codes: { none: {} } },
  });
  if (pending >= MAX_PENDING_CLIENTS) {
    return { ok: false, error: 'slow_down', description: 'Demasiados clientes sin aprobar.' };
  }

  const client = await prisma.oAuthClient.create({
    data: { name, redirectUris, registeredFromIp: ip },
  });
  return { ok: true, body: responseBody(client), reused: false };
};
