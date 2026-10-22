import type { Role } from '@/generated/prisma/client';

/** What the OAuth server and the MCP endpoint need to know about a user, and nothing more. */
export const MCP_USER_SELECT = {
  id: true,
  name: true,
  role: true,
  suspendedAt: true,
  deactivatedAt: true,
  twoFactorEnabledAt: true,
} as const;

export type McpUserFields = {
  role: Role;
  suspendedAt: Date | null;
  deactivatedAt: Date | null;
  twoFactorEnabledAt: Date | null;
};

/**
 * Who may connect Claude to the site: an active admin with two-factor sign-in on. The MCP server
 * reads everything, private data included, so a stolen password alone must not be enough. It's
 * checked when authorizing, on every token exchange and on every MCP request: an admin who is
 * demoted, suspended or turns 2FA off loses access on the next call.
 */
export const canUseMcp = (user: McpUserFields | null | undefined): boolean =>
  !!user &&
  user.role === 'ADMIN' &&
  user.suspendedAt === null &&
  user.deactivatedAt === null &&
  user.twoFactorEnabledAt !== null;

/** Why `canUseMcp` said no, for the consent screen. */
export const mcpIneligibilityReason = (user: McpUserFields) => {
  if (user.role !== 'ADMIN') return 'not_admin' as const;
  if (user.twoFactorEnabledAt === null) return 'no_two_factor' as const;
  return 'inactive' as const;
};
