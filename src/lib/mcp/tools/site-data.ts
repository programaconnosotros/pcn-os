import { z } from 'zod';
import prisma from '@/lib/prisma';
import { changelog } from '@/data/changelog';
import { faqs } from '@/data/faqs';
import { conversations } from '@/data/whatsapp-conversations';
import { getCommunityStats } from '@/lib/community-stats';
import { normalizeSearchText } from '@/lib/search/search-index';
import { fullTextQuery, searchAdvice, searchForumPosts } from '@/lib/search/full-text';
import { UNTRUSTED_NOTE, defineTool } from '../define';
import { listResult, page, searchText } from '../pagination';
import { PERSON_SELECT } from '../selects';

const matches = (needle: string | undefined, ...haystack: (string | undefined)[]) =>
  !needle || normalizeSearchText(haystack.join(' ')).includes(normalizeSearchText(needle));

const searchConversations = defineTool({
  name: 'search_conversations',
  title: 'Buscar conversaciones del grupo',
  area: 'conversaciones',
  kind: 'read',
  description: `Resúmenes de las conversaciones del grupo de WhatsApp de la comunidad (/conversaciones), del más nuevo al más viejo. ${UNTRUSTED_NOTE}`,
  input: z.object({
    query: searchText.optional().describe('Palabras del título, el resumen o un participante.'),
    from: z.iso.date().optional().describe('Desde esta fecha (YYYY-MM-DD).'),
    to: z.iso.date().optional().describe('Hasta esta fecha (YYYY-MM-DD).'),
    ...page,
  }),
  handler: async ({ query, from, to, limit, offset }) => {
    const found = conversations
      .filter(
        (conversation) => (!from || conversation.date >= from) && (!to || conversation.date <= to),
      )
      .filter((conversation) =>
        matches(
          query,
          conversation.title,
          conversation.summary,
          conversation.participants.join(' '),
        ),
      )
      .sort((a, b) => b.date.localeCompare(a.date));
    return listResult(found.slice(offset, offset + limit), found.length, offset);
  },
});

const getFaqs = defineTool({
  name: 'get_faqs',
  title: 'Preguntas frecuentes',
  area: 'comunidad',
  kind: 'read',
  description:
    'Las preguntas frecuentes sobre la comunidad, como aparecen en /preguntas-frecuentes.',
  input: z.object({}),
  handler: async () => faqs.map(({ question, answer }) => ({ question, answer })),
});

const getChangelog = defineTool({
  name: 'get_changelog',
  title: 'Novedades del sitio',
  area: 'comunidad',
  kind: 'read',
  description:
    'Lo que se fue agregando al sitio (/changelog), lo de admins incluido, del más nuevo al más viejo.',
  input: z.object({ area: z.string().max(60).optional(), ...page }),
  handler: async ({ area, limit, offset }) => {
    const entries = changelog
      .filter((entry) => !area || entry.area === area)
      .sort((a, b) => b.date.localeCompare(a.date));
    return listResult(entries.slice(offset, offset + limit), entries.length, offset);
  },
});

const getStats = defineTool({
  name: 'get_community_stats',
  title: 'Estadísticas de la comunidad',
  area: 'comunidad',
  kind: 'read',
  description:
    'Números de la comunidad: miembros activos, de dónde son, qué sistemas, editores, lenguajes y especialidades usan, y cuántos eventos, charlas y consejos hay.',
  input: z.object({}),
  handler: async () => {
    const [profiles, events, talks, advice, forumPosts, recommendations] = await Promise.all([
      getCommunityStats(),
      prisma.event.count({ where: { deletedAt: null } }),
      prisma.talk.count(),
      prisma.advice.count(),
      prisma.forumPost.count(),
      prisma.recommendation.groupBy({ by: ['kind', 'status'], _count: { _all: true } }),
    ]);
    return {
      profiles,
      totals: { events, talks, advice, forumPosts },
      recommendations: recommendations.map((row) => ({
        kind: row.kind,
        status: row.status,
        count: row._count._all,
      })),
    };
  },
});

const searchSite = defineTool({
  name: 'search_site',
  title: 'Buscar en el sitio',
  area: 'comunidad',
  kind: 'read',
  description: `Búsqueda de texto completo (tolera errores de tipeo) en consejos y temas del foro, más eventos y miembros por nombre. ${UNTRUSTED_NOTE}`,
  input: z.object({ query: searchText }),
  handler: async ({ query }) => {
    const fullText = fullTextQuery(query);
    const name = { contains: query, mode: 'insensitive' as const };
    const [advice, forumPosts, events, members] = await Promise.all([
      fullText ? searchAdvice(fullText) : [],
      fullText ? searchForumPosts(fullText) : [],
      prisma.event.findMany({
        where: { deletedAt: null, name },
        orderBy: { date: 'desc' },
        take: 10,
        select: { id: true, name: true, date: true },
      }),
      prisma.user.findMany({ where: { name }, take: 10, select: PERSON_SELECT }),
    ]);
    return {
      advice: advice.slice(0, 10),
      forumPosts: forumPosts.slice(0, 10),
      events,
      members,
    };
  },
});

export const siteDataTools = [searchSite, searchConversations, getFaqs, getChangelog, getStats];
