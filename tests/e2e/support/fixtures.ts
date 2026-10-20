import { test as base, expect, type Page } from '@playwright/test';
import { PrismaClient } from '../../../src/generated/prisma/client';
import { pgAdapter } from '../../../src/lib/database-url';
import { e2eDatabaseUrl } from './env';
import { PASSWORD, storageStatePath, USERS, type Role, type SignedInRole } from './data';

export { expect };

/** Modo de PCN OS para el test. Por defecto `classic`: el sitio sin escritorio ni ventanas. */
export type OsMode = 'classic' | 'lite' | 'full';

let prisma: PrismaClient | undefined;
const database = () => (prisma ??= new PrismaClient({ adapter: pgAdapter(e2eDatabaseUrl()) }));

/**
 * Una IP de documentación (198.18.0.0/15) distinta por test. Sin proxy adelante, el servidor toma la
 * última entrada de `x-forwarded-for` como IP del cliente, así cada test tiene sus propios rate
 * limits (login, registro, códigos) en vez de compartir los de 127.0.0.1 con toda la suite.
 */
const ipFor = (seed: string) => {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return `198.${18 + (hash & 1)}.${(hash >> 8) & 255}.${(hash >> 16) & 255}`;
};

type Fixtures = {
  /** La IP con la que el servidor ve los requests de este test (ver `ipFor`). */
  clientIp: string;
  /** Sesión con la que arranca el test: un rol con storage state, o `null` para anónimo. */
  as: SignedInRole | null;
  osMode: OsMode;
  /** Prisma contra la base e2e, para preparar datos o verificar lo que guardó la app. */
  db: PrismaClient;
};

export const test = base.extend<Fixtures>({
  as: [null, { option: true }],
  clientIp: async ({}, use, testInfo) => {
    await use(ipFor(`${testInfo.testId}-${testInfo.retry}`));
  },
  extraHTTPHeaders: async ({ extraHTTPHeaders, clientIp }, use) => {
    await use({ ...extraHTTPHeaders, 'x-forwarded-for': clientIp });
  },
  // extraHTTPHeaders goes out with every request, third-party ones included: a YouTube embed then
  // sends `x-forwarded-for` on its own CORS requests (fonts), they fail, and its FontFace throws
  // "A network error occurred." in the page now and then. Only the site gets the header.
  context: async ({ context, baseURL }, use) => {
    const site = new URL(baseURL!).origin;
    await context.route(
      (url) => url.origin !== site && url.protocol.startsWith('http'),
      (route) => {
        const headers = { ...route.request().headers() };
        delete headers['x-forwarded-for'];
        return route.fallback({ headers });
      },
    );
    await use(context);
  },
  osMode: ['classic', { option: true }],
  storageState: async ({ as }, use) => {
    await use(as ? storageStatePath(as) : { cookies: [], origins: [] });
  },
  page: async ({ page, osMode }, use) => {
    await page.addInitScript((mode) => {
      try {
        localStorage.setItem('pcn-os-mode', mode);
      } catch {}
    }, osMode);
    await use(page);
  },
  db: async ({}, use) => {
    await use(database());
  },
});

/** Inicia sesión desde el formulario. Para tests de login; el resto usa `test.use({ as })`. */
export const signInThroughForm = async (page: Page, role: Role, password = PASSWORD) => {
  await page.goto('/iniciar-sesion');
  await page.getByLabel('Correo electrónico').fill(USERS[role].email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: /ingresar/ }).click();
};

/** El último código de verificación de email que se generó para `email`. */
export const latestVerificationCode = async (db: PrismaClient, email: string) => {
  const token = await db.emailVerificationToken.findFirst({
    where: { email },
    orderBy: { createdAt: 'desc' },
  });
  if (!token) throw new Error(`No hay código de verificación para ${email}`);
  return token.code;
};

/** El último código de recuperación de contraseña de `email`. */
export const latestResetCode = async (db: PrismaClient, email: string) => {
  const token = await db.passwordResetToken.findFirst({
    where: { email },
    orderBy: { createdAt: 'desc' },
  });
  if (!token) throw new Error(`No hay código de recuperación para ${email}`);
  return token.code;
};
