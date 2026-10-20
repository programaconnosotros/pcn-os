import { z } from 'zod';
import prisma from '@/lib/prisma';
import { UNTRUSTED_NOTE, defineTool } from '../define';
import { ToolInputError } from '../output';
import { idArg, listResult, page, pageArgs, searchText } from '../pagination';
import { PERSON_SELECT } from '../selects';

const contains = (search: string | undefined) =>
  search ? { contains: search, mode: 'insensitive' as const } : undefined;

const listTalks = defineTool({
  name: 'list_talks',
  title: 'Listar charlas',
  area: 'charlas',
  kind: 'read',
  description: `Charlas dadas en los eventos, con sus oradores, video y slides. ${UNTRUSTED_NOTE}`,
  input: z.object({
    eventId: idArg.optional(),
    search: searchText.optional().describe('Parte del título.'),
    ...page,
  }),
  handler: async ({ eventId, search, ...pagination }) => {
    const title = contains(search);
    const where = { ...(eventId && { eventId }), ...(title && { title }) };
    const [items, total] = await Promise.all([
      prisma.talk.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          videoUrl: true,
          slidesUrl: true,
          manualEventTitle: true,
          manualEventDate: true,
          event: { select: { id: true, name: true, date: true } },
          speakers: {
            orderBy: { order: 'asc' },
            select: { speakerName: true, userId: true, jobTitle: true, enterprise: true },
          },
        },
        ...pageArgs(pagination),
      }),
      prisma.talk.count({ where }),
    ]);
    return listResult(items, total, pagination.offset);
  },
});

const listTalkProposals = defineTool({
  name: 'list_talk_proposals',
  title: 'Listar propuestas de charlas',
  area: 'charlas',
  kind: 'read',
  description: `Propuestas de charla que mandaron los miembros a un evento, con su estado y los teléfonos de los oradores para coordinar. ${UNTRUSTED_NOTE}`,
  input: z.object({
    eventId: idArg.optional(),
    status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED']).optional(),
    ...page,
  }),
  handler: async ({ eventId, status, ...pagination }) => {
    const where = { ...(eventId && { eventId }), ...(status && { status }) };
    const [items, total] = await Promise.all([
      prisma.talkProposal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          createdAt: true,
          event: { select: { id: true, name: true, date: true } },
          user: { select: PERSON_SELECT },
          speakers: {
            orderBy: { order: 'asc' },
            select: {
              speakerName: true,
              speakerPhone: true,
              userId: true,
              jobTitle: true,
              enterprise: true,
              career: true,
              studyPlace: true,
            },
          },
        },
        ...pageArgs(pagination),
      }),
      prisma.talkProposal.count({ where }),
    ]);
    return listResult(items, total, pagination.offset);
  },
});

const listProjects = defineTool({
  name: 'list_projects',
  title: 'Listar proyectos',
  area: 'proyectos',
  kind: 'read',
  description: `Proyectos de la comunidad de /proyectos, con su stack y quiénes participan. ${UNTRUSTED_NOTE}`,
  input: z.object({ search: searchText.optional(), ...page }),
  handler: async ({ search, ...pagination }) => {
    const title = contains(search);
    const where = title ? { title } : {};
    const [items, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          description: true,
          url: true,
          repoUrl: true,
          techStack: true,
          isOpenSource: true,
          startYear: true,
          endYear: true,
          author: { select: PERSON_SELECT },
          members: { select: { memberName: true, role: true, userId: true } },
        },
        ...pageArgs(pagination),
      }),
      prisma.project.count({ where }),
    ]);
    return listResult(items, total, pagination.offset);
  },
});

const listAdvice = defineTool({
  name: 'list_advice',
  title: 'Listar consejos',
  area: 'consejos',
  kind: 'read',
  description: `Consejos que publicaron los miembros en /consejos, con likes y comentarios. ${UNTRUSTED_NOTE}`,
  input: z.object({
    search: searchText.optional().describe('Parte del texto.'),
    tag: z.string().max(50).optional(),
    authorId: idArg.optional(),
    ...page,
  }),
  handler: async ({ search, tag, authorId, ...pagination }) => {
    const content = contains(search);
    const where = {
      ...(content && { content }),
      ...(tag && { tags: { has: tag } }),
      ...(authorId && { authorId }),
    };
    const [items, total] = await Promise.all([
      prisma.advice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          content: true,
          tags: true,
          createdAt: true,
          author: { select: PERSON_SELECT },
          _count: { select: { likes: true, comments: true } },
        },
        ...pageArgs(pagination),
      }),
      prisma.advice.count({ where }),
    ]);
    return listResult(
      items.map((advice) => ({ ...advice, path: `/consejos/${advice.id}` })),
      total,
      pagination.offset,
    );
  },
});

const listForumPosts = defineTool({
  name: 'list_forum_posts',
  title: 'Listar temas del foro',
  area: 'foro',
  kind: 'read',
  description: `Temas del foro, del más activo al menos activo. ${UNTRUSTED_NOTE}`,
  input: z.object({
    categorySlug: z.string().max(60).optional(),
    search: searchText.optional().describe('Parte del título.'),
    ...page,
  }),
  handler: async ({ categorySlug, search, ...pagination }) => {
    const title = contains(search);
    const where = {
      ...(categorySlug && { category: { slug: categorySlug } }),
      ...(title && { title }),
    };
    const [items, total] = await Promise.all([
      prisma.forumPost.findMany({
        where,
        orderBy: [{ isPinned: 'desc' }, { activeAt: 'desc' }],
        select: {
          id: true,
          title: true,
          isPinned: true,
          isLocked: true,
          createdAt: true,
          activeAt: true,
          category: { select: { slug: true, name: true } },
          author: { select: PERSON_SELECT },
          _count: { select: { comments: true, likes: true } },
        },
        ...pageArgs(pagination),
      }),
      prisma.forumPost.count({ where }),
    ]);
    return listResult(
      items.map((post) => ({ ...post, path: `/foro/tema/${post.id}` })),
      total,
      pagination.offset,
    );
  },
});

const getForumPost = defineTool({
  name: 'get_forum_post',
  title: 'Ver un tema del foro',
  area: 'foro',
  kind: 'read',
  description: `Un tema del foro con su texto y sus respuestas. ${UNTRUSTED_NOTE}`,
  input: z.object({ id: idArg }),
  handler: async ({ id }) => {
    const post = await prisma.forumPost.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        content: true,
        isPinned: true,
        isLocked: true,
        createdAt: true,
        category: { select: { slug: true, name: true } },
        author: { select: PERSON_SELECT },
        comments: {
          orderBy: { createdAt: 'asc' },
          take: 200,
          select: {
            id: true,
            content: true,
            parentCommentId: true,
            createdAt: true,
            author: { select: PERSON_SELECT },
          },
        },
      },
    });
    if (!post) throw new ToolInputError('Tema no encontrado');
    return { ...post, path: `/foro/tema/${post.id}` };
  },
});

const listJobOffers = defineTool({
  name: 'list_job_offers',
  title: 'Listar ofertas de empleo',
  area: 'empleos',
  kind: 'read',
  description: `Ofertas de /empleos. Por defecto solo las disponibles. ${UNTRUSTED_NOTE}`,
  input: z.object({ includeClosed: z.boolean().default(false), ...page }),
  handler: async ({ includeClosed, ...pagination }) => {
    const where = includeClosed ? {} : { available: true };
    const [items, total] = await Promise.all([
      prisma.jobOffers.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          company: true,
          available: true,
          tags: true,
          location: true,
          type: true,
          modality: true,
          seniority: true,
          applyUrl: true,
          createdAt: true,
          author: { select: PERSON_SELECT },
        },
        ...pageArgs(pagination),
      }),
      prisma.jobOffers.count({ where }),
    ]);
    return listResult(items, total, pagination.offset);
  },
});

const listWorkPlaces = defineTool({
  name: 'list_work_places',
  title: 'Listar lugares para trabajar',
  area: 'lugares',
  kind: 'read',
  description: `Cafés y lugares para trabajar de /lugares, con sus puntajes de wifi, enchufes y llamadas. ${UNTRUSTED_NOTE}`,
  input: z.object({ city: z.string().max(100).optional(), ...page }),
  handler: async ({ city, ...pagination }) => {
    const where = city ? { city: { contains: city, mode: 'insensitive' as const } } : {};
    const [items, total] = await Promise.all([
      prisma.workPlace.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          city: true,
          address: true,
          googleMapsUrl: true,
          wifi: true,
          plugs: true,
          calls: true,
          foodQuality: true,
          foodVariety: true,
          notes: true,
          author: { select: PERSON_SELECT },
        },
        ...pageArgs(pagination),
      }),
      prisma.workPlace.count({ where }),
    ]);
    return listResult(items, total, pagination.offset);
  },
});

const listTestimonials = defineTool({
  name: 'list_testimonials',
  title: 'Listar testimonios',
  area: 'testimonios',
  kind: 'read',
  description: `Testimonios de los miembros sobre la comunidad. ${UNTRUSTED_NOTE}`,
  input: z.object({ featured: z.boolean().optional(), ...page }),
  handler: async ({ featured, ...pagination }) => {
    const where = featured === undefined ? {} : { featured };
    const [items, total] = await Promise.all([
      prisma.testimonial.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          body: true,
          featured: true,
          createdAt: true,
          user: { select: PERSON_SELECT },
        },
        ...pageArgs(pagination),
      }),
      prisma.testimonial.count({ where }),
    ]);
    return listResult(items, total, pagination.offset);
  },
});

const listSetups = defineTool({
  name: 'list_setups',
  title: 'Listar setups',
  area: 'setups',
  kind: 'read',
  description: `Setups (escritorios y herramientas) que compartieron los miembros. ${UNTRUSTED_NOTE}`,
  input: z.object({ ...page }),
  handler: async (pagination) => {
    const [items, total] = await Promise.all([
      prisma.setup.findMany({
        orderBy: { date: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          date: true,
          os: true,
          browser: true,
          editor: true,
          terminal: true,
          otherSoftware: true,
          author: { select: PERSON_SELECT },
          _count: { select: { likes: true } },
        },
        ...pageArgs(pagination),
      }),
      prisma.setup.count(),
    ]);
    return listResult(
      items.map((setup) => ({ ...setup, path: `/setups/${setup.id}` })),
      total,
      pagination.offset,
    );
  },
});

const listGallery = defineTool({
  name: 'list_gallery',
  title: 'Listar fotos y videos de la galería',
  area: 'galería',
  kind: 'read',
  description:
    'Fotos y videos de la galería (datos, no los archivos): de qué evento son, quién los subió, a quiénes etiquetaron y si esperan aprobación.',
  input: z.object({
    eventId: idArg.optional(),
    status: z.enum(['PENDING', 'APPROVED']).optional(),
    ...page,
  }),
  handler: async ({ eventId, status, ...pagination }) => {
    const where = { ...(eventId && { eventId }), ...(status && { status }) };
    const [items, total] = await Promise.all([
      prisma.galleryItem.findMany({
        where,
        orderBy: { takenAt: 'desc' },
        select: {
          id: true,
          kind: true,
          status: true,
          working: true,
          takenAt: true,
          description: true,
          width: true,
          height: true,
          durationSeconds: true,
          event: { select: { id: true, name: true } },
          uploadedBy: { select: PERSON_SELECT },
          tags: { select: { user: { select: PERSON_SELECT } } },
        },
        ...pageArgs(pagination),
      }),
      prisma.galleryItem.count({ where }),
    ]);
    return listResult(
      items.map(({ tags, ...item }) => ({
        ...item,
        path: `/galeria/${item.id}`,
        tagged: tags.map((tag) => tag.user),
      })),
      total,
      pagination.offset,
    );
  },
});

export const contentTools = [
  listTalks,
  listTalkProposals,
  listProjects,
  listAdvice,
  listForumPosts,
  getForumPost,
  listJobOffers,
  listWorkPlaces,
  listTestimonials,
  listSetups,
  listGallery,
];
