'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { announcementSchema, AnnouncementFormData } from '@/schemas/announcement-schema';
import { getCurrentSession } from '@/actions/auth/get-current-session';

export async function updateAnnouncement(announcementId: string, data: AnnouncementFormData) {
  const session = await getCurrentSession();

  if (!session) {
    throw new Error('No autorizado');
  }

  if (session.user.role !== 'ADMIN') {
    throw new Error('No tienes permisos para editar anuncios');
  }

  const validatedData = announcementSchema.parse(data);

  // Obtener el anuncio anterior para revalidar el evento si cambió
  const previousAnnouncement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    select: { eventId: true },
  });

  const announcement = await prisma.announcement.update({
    where: { id: announcementId },
    data: {
      title: validatedData.title,
      content: validatedData.content,
      category: validatedData.category,
      pinned: validatedData.pinned,
      published: validatedData.published,
      eventId: validatedData.category === 'evento' ? validatedData.eventId : null,
    },
  });

  revalidatePath('/anuncios');
  if (validatedData.eventId) {
    revalidatePath(`/eventos/${validatedData.eventId}`);
  }
  if (previousAnnouncement?.eventId && previousAnnouncement.eventId !== validatedData.eventId) {
    revalidatePath(`/eventos/${previousAnnouncement.eventId}`);
  }

  return announcement;
}
