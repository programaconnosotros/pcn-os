import { z } from 'zod';
import prisma from '@/lib/prisma';
import { submitRecommendation } from '@/actions/recommendations/submit-recommendation';
import {
  approveRecommendation,
  rejectRecommendation,
  updateRecommendation,
} from '@/actions/recommendations/review-recommendations';
import type { ActionResult } from '@/actions/recommendations/recommendation-store';
import {
  ADMIN_FIELDS,
  RECOMMENDATION_KINDS,
  SUBMIT_FIELDS,
  toRecommendationForm,
  type RecommendationKindValue,
} from '@/schemas/recommendation-schema';
import { UNTRUSTED_NOTE, defineTool } from '../define';
import { ToolInputError } from '../output';
import { idArg, listResult, page, pageArgs, searchText } from '../pagination';
import { PERSON_SELECT } from '../selects';

const KIND_HELP =
  'VIDEO (de YouTube, también charlas: isTalk=true), ARTICLE (artículo o lectura), BOOK, COURSE, SERIES (serie o película) o INFLUENCER (referente: su canal o perfil en url).';

/** The recommendation form's fields, as plain text like the form sends them. */
const recommendationFields = {
  url: z.string().max(500).optional().describe('Link. Para VIDEO, el de YouTube (obligatorio).'),
  title: z.string().max(200).optional(),
  author: z.string().max(200).optional().describe('Quién lo escribió, dicta o presenta.'),
  coauthors: z.string().max(300).optional().describe('Coautores, separados por coma.'),
  source: z.string().max(100).optional().describe('Sitio del artículo, canal, "Serie"/"Película".'),
  categories: z.string().max(200).optional().describe('Categorías separadas por coma.'),
  language: z.enum(['es', 'en']).optional(),
  publishedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe('YYYY-MM-DD.'),
  year: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  imageUrl: z.string().max(500).optional(),
  isbn: z.string().max(17).optional(),
  duration: z.string().max(12).optional().describe('Duración de un video: 34:31 o 1:02:03.'),
  hours: z.string().max(3).optional().describe('Horas de un curso.'),
  youtubeUrls: z.string().max(3000).optional().describe('Videos de un curso, uno por línea.'),
  description: z.string().max(1000).optional(),
  isTalk: z.boolean().optional().describe('El video es una charla.'),
  isMadeByCommunity: z.boolean().optional(),
  acceptDonations: z.boolean().optional(),
  note: z.string().max(500).optional().describe('Nota interna para los admins.'),
};

const RECOMMENDATION_SELECT = {
  id: true,
  kind: true,
  status: true,
  slug: true,
  title: true,
  description: true,
  url: true,
  author: true,
  coauthors: true,
  source: true,
  categories: true,
  language: true,
  publishedAt: true,
  year: true,
  imageUrl: true,
  isbn: true,
  durationSeconds: true,
  hours: true,
  youtubeUrls: true,
  isTalk: true,
  isMadeByCommunity: true,
  acceptDonations: true,
  position: true,
  note: true,
  reviewedAt: true,
  createdAt: true,
  submittedBy: { select: PERSON_SELECT },
  reviewedBy: { select: PERSON_SELECT },
} as const;

const unwrap = <T extends object>(result: ActionResult<T>) => {
  if (!result.success) throw new ToolInputError(result.error);
  return result;
};

const definedOnly = (values: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));

/**
 * The fields given, failing on any the kind doesn't use: the form would silently drop them, and
 * Claude would believe it saved something it didn't.
 */
const fieldsFor = (kind: RecommendationKindValue, values: Record<string, unknown>) => {
  const fields = definedOnly(values);
  const allowed = new Set<string>([...SUBMIT_FIELDS[kind], ...ADMIN_FIELDS[kind]]);
  const unused = Object.keys(fields).filter((field) => !allowed.has(field));
  if (unused.length) {
    throw new ToolInputError(
      `${kind} no usa ${unused.join(', ')}. Campos de ${kind}: ${[...allowed].join(', ')}.`,
    );
  }
  return fields;
};

const listRecommendations = defineTool({
  name: 'list_recommendations',
  title: 'Listar recomendaciones',
  area: 'recomendaciones',
  kind: 'read',
  description: `Videos, charlas, artículos, libros, cursos, series y referentes recomendados, con su estado (PENDING espera revisión, APPROVED se muestra, REJECTED no). ${UNTRUSTED_NOTE}`,
  input: z.object({
    kind: z.enum(RECOMMENDATION_KINDS).optional().describe(KIND_HELP),
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    search: searchText.optional().describe('Parte del título o del autor.'),
    ...page,
  }),
  handler: async ({ kind, status, search, ...pagination }) => {
    const contains = search ? { contains: search, mode: 'insensitive' as const } : undefined;
    const where = {
      ...(kind && { kind }),
      ...(status && { status }),
      ...(contains && { OR: [{ title: contains }, { author: contains }] }),
    };
    const [items, total] = await Promise.all([
      prisma.recommendation.findMany({
        where,
        select: RECOMMENDATION_SELECT,
        orderBy: { createdAt: 'desc' },
        ...pageArgs(pagination),
      }),
      prisma.recommendation.count({ where }),
    ]);
    return listResult(items, total, pagination.offset);
  },
});

const recommend = defineTool({
  name: 'recommend',
  title: 'Recomendar',
  area: 'recomendaciones',
  kind: 'write',
  description: `Agrega una recomendación a la lista pública, ya aprobada (la hace un admin). Tipos: ${KIND_HELP} Un video completa canal, duración y fecha desde YouTube. Si falta algo que la lista muestra, dice qué.`,
  input: z.object({ kind: z.enum(RECOMMENDATION_KINDS), ...recommendationFields }),
  handler: async ({ kind, ...fields }) => {
    const result = unwrap(await submitRecommendation(kind, fieldsFor(kind, fields)));
    return { kind, status: result.status };
  },
});

const updateRecommendationTool = defineTool({
  name: 'update_recommendation',
  title: 'Editar una recomendación',
  area: 'recomendaciones',
  kind: 'write',
  description:
    'Corrige o completa una recomendación con los campos que le pases; el resto queda igual. El video de una recomendación de YouTube no se puede cambiar.',
  input: z.object({ id: idArg, ...recommendationFields }),
  handler: async ({ id, ...changes }) => {
    const item = await prisma.recommendation.findUnique({ where: { id } });
    if (!item) throw new ToolInputError('Recomendación no encontrada');
    const defined = fieldsFor(item.kind, changes);
    unwrap(await updateRecommendation(id, { ...toRecommendationForm(item), ...defined }));
    return { id, updated: Object.keys(defined) };
  },
});

const approve = defineTool({
  name: 'approve_recommendation',
  title: 'Aprobar una recomendación',
  area: 'recomendaciones',
  kind: 'write',
  description: 'Publica una recomendación pendiente (o una rechazada antes).',
  input: z.object({ id: idArg }),
  handler: async ({ id }) => {
    unwrap(await approveRecommendation(id));
    return { id, status: 'APPROVED' };
  },
});

const reject = defineTool({
  name: 'reject_recommendation',
  title: 'Rechazar una recomendación',
  area: 'recomendaciones',
  kind: 'write',
  destructive: true,
  description: 'Rechaza una recomendación: deja de mostrarse y nadie la puede volver a mandar.',
  input: z.object({ id: idArg }),
  handler: async ({ id }) => {
    unwrap(await rejectRecommendation(id));
    return { id, status: 'REJECTED' };
  },
});

export const recommendationTools = [
  listRecommendations,
  recommend,
  updateRecommendationTool,
  approve,
  reject,
];
