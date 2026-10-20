'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { revokeUserOAuthTokens } from '@/lib/oauth/tokens';

const inputSchema = z.object({ userId: z.string().min(1).max(100), suspended: z.boolean() });

/**
 * Suspends an account or lifts the suspension. Admins only. A suspended account can't sign in
 * and its open sessions are deleted, so it's logged out everywhere right away.
 */
export const setSuspended = async (userId: string, suspended: boolean) => {
  const admin = await requireAdmin();
  const input = inputSchema.parse({ userId, suspended });

  // Returned, not thrown: in production a thrown message doesn't reach the browser.
  if (admin.id === input.userId) {
    return { success: false as const, error: 'No podés suspender tu propia cuenta' };
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, role: true },
  });
  if (!user) throw new Error('Usuario no encontrado');
  if (user.role === 'ADMIN') {
    return { success: false as const, error: 'Quitale el rol de admin antes de suspenderlo' };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { suspendedAt: input.suspended ? new Date() : null },
    }),
    ...(input.suspended
      ? [prisma.session.deleteMany({ where: { userId: user.id } }), revokeUserOAuthTokens(user.id)]
      : []),
  ]);

  revalidatePath('/usuarios');
  revalidatePath(`/perfil/${user.id}`);

  return { success: true as const };
};
