import { z } from 'zod';
import prisma from '@/lib/prisma';
import { createEventRecord } from '@/actions/events/create-event';
import { updateEventRecord } from '@/actions/events/update-event';
import type { EventFormData } from '@/schemas/event-schema';
import { UNTRUSTED_NOTE, defineTool } from '../define';
import { ToolInputError } from '../output';
import { idArg, listResult, page, pageArgs, searchText } from '../pagination';
import { CONTACT_SELECT, PERSON_SELECT } from '../selects';

const EVENT_LIST_SELECT = {
  id: true,
  name: true,
  date: true,
  endDate: true,
  isOnline: true,
  city: true,
  placeName: true,
  address: true,
  capacity: true,
  markedAsFull: true,
  callForSpeakersEnabled: true,
  externalRegistrationUrl: true,
  shortcut: true,
  deletedAt: true,
  _count: {
    select: {
      registrations: { where: { cancelledAt: null } },
      waitlistEntries: { where: { cancelledAt: null, promotedAt: null } },
      talks: true,
    },
  },
} as const;

const isoDate = z.iso
  .datetime({ offset: true })
  .describe('Fecha y hora ISO 8601 con zona, por ejemplo 2026-11-20T19:00:00-03:00.');

/** What an event takes, as plain JSON. The site's own eventSchema validates it again. */
const eventFields = {
  name: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  date: isoDate,
  endDate: isoDate.optional(),
  isOnline: z.boolean().optional().describe('true si es virtual (no pide ciudad ni dirección).'),
  city: z.string().max(100).optional(),
  placeName: z.string().max(100).optional(),
  address: z.string().max(200).optional(),
  googleMapsUrl: z.string().max(500).optional(),
  capacity: z.number().int().min(1).max(100_000).optional().describe('Cupo; sin cupo si falta.'),
  externalRegistrationUrl: z.url().max(500).optional(),
  streamingUrl: z.url().max(500).optional(),
  markedAsFull: z.boolean().optional(),
  callForSpeakersEnabled: z.boolean().optional().describe('Si se pueden proponer charlas.'),
  shortcut: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(60)
    .optional()
    .describe('Atajo de URL (programaconnosotros.com/<atajo>).'),
  sponsors: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        website: z.url().max(500).optional(),
        logo: z.string().max(2048).optional(),
      }),
    )
    .max(30)
    .optional(),
};

const listEvents = defineTool({
  name: 'list_events',
  title: 'Listar eventos',
  area: 'eventos',
  kind: 'read',
  description:
    'Eventos de la comunidad con su fecha, lugar, cupo e inscriptos activos. Por defecto los próximos primero; `when` elige próximos, pasados o todos.',
  input: z.object({
    when: z.enum(['upcoming', 'past', 'all']).default('upcoming'),
    search: searchText.optional().describe('Parte del nombre del evento.'),
    includeDeleted: z.boolean().default(false).describe('Incluir los eventos borrados.'),
    ...page,
  }),
  handler: async ({ when, search, includeDeleted, ...pagination }) => {
    const now = new Date();
    const where = {
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(when === 'upcoming' && { date: { gte: now } }),
      ...(when === 'past' && { date: { lt: now } }),
      ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
    };
    const [items, total] = await Promise.all([
      prisma.event.findMany({
        where,
        select: EVENT_LIST_SELECT,
        orderBy: { date: when === 'upcoming' ? 'asc' : 'desc' },
        ...pageArgs(pagination),
      }),
      prisma.event.count({ where }),
    ]);
    return listResult(
      items.map(({ _count, ...event }) => ({
        ...event,
        path: `/eventos/${event.id}`,
        registrations: _count.registrations,
        waitlist: _count.waitlistEntries,
        talks: _count.talks,
      })),
      total,
      pagination.offset,
    );
  },
});

const getEvent = defineTool({
  name: 'get_event',
  title: 'Ver un evento',
  area: 'eventos',
  kind: 'read',
  description: `Todo sobre un evento: descripción, lugar, organizadores, sponsors, charlas, anuncios y cuántos se anotaron. ${UNTRUSTED_NOTE}`,
  input: z.object({ id: idArg }),
  handler: async ({ id }) => {
    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        ...EVENT_LIST_SELECT,
        description: true,
        googleMapsUrl: true,
        streamingUrl: true,
        flyerImages: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: PERSON_SELECT },
        organizers: { select: { user: { select: PERSON_SELECT } } },
        sponsors: { select: { name: true, website: true, logo: true } },
        flyerDesigners: { select: { name: true, userId: true } },
        talks: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            videoUrl: true,
            slidesUrl: true,
            speakers: { select: { speakerName: true, userId: true } },
          },
        },
        announcements: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, title: true, published: true, createdAt: true },
        },
      },
    });
    if (!event) throw new ToolInputError('Evento no encontrado');
    const { _count, organizers, ...rest } = event;
    return {
      ...rest,
      path: `/eventos/${event.id}`,
      organizers: organizers.map((organizer) => organizer.user),
      registrations: _count.registrations,
      waitlist: _count.waitlistEntries,
    };
  },
});

const getEventRegistrations = defineTool({
  name: 'get_event_registrations',
  title: 'Inscriptos de un evento',
  area: 'eventos',
  kind: 'read',
  sensitive: true,
  description:
    'Quiénes se anotaron a un evento y quiénes esperan lugar, con email y teléfono. Datos privados: usalos solo para lo que se pidió.',
  input: z.object({
    eventId: idArg,
    includeCancelled: z.boolean().default(false),
  }),
  handler: async ({ eventId, includeCancelled }) => {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true, date: true, capacity: true },
    });
    if (!event) throw new ToolInputError('Evento no encontrado');
    const active = includeCancelled ? {} : { cancelledAt: null };
    const [registrations, waitlist] = await Promise.all([
      prisma.eventRegistration.findMany({
        where: { eventId, ...active },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true, cancelledAt: true, user: { select: CONTACT_SELECT } },
      }),
      prisma.eventWaitlistEntry.findMany({
        where: { eventId, ...active, ...(includeCancelled ? {} : { promotedAt: null }) },
        orderBy: { createdAt: 'asc' },
        select: {
          createdAt: true,
          cancelledAt: true,
          promotedAt: true,
          user: { select: CONTACT_SELECT },
        },
      }),
    ]);
    return { event, registrations, waitlist };
  },
});

const createEvent = defineTool({
  name: 'create_event',
  title: 'Crear un evento',
  area: 'eventos',
  kind: 'write',
  notifies: true,
  description:
    'Crea un evento, con vos como organizador. Si es a futuro, AVISA A TODA LA COMUNIDAD (notificación y email a cada miembro): confirmá los datos con quien lo pidió antes de llamarla. Un evento presencial necesita ciudad, lugar y dirección.',
  input: z.object(eventFields),
  handler: async (args) => {
    const event = await createEventRecord(args satisfies EventFormData);
    return { id: event.id, name: event.name, path: `/eventos/${event.id}` };
  },
});

const updateEvent = defineTool({
  name: 'update_event',
  title: 'Editar un evento',
  area: 'eventos',
  kind: 'write',
  notifies: true,
  description:
    'Cambia los campos que le pases de un evento; el resto queda igual. Si cambia la fecha o el lugar de un evento futuro, les avisa a los inscriptos. `sponsors`, si viene, reemplaza la lista entera.',
  input: z.object({ id: idArg, ...z.object(eventFields).partial().shape }),
  handler: async ({ id, ...changes }) => {
    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        name: true,
        description: true,
        date: true,
        endDate: true,
        isOnline: true,
        city: true,
        placeName: true,
        address: true,
        googleMapsUrl: true,
        capacity: true,
        externalRegistrationUrl: true,
        streamingUrl: true,
        markedAsFull: true,
        callForSpeakersEnabled: true,
        shortcut: true,
        flyerImages: true,
        deletedAt: true,
        sponsors: { select: { name: true, website: true, logo: true } },
        flyerDesigners: { select: { name: true, userId: true } },
      },
    });
    if (!event || event.deletedAt) throw new ToolInputError('Evento no encontrado');

    const current: EventFormData = {
      name: event.name,
      description: event.description,
      date: event.date.toISOString(),
      endDate: event.endDate?.toISOString(),
      isOnline: event.isOnline,
      city: event.city ?? undefined,
      placeName: event.placeName ?? undefined,
      address: event.address ?? undefined,
      googleMapsUrl: event.googleMapsUrl ?? undefined,
      capacity: event.capacity ?? undefined,
      externalRegistrationUrl: event.externalRegistrationUrl ?? undefined,
      streamingUrl: event.streamingUrl ?? undefined,
      markedAsFull: event.markedAsFull,
      callForSpeakersEnabled: event.callForSpeakersEnabled,
      shortcut: event.shortcut ?? undefined,
      flyerImages: event.flyerImages,
      flyerDesigners: event.flyerDesigners,
      sponsors: event.sponsors.map((sponsor) => ({
        name: sponsor.name,
        website: sponsor.website ?? undefined,
        logo: sponsor.logo ?? undefined,
      })),
    };
    const defined = Object.fromEntries(
      Object.entries(changes).filter(([, value]) => value !== undefined),
    );
    await updateEventRecord(id, { ...current, ...defined });
    return { id, path: `/eventos/${id}`, updated: Object.keys(defined) };
  },
});

export const eventTools = [listEvents, getEvent, getEventRegistrations, createEvent, updateEvent];
