import * as z from 'zod';
import prisma from '@/lib/prisma';
import { OAUTH_TTL, mcpResourceUrl } from './config';
import { PKCE_CHALLENGE, hashSecret, newSecret } from './crypto';
import { matchesRegisteredRedirect } from './redirect-uris';

/** The query of /oauth/autorizar, as RFC 6749 §4.1.1 + PKCE + RFC 8707 define it. */
export const authorizeParamsSchema = z.object({
  response_type: z.literal('code'),
  client_id: z.string().min(1).max(64),
  redirect_uri: z.string().min(1).max(500),
  code_challenge: z.string().regex(PKCE_CHALLENGE),
  // `plain` would let whoever sees the authorization URL redeem the code: only S256.
  code_challenge_method: z.literal('S256'),
  state: z.string().max(1000).optional(),
  resource: z.string().max(500).optional(),
  scope: z.string().max(200).optional(),
});

export type AuthorizeParams = z.infer<typeof authorizeParamsSchema>;

export type AuthorizeRequest = {
  params: AuthorizeParams;
  resource: string;
  client: { id: string; name: string };
  redirectHost: string;
};

export type ResolvedAuthorize =
  /** Unknown client or redirect URI: show an error and never redirect (RFC 6749 §4.1.2.1). */
  | { kind: 'fatal'; message: string }
  /** The redirect URI is trusted, but the rest of the request is wrong: tell the client. */
  | { kind: 'redirect'; url: string }
  | { kind: 'ok'; request: AuthorizeRequest };

const single = (value: string | string[] | undefined) => (Array.isArray(value) ? undefined : value);

/** Redirect URL carrying an error, `state` and the issuer (RFC 9207, against mix-up attacks). */
export const errorRedirect = (
  redirectUri: string,
  error: string,
  issuer: string,
  state?: string,
) => {
  const url = new URL(redirectUri);
  url.searchParams.set('error', error);
  if (state) url.searchParams.set('state', state);
  url.searchParams.set('iss', issuer);
  return url.toString();
};

/**
 * Validates an authorization request in the order the spec asks for: first the client and its
 * redirect URI (an error there is shown, never redirected, or the endpoint would be an open
 * redirector), then everything else (reported to the client through the redirect).
 */
export const resolveAuthorizeRequest = async (
  query: Record<string, string | string[] | undefined>,
  origin: string,
): Promise<ResolvedAuthorize> => {
  const keys = Object.keys(query);
  if (keys.some((key) => Array.isArray(query[key])))
    return { kind: 'fatal', message: 'La solicitud repite parámetros.' };

  const clientId = single(query.client_id);
  const redirectUri = single(query.redirect_uri);
  if (!clientId || !redirectUri || clientId.length > 64)
    return { kind: 'fatal', message: 'Falta el cliente o la dirección de retorno.' };

  const client = await prisma.oAuthClient.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, redirectUris: true },
  });
  if (!client) return { kind: 'fatal', message: 'El cliente no está registrado.' };
  if (!matchesRegisteredRedirect(client.redirectUris, redirectUri))
    return { kind: 'fatal', message: 'La dirección de retorno no está permitida.' };

  const state = single(query.state);
  const parsed = authorizeParamsSchema.safeParse(
    Object.fromEntries(keys.map((key) => [key, single(query[key])])),
  );
  if (!parsed.success) {
    const error =
      single(query.response_type) !== 'code' ? 'unsupported_response_type' : 'invalid_request';
    return {
      kind: 'redirect',
      url: errorRedirect(redirectUri, error, origin, state?.slice(0, 1000)),
    };
  }

  const resource = mcpResourceUrl(origin);
  if (parsed.data.resource !== undefined && parsed.data.resource !== resource) {
    return { kind: 'redirect', url: errorRedirect(redirectUri, 'invalid_target', origin, state) };
  }

  return {
    kind: 'ok',
    request: {
      params: parsed.data,
      resource,
      client: { id: client.id, name: client.name },
      redirectHost: new URL(redirectUri).host,
    },
  };
};

/** Stores a single-use code for `userId` and returns where to send the browser with it. */
export const issueAuthorizationCode = async (
  request: AuthorizeRequest,
  userId: string,
  issuer: string,
) => {
  const code = newSecret();
  await prisma.oAuthAuthorizationCode.create({
    data: {
      id: hashSecret(code),
      clientId: request.client.id,
      userId,
      redirectUri: request.params.redirect_uri,
      codeChallenge: request.params.code_challenge,
      resource: request.resource,
      expiresAt: new Date(Date.now() + OAUTH_TTL.codeSeconds * 1000),
    },
  });
  const url = new URL(request.params.redirect_uri);
  url.searchParams.set('code', code);
  if (request.params.state) url.searchParams.set('state', request.params.state);
  url.searchParams.set('iss', issuer);
  return url.toString();
};
