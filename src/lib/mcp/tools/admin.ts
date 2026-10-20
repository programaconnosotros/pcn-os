import { z } from 'zod';
import prisma from '@/lib/prisma';
import { UNTRUSTED_NOTE, defineTool } from '../define';
import { listResult, page, pageArgs } from '../pagination';
import { PERSON_SELECT } from '../selects';

const MAX_STACK_LINES = 8;

/** The first lines of a stack trace: enough to place the error, without dumping the bundle. */
const shortStack = (stack: string | null) =>
  stack?.split('\n').slice(0, MAX_STACK_LINES).join('\n') ?? null;

const listSystemAlerts = defineTool({
  name: 'list_system_alerts',
  title: 'Alertas del sistema',
  area: 'admin',
  kind: 'read',
  description:
    'Alertas de la plataforma para los admins (/monitoreo). Por defecto solo las abiertas.',
  input: z.object({ includeResolved: z.boolean().default(false), ...page }),
  handler: async ({ includeResolved, ...pagination }) => {
    const where = includeResolved ? {} : { resolvedAt: null };
    const [items, total] = await Promise.all([
      prisma.systemAlert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: { id: true, kind: true, detail: true, createdAt: true, resolvedAt: true },
        ...pageArgs(pagination),
      }),
      prisma.systemAlert.count({ where }),
    ]);
    return listResult(items, total, pagination.offset);
  },
});

const listContentReports = defineTool({
  name: 'list_content_reports',
  title: 'Reportes de contenido',
  area: 'admin',
  kind: 'read',
  description: `Contenido que los miembros reportaron para moderar, con el motivo. ${UNTRUSTED_NOTE}`,
  input: z.object({
    status: z.enum(['PENDING', 'RESOLVED', 'DISMISSED']).optional(),
    ...page,
  }),
  handler: async ({ status, ...pagination }) => {
    const where = status ? { status } : {};
    const [items, total] = await Promise.all([
      prisma.contentReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          contentType: true,
          contentId: true,
          reason: true,
          details: true,
          status: true,
          createdAt: true,
          resolvedAt: true,
          reporter: { select: PERSON_SELECT },
          resolvedBy: { select: PERSON_SELECT },
        },
        ...pageArgs(pagination),
      }),
      prisma.contentReport.count({ where }),
    ]);
    return listResult(items, total, pagination.offset);
  },
});

const listErrorLogs = defineTool({
  name: 'list_error_logs',
  title: 'Errores del sitio',
  area: 'admin',
  kind: 'read',
  description:
    'Errores que registró el sitio (/monitoreo), del más nuevo al más viejo, con las primeras líneas del stack. Por defecto solo los no resueltos.',
  input: z.object({ includeResolved: z.boolean().default(false), ...page }),
  handler: async ({ includeResolved, ...pagination }) => {
    const where = includeResolved ? {} : { resolved: false };
    const [items, total] = await Promise.all([
      prisma.errorLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          message: true,
          stack: true,
          path: true,
          userId: true,
          resolved: true,
          createdAt: true,
        },
        ...pageArgs(pagination),
      }),
      prisma.errorLog.count({ where }),
    ]);
    return listResult(
      items.map((item) => ({
        ...item,
        message: item.message.slice(0, 500),
        stack: shortStack(item.stack),
      })),
      total,
      pagination.offset,
    );
  },
});

export const adminTools = [listSystemAlerts, listContentReports, listErrorLogs];
