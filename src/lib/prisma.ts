import { PrismaClient } from '@/generated/prisma/client';
import { checkCachedRead, expireModels } from '@/lib/cache';
import { pgAdapter } from '@/lib/database-url';
import { displayName } from '@/lib/people-names';
import { isDelete, modelsIn, relatedModel, type ModelName } from '@/lib/prisma-models';
import { signalWrite } from '@/lib/realtime-signals';

const WRITES = new Set([
  'create',
  'createMany',
  'createManyAndReturn',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'upsert',
  'delete',
  'deleteMany',
]);

/**
 * Hay quien escribe su nombre todo en minúsculas: el sitio lo muestra con mayúscula en cada
 * palabra larga (src/lib/people-names.ts) en todos lados, sin tocar lo guardado. Recorre lo que
 * devolvió una consulta de `model` y formatea el `name` de cada usuario, también los que vienen
 * por relaciones. Queda en objetos comunes (no en los proxies de un `result` de Prisma, que React
 * no deja pasar a componentes de cliente). El perfil edita lo que la persona escribió
 * (`typedNameOf`).
 */
const withDisplayNames = <T>(model: string, value: T): T => {
  if (!value || typeof value !== 'object' || value instanceof Date) return value;
  if (Array.isArray(value)) {
    value.forEach((item) => withDisplayNames(model, item));
    return value;
  }
  const row = value as Record<string, unknown>;
  for (const [key, child] of Object.entries(row)) {
    if (model === 'User' && key === 'name' && typeof child === 'string') {
      row.name = displayName(child);
    }
    const related = relatedModel(model, key);
    if (related) withDisplayNames(related, child);
  }
  return value;
};

const prismaClientSingleton = () => {
  // Datos sensibles que no salen de la base salvo que una consulta los pida con
  // `omit: { campo: false }`: el hash de la contraseña y el secreto y los códigos del segundo
  // factor (solo el login y su configuración) y el teléfono de los
  // oradores (solo quienes gestionan el evento), y el código de descuento de un evento (solo
  // quien tiene cuenta). Así un `include` que termina en un componente
  // de cliente o en una página pública no puede filtrarlos.
  return new PrismaClient({
    adapter: pgAdapter(process.env.DATABASE_URL),
    omit: {
      user: { password: true, twoFactorSecret: true, twoFactorRecoveryCodes: true },
      talkSpeaker: { speakerPhone: true },
      event: { discountCode: true },
      talkProposalSpeaker: { speakerPhone: true },
    },
  })
    .$extends({
      name: 'display-name',
      query: {
        $allModels: {
          async $allOperations({ model, args, query }) {
            return withDisplayNames(model, await query(args));
          },
        },
      },
    })
    .$extends({
      name: 'data-cache',
      query: {
        $allModels: {
          // Cada escritura vence las lecturas cacheadas de las tablas que tocó (incluidas las
          // escrituras anidadas y lo que se borra en cascada); ver src/lib/cache.ts.
          async $allOperations({ model, operation, args, query }) {
            if (!WRITES.has(operation)) {
              if (process.env.NODE_ENV !== 'production') checkCachedRead(modelsIn(model, args));
              return query(args);
            }
            const result = await query(args);
            expireModels(modelsIn(model, args, isDelete(operation)));
            // Open pages hear about what changed (src/lib/realtime-signals.ts).
            signalWrite(model as ModelName, operation, result);
            return result;
          },
        },
      },
    });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

/** The client inside `prisma.$transaction(async (tx) => …)`, or the client itself. */
export type TransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'
>;

/**
 * El nombre tal como lo escribió la persona, para editarlo: `user.name` llega formateado para
 * mostrar y las consultas crudas no pasan por esa extensión.
 */
export const typedNameOf = async (userId: string) => {
  const [row] = await prisma.$queryRaw<
    { name: string }[]
  >`SELECT name FROM "User" WHERE id = ${userId}`;
  return row?.name ?? '';
};

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
