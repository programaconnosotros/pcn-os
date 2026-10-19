import { isMcpEnabled, publicOrigin } from '@/lib/oauth/config';
import { protectedResourceMetadata } from '@/lib/oauth/metadata';
import { corsPreflight, disabledResponse, oauthJson } from '@/lib/oauth/responses';

// RFC 9728: clients ask here (at the root or at `/.well-known/oauth-protected-resource/api/mcp`)
// which authorization server issues tokens for the MCP endpoint.
export const dynamic = 'force-dynamic';

export const GET = (request: Request) =>
  isMcpEnabled()
    ? oauthJson(protectedResourceMetadata(publicOrigin(request.headers)))
    : disabledResponse();

export const OPTIONS = () => (isMcpEnabled() ? corsPreflight() : disabledResponse());
