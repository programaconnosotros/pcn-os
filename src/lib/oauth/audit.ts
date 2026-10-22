import prisma from '@/lib/prisma';

type AuditContext = {
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Leaves a trace in AppLog (visible in /monitoreo) of everything that grants, uses or takes away
 * access to the MCP server: authorizations, token exchanges, revocations and every write a tool
 * makes. Never throws: losing a log line must not break the request.
 */
export const auditMcp = async (message: string, context: AuditContext = {}) => {
  try {
    await prisma.appLog.create({
      data: {
        level: 'info',
        message: `[mcp] ${message}`.slice(0, 500),
        path: '/api/mcp',
        userId: context.userId ?? null,
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent?.slice(0, 300) ?? null,
        metadata: context.metadata ? JSON.stringify(context.metadata).slice(0, 4000) : null,
      },
    });
  } catch (error) {
    console.error(
      'Failed to write the MCP audit log:',
      error instanceof Error ? error.message : error,
    );
  }
};
