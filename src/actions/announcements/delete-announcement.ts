'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getCurrentSession } from '@/actions/auth/get-current-session';

export async function deleteAnnouncement(announcementId: string) {
  const session = await getCurrentSession();

  if (!session) {
    throw new Error('No autorizado');
  }

  if (session.user.role !== 'ADMIN') {
    throw new Error('No tienes permisos para eliminar anuncios');
  }

  await prisma.announcement.delete({
    where: { id: announcementId },
  });

  revalidatePath('/anuncios');

  return { success: true };
}
