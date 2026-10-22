import { MCP_TOOL_CATALOG } from './catalog';
import { MCP_TOOLS } from './registry';

// The smallest valid arguments of a list tool, to check its limit alone.
const validArgs = (name: string): Record<string, unknown> =>
  name === 'get_event_registrations' ? { eventId: 'e' } : {};

describe('MCP tool registry', () => {
  it('matches the catalog /desarrollo shows', () => {
    expect(
      MCP_TOOLS.map(({ name, title, area, kind, destructive }) => ({
        name,
        title,
        area,
        kind,
        ...(destructive && { destructive }),
      })),
    ).toEqual(MCP_TOOL_CATALOG);
  });

  it('has unique snake_case names and a description for every tool', () => {
    const names = MCP_TOOLS.map((tool) => tool.name);
    expect(new Set(names).size).toBe(names.length);
    for (const tool of MCP_TOOLS) {
      expect(tool.name).toMatch(/^[a-z]+(_[a-z]+)*$/);
      expect(tool.description.length).toBeGreaterThan(20);
    }
  });

  it('only marks writes as destructive', () => {
    for (const tool of MCP_TOOLS.filter((candidate) => candidate.destructive))
      expect(tool.kind).toBe('write');
  });

  // Each of these spends the small mcpNotify budget, so only tools whose action really notifies
  // members belong here: creating an event or an announcement, and moving an event.
  it('marks as notifying only the tools whose action notifies members', () => {
    expect(MCP_TOOLS.filter((tool) => tool.notifies).map((tool) => tool.name)).toEqual([
      'create_event',
      'update_event',
      'create_announcement',
    ]);
  });

  it('bounds every list', () => {
    for (const tool of MCP_TOOLS) {
      if ('limit' in tool.input.shape)
        expect(tool.input.safeParse({ ...validArgs(tool.name), limit: 101 }).success).toBe(false);
    }
  });
});
