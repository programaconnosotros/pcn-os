'use server';

import prisma from '@/lib/prisma';
import { eventSchema, EventFormData } from '@/schemas/event-schema';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { canEditEvent } from '@/lib/event-permissions';
import { enforceRateLimit } from '@/lib/rate-limit';
import { getCurrentSession } from '@/actions/auth/get-current-session';
import { fillFromWaitlist } from '@/lib/event-waitlist';
import { notifyUsers } from '@/actions/notifications/notify-users';
import { emailUsers } from '@/actions/notifications/email-users';
import { EventNoticeEmail } from '@/components/events/event-notice-email';
import { formatEventWhen, formatEventWhere } from '@/lib/event-notices';

type EventPlace = {
  isOnline: boolean;
  placeName?: string | null;
  address?: string | null;
  city?: string | null;
};

/** Whether the change moves the event in time or place: what the people signed up must know. */
const changedWhenOrWhere = (
  before: EventPlace & { date: Date; endDate: Date | null },
  after: EventPlace & { date: Date; endDate: Date | null },
) => ({
  when:
    before.date.getTime() !== after.date.getTime() ||
    (before.endDate?.getTime() ?? null) !== (after.endDate?.getTime() ?? null),
  where:
    before.isOnline !== after.isOnline ||
    (['placeName', 'address', 'city'] as const).some(
      (field) => (before[field] ?? null) !== (after[field] ?? null),
    ),
});

/**
 * Tells everyone signed up for the event, in the app and by email, its new date or place.
 * Never throws: the edit is already saved.
 */
const notifyWhenOrWhereChange = async (
  event: EventPlace & { id: string; name: string; date: Date },
  changed: { when: boolean; where: boolean },
  editorId: string,
) => {
  try {
    const registrations = await prisma.eventRegistration.findMany({
      where: { eventId: event.id, cancelledAt: null, userId: { not: editorId } },
      select: { user: { select: { id: true, name: true, email: true } } },
    });
    const users = registrations.map((registration) => registration.user);
    if (users.length === 0) return;

    const when = formatEventWhen(event.date);
    const where = formatEventWhere(event);
    const what =
      changed.when && changed.where
        ? 'la fecha y el lugar'
        : changed.when
          ? 'la fecha'
          : 'el lugar';

    await notifyUsers(
      users.map((user) => user.id),
      {
        type: 'event_updated',
        push: true,
        title: `Cambió ${what} de ${event.name}`,
        message: `Ahora es el ${when}, ${where === 'online' ? 'online' : `en ${where}`}.`,
        href: `/eventos/${event.id}`,
        metadata: { eventId: event.id },
      },
      editorId,
    );
    await emailUsers(users, `${event.name}: cambió ${what}`, (firstName) =>
      EventNoticeEmail({
        userName: firstName,
        eventName: event.name,
        eventId: event.id,
        path: 'eventos/cambios',
        title: `Cambió ${what}`,
        preview: `${event.name}: cambió ${what}`,
        command: 'pcn eventos cambios',
        intro: `Cambió ${what} de un evento al que te anotaste. Así queda:`,
        rows: [
          { label: 'fecha', value: when, tone: changed.when ? 'amber' : undefined },
          { label: 'lugar', value: where, tone: changed.where ? 'amber' : undefined },
        ],
      }),
    );
  } catch (error) {
    console.error('Error notifying an event change:', error);
  }
};

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
 * Saves the edit, tells the people signed up when the date or place changed and fills freed
 * places from the waitlist. The form calls `updateEvent`, which then opens the event; the MCP
 * server (src/lib/mcp) calls this one directly.
 */
export const updateEventRecord = async (id: string, data: EventFormData) => {
  await enforceRateLimit('editContent');

  const validatedData = eventSchema.parse(data);

  const session = await getCurrentSession();

  if (!session) {
    throw new Error('Usuario no autenticado');
  }

  // Verificar que el evento existe
  const existingEvent = await prisma.event.findUnique({
    where: { id },
    include: { organizers: { select: { userId: true } } },
  });

  if (!existingEvent) {
    throw new Error('Evento no encontrado');
  }

  if (!canEditEvent(session.user, existingEvent)) {
    throw new Error('No tienes permisos para editar este evento');
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

  // Reemplazar sponsors existentes por los nuevos
  await prisma.$transaction([
    prisma.sponsor.deleteMany({
      where: { eventId: id },
    }),
    prisma.eventFlyerDesigner.deleteMany({ where: { eventId: id } }),
    prisma.event.update({
      where: { id },
      data: {
        ...eventData,
        date: date,
        endDate: endDate,
        googleMapsUrl: validatedData.googleMapsUrl ?? null,
        capacity: validatedData.capacity ?? null,
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
    }),
  ]);

  // Una edición de un evento que todavía no pasó avisa a los inscriptos si cambió cuándo o dónde.
  const after = {
    isOnline: eventData.isOnline,
    placeName: eventData.placeName ?? null,
    address: eventData.address ?? null,
    city: eventData.city ?? null,
    date,
    endDate,
  };
  const changed = changedWhenOrWhere(existingEvent, after);
  if ((changed.when || changed.where) && date > new Date()) {
    await notifyWhenOrWhereChange({ ...after, id, name: eventData.name }, changed, session.user.id);
  }

  // Si el cambio liberó lugares (más cupo o ya no está marcado como lleno), pasan a quienes esperan
  await fillFromWaitlist(id);

  revalidatePath('/eventos');
  revalidatePath(`/eventos/${id}`);
  return { id };
};

export const updateEvent = async (id: string, data: EventFormData) => {
  await updateEventRecord(id, data);
  redirect(`/eventos/${id}`);
};
