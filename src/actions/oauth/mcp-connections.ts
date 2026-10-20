'use server';

import { revalidatePath } from 'next/cache';
import * as z from 'zod';
import { requireAdmin } from '@/lib/admin';
import { auditMcp } from '@/lib/oauth/audit';
import { revokeAllOAuthAccess, revokeFamily } from '@/lib/oauth/tokens';

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

/**
 * Disconnects every MCP connection at once, pending codes included: the button for a suspected
 * leak. Solo admins.
 */
export async function revokeAllMcpConnections() {
  const admin = await requireAdmin();
  const [{ count }] = await revokeAllOAuthAccess();
  await auditMcp('every connection revoked by an admin', {
    userId: admin.id,
    metadata: { tokens: count },
  });
  revalidatePath('/admin/conexiones-mcp');
  return { success: true as const };
}
