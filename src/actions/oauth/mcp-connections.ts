'use server';

import { revalidatePath } from 'next/cache';
import * as z from 'zod';
import { requireAdmin } from '@/lib/admin';
import prisma from '@/lib/prisma';
import { auditMcp } from '@/lib/oauth/audit';
import { revokeFamily } from '@/lib/oauth/tokens';

const familySchema = z.uuid();

/** Disconnects one MCP connection (any admin's), from /admin/conexiones-mcp. Solo admins. */
export async function revokeMcpConnection(familyId: unknown) {
  const admin = await requireAdmin();
  const id = familySchema.parse(familyId);
  await revokeFamily(id);
  await auditMcp('connection revoked by an admin', {
    userId: admin.id,
    metadata: { familyId: id },
  });
  revalidatePath('/admin/conexiones-mcp');
  return { success: true as const };
}

/** Disconnects every MCP connection at once: the button for a suspected leak. Solo admins. */
export async function revokeAllMcpConnections() {
  const admin = await requireAdmin();
  const { count } = await prisma.oAuthToken.updateMany({
    where: { revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await auditMcp('every connection revoked by an admin', {
    userId: admin.id,
    metadata: { tokens: count },
  });
  revalidatePath('/admin/conexiones-mcp');
  return { success: true as const };
}
