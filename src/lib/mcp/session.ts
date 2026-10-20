import prisma from '@/lib/prisma';
import type { SessionWithUser } from '@/lib/session';
import { canUseMcp } from '@/lib/oauth/eligibility';

/** What `verifyBearer` attaches to the request once the OAuth token checks out. */
export type McpAuthExtra = { userId: string; tokenId: string; familyId: string; expiresAt: string };

export const isMcpAuthExtra = (value: unknown): value is McpAuthExtra =>
  !!value &&
  typeof value === 'object' &&
  typeof (value as McpAuthExtra).userId === 'string' &&
  typeof (value as McpAuthExtra).tokenId === 'string';

/**
 * The session a tool runs with: the token's admin, loaded fresh and without credentials, shaped
 * like a cookie session so the server actions treat it the same. Null if the user can't use the
 * MCP anymore (the token was checked moments ago, this catches a change in between).
 */
export const mcpSession = async (extra: McpAuthExtra): Promise<SessionWithUser | null> => {
  const user = await prisma.user.findUnique({
    where: { id: extra.userId },
    omit: { password: true, twoFactorSecret: true, twoFactorRecoveryCodes: true },
  });
  if (!user || !canUseMcp(user)) return null;
  const now = new Date();
  return {
    id: `mcp:${extra.tokenId}`,
    userId: user.id,
    expires: new Date(extra.expiresAt),
    createdAt: now,
    updatedAt: now,
    user,
  };
};
