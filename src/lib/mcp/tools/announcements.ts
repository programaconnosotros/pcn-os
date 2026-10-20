import { z } from 'zod';
import prisma from '@/lib/prisma';
import { createAnnouncement } from '@/actions/announcements/create-announcement';
import { deleteAnnouncement } from '@/actions/announcements/delete-announcement';
import { updateAnnouncement } from '@/actions/announcements/update-announcement';
import { defineTool } from '../define';
import { ToolInputError } from '../output';
import { idArg, listResult, page, pageArgs } from '../pagination';
import { PERSON_SELECT } from '../selects';

/** The categories the announcement form offers. */
const CATEGORIES = ['general', 'evento', 'noticia', 'importante', 'actualizacion'] as const;

const announcementFields = {
  title: z.string().min(3).max(200),
  content: z.string().min(10).max(5000).describe('Texto del anuncio (admite saltos de línea).'),
  category: z.enum(CATEGORIES),
  pinned: z.boolean().describe('Fijarlo arriba de /anuncios.'),
  published: z.boolean().describe('false lo deja como borrador.'),
  eventId: idArg.nullable().optional().describe('Evento al que pertenece (categoría "evento").'),
};

const ANNOUNCEMENT_SELECT = {
  id: true,
  title: true,
  content: true,
  category: true,
  pinned: true,
  published: true,
  eventId: true,
  createdAt: true,
  updatedAt: true,
  author: { select: PERSON_SELECT },
  event: { select: { id: true, name: true } },
} as const;

const listAnnouncements = defineTool({
  name: 'list_announcements',
  title: 'Listar anuncios',
  area: 'anuncios',
  kind: 'read',
  description:
    'Anuncios y noticias de /anuncios, borradores incluidos, del más nuevo al más viejo.',
  input: z.object({
    published: z.boolean().optional().describe('Solo publicados (true) o solo borradores (false).'),
    category: z.enum(CATEGORIES).optional(),
    eventId: idArg.optional(),
    ...page,
  }),
  handler: async ({ published, category, eventId, ...pagination }) => {
    const where = {
      ...(published !== undefined && { published }),
      ...(category && { category }),
      ...(eventId && { eventId }),
    };
    const [items, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        select: ANNOUNCEMENT_SELECT,
        orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
        ...pageArgs(pagination),
      }),
      prisma.announcement.count({ where }),
    ]);
    return listResult(items, total, pagination.offset);
  },
});

const forEvent = (category: string, eventId: string | null | undefined) =>
  category === 'evento' ? (eventId ?? null) : null;

const createAnnouncementTool = defineTool({
  name: 'create_announcement',
  title: 'Crear un anuncio',
  area: 'anuncios',
  kind: 'write',
  notifies: true,
  description:
    'Publica un anuncio en /anuncios (o lo deja como borrador con published=false). Si es de un evento y se publica, les avisa a sus inscriptos.',
  input: z.object({
    ...announcementFields,
    pinned: announcementFields.pinned.default(false),
    published: announcementFields.published.default(true),
  }),
  handler: async (args) => {
    if (args.category === 'evento' && !args.eventId)
      throw new ToolInputError('Un anuncio de categoría "evento" necesita eventId');
    const announcement = await createAnnouncement({
      ...args,
      eventId: forEvent(args.category, args.eventId),
    });
    return { id: announcement.id, published: announcement.published, path: '/anuncios' };
  },
});

const updateAnnouncementTool = defineTool({
  name: 'update_announcement',
  title: 'Editar un anuncio',
  area: 'anuncios',
  kind: 'write',
  notifies: true,
  description:
    'Cambia los campos que le pases de un anuncio (por ejemplo published=true para publicar un borrador); el resto queda igual.',
  input: z.object({ id: idArg, ...z.object(announcementFields).partial().shape }),
  handler: async ({ id, ...changes }) => {
    const current = await prisma.announcement.findUnique({
      where: { id },
      select: {
        title: true,
        content: true,
        category: true,
        pinned: true,
        published: true,
        eventId: true,
      },
    });
    if (!current) throw new ToolInputError('Anuncio no encontrado');
    const defined = Object.fromEntries(
      Object.entries(changes).filter(([, value]) => value !== undefined),
    );
    const next = { ...current, ...defined };
    await updateAnnouncement(id, { ...next, eventId: forEvent(next.category, next.eventId) });
    return { id, updated: Object.keys(defined) };
  },
});

const deleteAnnouncementTool = defineTool({
  name: 'delete_announcement',
  title: 'Borrar un anuncio',
  area: 'anuncios',
  kind: 'write',
  destructive: true,
  description: 'Borra un anuncio para siempre. Confirmá con quien lo pidió antes de llamarla.',
  input: z.object({ id: idArg }),
  handler: async ({ id }) => {
    const exists = await prisma.announcement.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new ToolInputError('Anuncio no encontrado');
    await deleteAnnouncement(id);
    return { id, deleted: true };
  },
});

export const announcementTools = [
  listAnnouncements,
  createAnnouncementTool,
  updateAnnouncementTool,
  deleteAnnouncementTool,
];
