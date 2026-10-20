import prisma from '@/lib/prisma';

/**
 * The MCP connections that still work: one row per authorization (its current token pair), with
 * who made it and which client. Refreshes rotate the pair, so the live one is the only unrevoked
 * pair of its family.
 */
export const listMcpConnections = async () => {
  const tokens = await prisma.oAuthToken.findMany({
    where: { revokedAt: null, refreshExpiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    select: {
      familyId: true,
      createdAt: true,
      lastUsedAt: true,
      refreshExpiresAt: true,
      client: { select: { name: true, redirectUris: true } },
      user: { select: { id: true, name: true } },
    },
  });
  const firstIssued = await prisma.oAuthToken.groupBy({
    by: ['familyId'],
    where: { familyId: { in: tokens.map((token) => token.familyId) } },
    _min: { createdAt: true },
  });
  const since = new Map(firstIssued.map((row) => [row.familyId, row._min.createdAt]));

  return tokens.map((token) => ({
    familyId: token.familyId,
    clientName: token.client.name,
    redirectHosts: [...new Set(token.client.redirectUris.map((uri) => new URL(uri).host))],
    user: token.user,
    connectedAt: since.get(token.familyId) ?? token.createdAt,
    lastUsedAt: token.lastUsedAt,
    expiresAt: token.refreshExpiresAt,
  }));
};

export type McpConnection = Awaited<ReturnType<typeof listMcpConnections>>[number];
