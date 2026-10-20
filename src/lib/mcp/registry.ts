import type { McpServer } from '@modelcontextprotocol/server';
import { runAsUser } from '@/lib/acting-user';
import { auditMcp } from '@/lib/oauth/audit';
import type { McpTool } from './define';
import { toolError, toolErrorFrom, toolJson, type ToolResult } from './output';
import { isMcpAuthExtra, mcpSession } from './session';
import { adminTools } from './tools/admin';
import { announcementTools } from './tools/announcements';
import { contentTools } from './tools/content';
import { eventTools } from './tools/events';
import { memberTools } from './tools/members';
import { recommendationTools } from './tools/recommendations';
import { siteDataTools } from './tools/site-data';

/** Every tool of the MCP server. Add new ones here (docs/mcp.md says how to write one safely). */
export const MCP_TOOLS: McpTool[] = [
  ...eventTools,
  ...announcementTools,
  ...recommendationTools,
  ...memberTools,
  ...contentTools,
  ...siteDataTools,
  ...adminTools,
];

/** Name, description and kind of each tool, for the catalog on /desarrollo. */
export const mcpToolCatalog = MCP_TOOLS.map(
  ({ name, title, description, area, kind, destructive }) => ({
    name,
    title,
    description,
    area,
    kind,
    destructive: !!destructive,
  }),
);

/** Ids and field names of a write, for the audit log: never the content itself. */
const auditArgs = (args: Record<string, unknown>) => ({
  ...(typeof args.id === 'string' && { id: args.id }),
  ...(typeof args.kind === 'string' && { kind: args.kind }),
  fields: Object.keys(args).filter((key) => key !== 'id'),
});

/**
 * Runs one tool call: as the token's admin (so server actions see their session), with errors
 * turned into safe messages, every result scrubbed of secrets and every write audited.
 */
export const runTool = async (
  tool: McpTool,
  args: Record<string, unknown>,
  extra: unknown,
): Promise<ToolResult> => {
  if (!isMcpAuthExtra(extra)) return toolError('No autorizado');
  const session = await mcpSession(extra);
  if (!session) return toolError('No autorizado');

  try {
    const result = await runAsUser(session, () => tool.handler(args, session));
    if (tool.kind === 'write') {
      await auditMcp(`tool ${tool.name}`, {
        userId: session.user.id,
        metadata: { ...auditArgs(args), familyId: extra.familyId, ok: true },
      });
    }
    return toolJson(result);
  } catch (error) {
    if (tool.kind === 'write') {
      await auditMcp(`tool ${tool.name} failed`, {
        userId: session.user.id,
        metadata: { ...auditArgs(args), familyId: extra.familyId, ok: false },
      });
    }
    return toolErrorFrom(error, tool.name);
  }
};

export const registerMcpTools = (server: McpServer) => {
  for (const tool of MCP_TOOLS) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.input,
        annotations: {
          title: tool.title,
          readOnlyHint: tool.kind === 'read',
          destructiveHint: tool.kind === 'write' && !!tool.destructive,
          idempotentHint: tool.kind === 'read',
          openWorldHint: false,
        },
      },
      (args, ctx) => runTool(tool, args as Record<string, unknown>, ctx.http?.authInfo?.extra),
    );
  }
};
