// What /desarrollo tells about the MCP server (docs/mcp.md has the long version). The tool
// catalog is checked against the registry (src/lib/mcp/registry.test.ts).
import { MCP_TOOL_CATALOG, type McpToolSummary } from '@/lib/mcp/catalog';

export const MCP_URL = 'https://programaconnosotros.com/api/mcp';

export const mcpConnect = [
  {
    term: 'claude.ai / Desktop',
    detail: `Settings → Connectors → Add custom connector, con la URL ${MCP_URL}. Claude abre /oauth/autorizar: iniciás sesión, revisás que vuelva a claude.ai y tocás permitir.`,
  },
  {
    term: 'Claude Code',
    detail: `claude mcp add --transport http pcn ${MCP_URL}, y después /mcp → Authenticate. En local, la URL es https://pcn-website.localhost/api/mcp.`,
  },
  {
    term: 'Quién puede',
    detail:
      'Solo admins con la verificación en dos pasos activada, que además escriben un código de su app al aprobar: da acceso a todos los datos, privados incluidos. Las conexiones activas se ven y se revocan en /admin/conexiones-mcp.',
  },
];

export const mcpSecurity = [
  {
    term: 'OAuth 2.1',
    detail:
      'Registro dinámico de clientes públicos, PKCE S256 obligatorio, códigos de un solo uso por 5 minutos, access tokens de 1 hora y refresh tokens que rotan dentro de una transacción con la fila bloqueada: si vuelve uno ya rotado, aunque sea en paralelo, se revoca la conexión entera.',
  },
  {
    term: 'Redirects en allowlist',
    detail:
      'Un cliente solo puede registrar los callbacks de Claude o direcciones locales (Claude Code): nadie puede armar un link de autorización que mande el código a su servidor.',
  },
  {
    term: 'Token atado al recurso',
    detail:
      'Cada token vale solo para /api/mcp de este sitio (RFC 8707), y en cada request se vuelve a chequear que su admin siga siendo admin, activo y con 2FA.',
  },
  {
    term: 'Mismas reglas que la web',
    detail:
      'Las tools de escritura llaman a las mismas server actions que los formularios, corriendo como el admin del token: permisos, validación con zod y avisos a los miembros son idénticos.',
  },
  {
    term: 'Sin secretos en la salida',
    detail:
      'Selects explícitos, un redactor de último recurso y un test que planta canarios en cada columna secreta y corre todas las tools de lectura. Tokens y códigos se guardan solo hasheados.',
  },
  {
    term: 'Defensa en profundidad',
    detail:
      'Rate limits por IP y por conexión (con topes propios para escrituras y para lo que avisa a la comunidad), Origin validado contra DNS rebinding, consentimiento que no se puede embeber, no-store en todo, auditoría en AppLog de escrituras y lecturas de datos privados, y un kill switch (MCP_ENABLED=false).',
  },
];

/** The tools grouped by area, in registry order. */
export const mcpToolGroups = Object.entries(
  MCP_TOOL_CATALOG.reduce<Record<string, McpToolSummary[]>>((groups, tool) => {
    (groups[tool.area] ??= []).push(tool);
    return groups;
  }, {}),
).map(([area, tools]) => ({ area, tools }));

export const mcpToolCount = MCP_TOOL_CATALOG.length;
