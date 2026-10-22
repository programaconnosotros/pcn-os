import { z } from 'zod';
import prisma from '@/lib/prisma';
import { ACTIVE_USER } from '@/lib/active-user';
import { UNTRUSTED_NOTE, defineTool } from '../define';
import { ToolInputError } from '../output';
import { idArg, listResult, page, pageArgs, searchText } from '../pagination';
import { CONTACT_SELECT, MEMBER_SELECT } from '../selects';

const searchMembers = defineTool({
  name: 'search_members',
  title: 'Buscar miembros',
  area: 'miembros',
  kind: 'read',
  sensitive: true,
  description:
    'Miembros de la comunidad, con email y teléfono, filtrados por nombre o email, rol o si son embajadores. Sin `query`, todos, del más nuevo al más viejo.',
  input: z.object({
    query: searchText.optional().describe('Parte del nombre, del email, del puesto o la empresa.'),
    role: z.enum(['ADMIN', 'REGULAR']).optional(),
    ambassadors: z.boolean().optional().describe('Solo embajadores (true) o solo no embajadores.'),
    includeInactive: z.boolean().default(false).describe('Incluir suspendidos y desactivados.'),
    ...page,
  }),
  handler: async ({ query, role, ambassadors, includeInactive, ...pagination }) => {
    const contains = query ? { contains: query, mode: 'insensitive' as const } : undefined;
    const where = {
      ...(includeInactive ? {} : ACTIVE_USER),
      ...(role && { role }),
      ...(ambassadors !== undefined && { isAmbassador: ambassadors }),
      ...(contains && {
        OR: [
          { name: contains },
          { email: contains },
          { jobTitle: contains },
          { enterprise: contains },
        ],
      }),
    };
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          ...CONTACT_SELECT,
          role: true,
          isAmbassador: true,
          countryOfOrigin: true,
          suspendedAt: true,
          deactivatedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        ...pageArgs(pagination),
      }),
      prisma.user.count({ where }),
    ]);
    return listResult(
      items.map((member) => ({ ...member, path: `/perfil/${member.id}` })),
      total,
      pagination.offset,
    );
  },
});

const getMember = defineTool({
  name: 'get_member',
  title: 'Ver un miembro',
  area: 'miembros',
  kind: 'read',
  sensitive: true,
  description: `Perfil completo de un miembro, datos de contacto incluidos: puestos, stack, lenguajes, insignias, a qué eventos fue y cuánto participó. ${UNTRUSTED_NOTE}`,
  input: z.object({ id: idArg }),
  handler: async ({ id }) => {
    const member = await prisma.user.findUnique({
      where: { id },
      select: {
        ...MEMBER_SELECT,
        positions: { orderBy: { order: 'asc' }, select: { jobTitle: true, enterprise: true } },
        stackItems: { select: { category: true, name: true } },
        languages: { select: { language: true } },
        badges: {
          select: { awardedAt: true, badge: { select: { name: true, description: true } } },
        },
        eventRegistrations: {
          where: { cancelledAt: null },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: { createdAt: true, event: { select: { id: true, name: true, date: true } } },
        },
        speakerTalks: {
          select: { talk: { select: { id: true, title: true, eventId: true } } },
        },
        _count: {
          select: {
            advice: true,
            comments: true,
            forumPosts: true,
            forumComments: true,
            testimonials: true,
            setups: true,
            recommendations: true,
            uploadedGalleryItems: true,
          },
        },
      },
    });
    if (!member) throw new ToolInputError('Miembro no encontrado');
    const { speakerTalks, languages, _count, ...profile } = member;
    return {
      ...profile,
      path: `/perfil/${member.id}`,
      languages: languages.map((language) => language.language),
      talks: speakerTalks.map((speaker) => speaker.talk),
      activity: _count,
    };
  },
});

export const memberTools = [searchMembers, getMember];
