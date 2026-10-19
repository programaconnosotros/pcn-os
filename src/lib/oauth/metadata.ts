import { MCP_SCOPE, mcpResourceUrl } from './config';

/** RFC 8414 authorization server metadata. `issuer` is the site's public origin. */
export const authorizationServerMetadata = (issuer: string) => ({
  issuer,
  authorization_endpoint: `${issuer}/oauth/autorizar`,
  token_endpoint: `${issuer}/oauth/token`,
  registration_endpoint: `${issuer}/oauth/register`,
  revocation_endpoint: `${issuer}/oauth/revoke`,
  response_types_supported: ['code'],
  response_modes_supported: ['query'],
  grant_types_supported: ['authorization_code', 'refresh_token'],
  code_challenge_methods_supported: ['S256'],
  token_endpoint_auth_methods_supported: ['none'],
  revocation_endpoint_auth_methods_supported: ['none'],
  scopes_supported: [MCP_SCOPE],
  authorization_response_iss_parameter_supported: true,
  service_documentation: `${issuer}/desarrollo#mcp`,
});

/** RFC 9728 protected resource metadata of the MCP endpoint. */
export const protectedResourceMetadata = (origin: string) => ({
  resource: mcpResourceUrl(origin),
  resource_name: 'programaConNosotros',
  authorization_servers: [origin],
  scopes_supported: [MCP_SCOPE],
  bearer_methods_supported: ['header'],
  resource_documentation: `${origin}/desarrollo#mcp`,
});
