import { handleMcpRequest } from '@/lib/mcp/handler';

// The MCP server of the site (docs/mcp.md). OAuth-protected; see src/lib/mcp/handler.ts.
export const dynamic = 'force-dynamic';
// Tool calls can run a few queries and, for create_event, email everyone.
export const maxDuration = 60;

export const GET = handleMcpRequest;
export const POST = handleMcpRequest;
export const DELETE = handleMcpRequest;
