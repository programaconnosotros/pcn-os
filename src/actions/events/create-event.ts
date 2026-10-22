'use server';

import prisma from '@/lib/prisma';
import { eventSchema, EventFormData } from '@/schemas/event-schema';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { canCreateEvents } from '@/lib/event-permissions';
import { enforceRateLimit } from '@/lib/rate-limit';
import { getCurrentSession } from '@/actions/auth/get-current-session';
import { notifyEveryone } from '@/actions/notifications/notify-users';
import { emailUsers } from '@/actions/notifications/email-users';
import { EventNoticeEmail } from '@/components/events/event-notice-email';
import { formatEventWhen, formatEventWhere } from '@/lib/event-notices';
import { ACTIVE_USER } from '@/lib/active-user';

/**
 * Designers of the event's flyer, deduplicated, with only user ids that exist (a stale id is
 * kept as a plain name). None when the event has no flyer left.
 */
const flyerDesignerRows = async (
  designers: { userId?: string | null; name: string }[],
  flyers: string[],
) => {
  const kept = flyers.length > 0 ? designers : [];
  const ids = [...new Set(kept.flatMap((designer) => (designer.userId ? [designer.userId] : [])))];
  const existing = new Set(
    ids.length
      ? (await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true } })).map(
          (user) => user.id,
        )
      : [],
  );
  const seen = new Set<string>();
  return kept.flatMap(({ userId, name }) => {
    const key = userId ?? `name:${name.toLowerCase()}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ name, userId: userId && existing.has(userId) ? userId : null }];
  });
};

/**
 * Creates the event and notifies everyone, and returns it. The form calls `createEvent`, which
 * then opens the new event; the MCP server (src/lib/mcp) calls this one directly.
 */
export const createEventRecord = async (data: EventFormData) => {
  await enforceRateLimit('createContent');

  const validatedData = eventSchema.parse(data);

  const session = await getCurrentSession();

  if (!session) {
    throw new Error('Usuario no autenticado');
  }

  if (!canCreateEvents(session.user)) {
    throw new Error('No tienes permisos para crear eventos');
  }

  // Convertir las fechas de string a Date
  const date = new Date(validatedData.date);
  const endDate = validatedData.endDate ? new Date(validatedData.endDate) : null;

  // Validar que endDate sea posterior a date si está presente
  if (endDate && endDate <= date) {
    throw new Error('La fecha de finalización debe ser posterior a la fecha de inicio');
  }

  const { sponsors, flyerDesigners, ...eventData } = validatedData;
  const designers = await flyerDesignerRows(flyerDesigners, eventData.flyerImages);

  const event = await prisma.event.create({
    data: {
      ...eventData,
      date: date,
      endDate: endDate,
      googleMapsUrl: validatedData.googleMapsUrl ?? null,
      capacity: validatedData.capacity ?? null,
      createdById: session.user.id,
      // Quien crea el evento queda como organizador; el resto se suma desde su página.
      organizers: { create: { userId: session.user.id } },
      flyerDesigners: { create: designers },
      sponsors: {
        create:
          sponsors
            ?.filter((s) => s.name.trim() !== '')
            .map((sponsor) => ({
              name: sponsor.name,
              website: sponsor.website && sponsor.website.trim() !== '' ? sponsor.website : null,
              logo: sponsor.logo ?? null,
            })) || [],
      },
    },
  });

  // Un evento que ya pasó se carga para el archivo: no hay nada a qué anotarse.
  if (date > new Date()) {
    await notifyEveryone(
      {
        type: 'event_created',
        push: true,
        title: 'Nuevo evento',
        message: `Se publicó "${event.name}", el ${date.toLocaleDateString('es-AR', {
          day: 'numeric',
          month: 'long',
          timeZone: 'America/Argentina/Buenos_Aires',
        })}.`,
        href: `/eventos/${event.id}`,
        metadata: { eventId: event.id },
      },
      session.user.id,
    );

    // Y por email a todos los que verificaron su dirección: en una sola tanda, de a lotes.
    try {
      const users = await prisma.user.findMany({
        where: { ...ACTIVE_USER, emailVerified: true, id: { not: session.user.id } },
        select: { name: true, email: true },
      });
      await emailUsers(users, `Nuevo evento: ${event.name}`, (firstName) =>
        EventNoticeEmail({
          userName: firstName,
          eventName: event.name,
          eventId: event.id,
          path: 'eventos/nuevo',
          title: 'Nuevo evento',
          preview: `Se publicó ${event.name}`,
          command: 'pcn eventos --nuevo',
          intro: 'Se publicó un nuevo evento en la comunidad. Anotate desde su página.',
          rows: [
            { label: 'fecha', value: formatEventWhen(date) },
            { label: 'lugar', value: formatEventWhere(event) },
          ],
        }),
      );
    } catch (error) {
      console.error('Error emailing everyone about a new event:', error);
    }
  }

  revalidatePath('/eventos');
  return event;
};

export const createEvent = async (data: EventFormData) => {
  const event = await createEventRecord(data);
  redirect(`/eventos/${event.id}`);
};
