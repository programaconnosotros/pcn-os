'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { announcementSchema, AnnouncementFormData } from '@/schemas/announcement-schema';
import { getCurrentSession } from '@/actions/auth/get-current-session';
import { notifyEventAnnouncement } from '@/actions/notifications/event-announcement-notice';

export async function createAnnouncement(data: AnnouncementFormData) {
  const session = await getCurrentSession();

  if (!session) {
    throw new Error('No autorizado');
  }

  if (session.user.role !== 'ADMIN') {
    throw new Error('No tienes permisos para crear anuncios');
  }

  const validatedData = announcementSchema.parse(data);

  const announcement = await prisma.announcement.create({
    data: {
      title: validatedData.title,
      content: validatedData.content,
      category: validatedData.category,
      pinned: validatedData.pinned,
      published: validatedData.published,
      authorId: session.user.id,
      eventId: validatedData.category === 'evento' ? validatedData.eventId : null,
    },
  });

  // Un anuncio publicado en un evento les llega a sus inscriptos, igual que desde la página del
  // evento.
  if (announcement.eventId && announcement.published) {
    const event = await prisma.event.findFirst({
      where: { id: announcement.eventId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (event) await notifyEventAnnouncement(event, announcement, session.user.id);
  }

  revalidatePath('/anuncios');
  if (validatedData.eventId) {
    revalidatePath(`/eventos/${validatedData.eventId}`);
  }

  return announcement;
}
