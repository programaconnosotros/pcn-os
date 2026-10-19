import * as z from 'zod';
import prisma from '@/lib/prisma';
import { isAllowedRedirectUri } from './redirect-uris';

/** Clients one IP may register per day. Claude registers one per connector, so this is generous. */
export const MAX_CLIENTS_PER_IP_PER_DAY = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

// Control characters and bidi overrides could make a client name look like something else on the
// consent screen ("Claude" followed by a hidden suffix).
const UNSAFE_NAME_CHARS = /[\p{Cc}\p{Cf}]/gu;

export const cleanClientName = (name: string | undefined) =>
  (name ?? '').replace(UNSAFE_NAME_CHARS, '').replace(/\s+/g, ' ').trim().slice(0, 80) ||
  'Cliente MCP';

/** RFC 7591 metadata this server accepts. Anything else in the request is ignored. */
export const registrationSchema = z.object({
  redirect_uris: z.array(z.string().max(500)).min(1).max(5),
  client_name: z.string().max(200).optional(),
  token_endpoint_auth_method: z.literal('none').optional(),
  grant_types: z
    .array(z.enum(['authorization_code', 'refresh_token']))
    .max(2)
    .optional(),
  response_types: z.array(z.literal('code')).max(1).optional(),
});

export type RegistrationResult =
  | { ok: true; body: Record<string, unknown> }
  | {
      ok: false;
      error: 'invalid_client_metadata' | 'invalid_redirect_uri' | 'slow_down';
      description: string;
    };

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
      description:
        'Solo se aceptan clientes públicos (token_endpoint_auth_method "none") con authorization_code.',
    };
  }
  const { redirect_uris: redirectUris, client_name: rawName } = parsed.data;
  const rejected = redirectUris.find((uri) => !isAllowedRedirectUri(uri));
  if (rejected) {
    return {
      ok: false,
      error: 'invalid_redirect_uri',
      description:
        'Solo se aceptan los callbacks de Claude o direcciones locales (http://localhost, 127.0.0.1).',
    };
  }

  const since = new Date(Date.now() - DAY_MS);
  if (ip) {
    const recent = await prisma.oAuthClient.count({
      where: { registeredFromIp: ip, createdAt: { gte: since } },
    });
    if (recent >= MAX_CLIENTS_PER_IP_PER_DAY) {
      return {
        ok: false,
        error: 'slow_down',
        description: 'Demasiados clientes registrados desde esta IP.',
      };
    }
  }
  // Registrations nobody finished (no code was ever approved) don't need to stay around.
  await prisma.oAuthClient.deleteMany({
    where: { createdAt: { lt: since }, tokens: { none: {} }, codes: { none: {} } },
  });

  const client = await prisma.oAuthClient.create({
    data: {
      name: cleanClientName(rawName),
      redirectUris: [...new Set(redirectUris)],
      registeredFromIp: ip,
    },
  });
  return {
    ok: true,
    body: {
      client_id: client.id,
      client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
      client_name: client.name,
      redirect_uris: client.redirectUris,
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    },
  };
};
