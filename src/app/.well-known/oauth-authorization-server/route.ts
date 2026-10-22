import { isMcpEnabled, publicOrigin } from '@/lib/oauth/config';
import { authorizationServerMetadata } from '@/lib/oauth/metadata';
import { corsPreflight, disabledResponse, oauthJson } from '@/lib/oauth/responses';

// Discovery of the OAuth server that guards the MCP endpoint (docs/mcp.md).
export const dynamic = 'force-dynamic';

export const GET = (request: Request) =>
  isMcpEnabled()
    ? oauthJson(authorizationServerMetadata(publicOrigin(request.headers)))
    : disabledResponse();

export const OPTIONS = () => (isMcpEnabled() ? corsPreflight() : disabledResponse());
