import type { Page } from '@playwright/test';
import bcrypt from 'bcryptjs';
import { AUTH_PATH, EVENTS, PASSWORD, PROJECT } from './support/data';
import { expect, test } from './support/fixtures';
import { platformId } from './support/platform-helpers';
import { displayName } from '../../src/lib/people-names';

// Búsqueda global (⌘K / Ctrl+K, /api/search), la de /miembros y la barra `$ grep -i` de las páginas.

const ADMIN_SECTIONS = [
  'Panel',
  'Usuarios',
  'Analíticas',
  'Visitas',
  'Notificaciones',
  'Monitoreo',
  'Vínculos',
];

const searchDialog = (page: Page) => page.getByRole('dialog', { name: 'Buscar en todo el sitio' });
const searchInput = (page: Page) => page.getByRole('combobox', { name: 'Buscar en todo el sitio' });
const results = (page: Page) => page.getByRole('listbox', { name: 'Resultados' });

/** Abre el buscador con el atajo (espera a que la página hidrate para que el listener exista). */
const openWithShortcut = async (page: Page) => {
  await expect(async () => {
    await page.keyboard.press('ControlOrMeta+k');
    await expect(searchDialog(page)).toBeVisible({ timeout: 1_000 });
  }).toPass();
};

test('TC-BUS-001 Búsqueda global con ⌘K / Ctrl+K', async ({ page, request }) => {
  // Qué devuelve la API para "Meetup", para saber a dónde lleva el segundo resultado
  const api: { results: { type: string; title: string; href: string }[] } = await (
    await request.get('/api/search?q=Meetup')
  ).json();
  const events = api.results.filter((result) => result.type === 'evento');
  expect(events.length).toBeGreaterThan(1);

  await page.goto('/cursos');
  await openWithShortcut(page);
  await expect(searchInput(page)).toBeFocused();
  await expect(searchInput(page)).toHaveAttribute(
    'placeholder',
    'perfiles, eventos, conversaciones, consejos, historia…',
  );

  await searchInput(page).fill('Meetup');
  // Los resultados se agrupan por tipo: "// eventos" primero, con el evento sembrado
  await expect(results(page).getByRole('heading').first()).toHaveText(/eventos/);
  await expect(
    results(page).getByRole('option', { name: new RegExp(EVENTS.upcoming.name) }),
  ).toBeVisible();
  const options = results(page).getByRole('option');
  await expect(options.first()).toHaveAttribute('aria-selected', 'true');

  // ↓ ↓ ↑ deja elegido el segundo y ↵ lo abre
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(options.nth(2)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowUp');
  await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(options.nth(1)).toContainText(events[1].title);

  await page.keyboard.press('Enter');
  await expect(searchDialog(page)).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`${events[1].href}$`));
});

test('↑ on the first result and ↓ on the last stay put', async ({ page }) => {
  await page.goto('/');
  await openWithShortcut(page);
  await searchInput(page).fill(EVENTS.upcoming.name);
  // The full-text search also finds forum topics about "testing": the event comes first.
  const options = results(page).getByRole('option');
  const option = results(page).getByRole('option', { name: new RegExp(EVENTS.upcoming.name) });
  await expect(options.first()).toHaveAttribute('aria-selected', 'true');
  await expect(options.first()).toContainText(EVENTS.upcoming.name);
  await page.keyboard.press('ArrowUp');
  await expect(options.first()).toHaveAttribute('aria-selected', 'true');

  const count = await options.count();
  for (let i = 0; i < count; i++) await page.keyboard.press('ArrowDown');
  await expect(options.last()).toHaveAttribute('aria-selected', 'true');

  for (let i = 0; i < count; i++) await page.keyboard.press('ArrowUp');
  await expect(option).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/eventos/${EVENTS.upcoming.id}$`));
  await expect(
    page.getByRole('heading', { name: new RegExp(EVENTS.upcoming.name) }).first(),
  ).toBeVisible();
});

test('the shortcut toggles the search and Escape closes it', async ({ page }) => {
  await page.goto('/eventos');
  await openWithShortcut(page);
  await page.keyboard.press('Escape');
  await expect(searchDialog(page)).toBeHidden();

  await openWithShortcut(page);
  await page.keyboard.press('ControlOrMeta+k');
  await expect(searchDialog(page)).toBeHidden();
});

test('clicking a result navigates to it and the search starts empty next time', async ({
  page,
}) => {
  await page.goto('/');
  await openWithShortcut(page);
  await searchInput(page).fill(EVENTS.past.name);
  await results(page)
    .getByRole('option', { name: new RegExp(EVENTS.past.name) })
    .click();
  await expect(page).toHaveURL(new RegExp(`/eventos/${EVENTS.past.id}$`));

  await openWithShortcut(page);
  await expect(searchInput(page)).toHaveValue('');
});

test('an empty query lists the sections as a quick switcher', async ({ page }) => {
  await page.goto('/');
  await openWithShortcut(page);
  await expect(results(page).getByRole('heading', { name: /ir a/ })).toBeVisible();
  await results(page).getByRole('option', { name: 'Changelog', exact: true }).click();
  await expect(page).toHaveURL(/\/changelog$/);
});

test('searching a section by name finds it', async ({ page }) => {
  await page.goto('/');
  await openWithShortcut(page);
  await searchInput(page).fill('conversaciones');
  await expect(results(page).getByRole('heading', { name: /secciones/ })).toBeVisible();
  await expect(
    results(page)
      .getByRole('option', { name: /^>?\s*Conversaciones/ })
      .first(),
  ).toBeVisible();
});

test.describe('as a regular member', () => {
  test.use({ as: 'member' });

  test('TC-BUS-002 Búsqueda sin resultados y secciones de admin', async ({ page }) => {
    await page.goto('/eventos');
    await openWithShortcut(page);
    await searchInput(page).fill('zzzqqq');
    await expect(results(page).getByText('find: ‘zzzqqq’: sin resultados')).toBeVisible();
    await expect(results(page).getByRole('option')).toHaveCount(0);

    await searchInput(page).fill('');
    await expect(results(page).getByRole('heading', { name: /ir a/ })).toBeVisible();
    await expect(results(page).getByRole('option', { name: 'Eventos', exact: true })).toBeVisible();
    for (const name of ADMIN_SECTIONS) {
      await expect(results(page).getByRole('option', { name, exact: true })).toHaveCount(0);
    }

    // Buscarlas por nombre tampoco las trae (solo aparecen conversaciones que dicen "monitoreo")
    await searchInput(page).fill('monitoreo');
    await expect(searchDialog(page).getByText(/^\d+ resultados$/)).toBeVisible();
    await expect(results(page).getByRole('heading', { name: /conversaciones/ })).toBeVisible();
    await expect(results(page).getByRole('heading', { name: /secciones/ })).toHaveCount(0);
    await expect(results(page).getByRole('option', { name: 'Monitoreo', exact: true })).toHaveCount(
      0,
    );
  });
});

test.describe('as an admin', () => {
  test.use({ as: 'admin' });

  test('the quick switcher never lists admin sections, even for admins', async ({ page }) => {
    await page.goto('/');
    await openWithShortcut(page);
    await expect(results(page).getByRole('option', { name: 'Inicio', exact: true })).toBeVisible();
    for (const name of ADMIN_SECTIONS) {
      await expect(results(page).getByRole('option', { name, exact: true })).toHaveCount(0);
    }
  });
});

test('the search API groups results and ignores admin sections', async ({ request }) => {
  const response = await request.get(`/api/search?q=${encodeURIComponent(EVENTS.upcoming.name)}`);
  expect(response.ok()).toBe(true);
  const body: { query: string; results: { type: string; title: string; href: string }[] } =
    await response.json();
  expect(body.query).toBe(EVENTS.upcoming.name);
  expect(body.results[0]).toEqual(
    expect.objectContaining({
      type: 'evento',
      title: EVENTS.upcoming.name,
      href: `/eventos/${EVENTS.upcoming.id}`,
    }),
  );

  // Los proyectos externos llevan su URL absoluta
  const projects = await (
    await request.get(`/api/search?q=${encodeURIComponent(PROJECT.title)}`)
  ).json();
  expect(projects.results).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: 'proyecto',
        title: PROJECT.title,
        href: expect.stringMatching(/^https:\/\//),
      }),
    ]),
  );

  const admin = await (await request.get('/api/search?q=monitoreo')).json();
  expect(admin.results.filter((r: { href: string }) => r.href === '/monitoreo')).toEqual([]);

  // Sin query no hay resultados
  const empty = await (await request.get('/api/search?q=')).json();
  expect(empty.results).toEqual([]);
});

test('TC-BUS-003 Buscar miembros de forma tolerante', async ({ page, db }) => {
  // Una persona propia con acentos, cargo y empresa. Se crea con una contraseña de costo bajo:
  // al iniciar sesión la app la regenera, y esa escritura expira el directorio cacheado.
  const tag = platformId('bus').slice(4);
  // Como lo muestra el sitio: el tag al azar puede tener una tira de letras que pasa a mayúscula
  const name = displayName(`Agustina Sánchez Ñuñez ${tag}`);
  const user = await db.user.create({
    data: {
      email: `e2e-bus-${tag}@e2e.pcn`,
      name,
      password: await bcrypt.hash(PASSWORD, 4),
      emailVerified: true,
      countryOfOrigin: 'Argentina',
      positions: {
        create: { jobTitle: `Ingeniera de Calidad ${tag}`, enterprise: `Búsquedas ${tag} SA` },
      },
    },
  });
  await page.goto('/iniciar-sesion');
  await page.getByLabel('Correo electrónico').fill(user.email);
  await page.getByLabel('Contraseña').fill(PASSWORD);
  await page.getByRole('button', { name: /ingresar/ }).click();
  await page.waitForURL((url) => !AUTH_PATH.test(url.pathname));

  await page.goto('/miembros');
  const search = page.getByRole('textbox', { name: 'Buscar miembros' });
  const card = page.getByRole('link', { name: new RegExp(name) });

  // Otro orden, sin acentos ni mayúsculas
  await search.fill(`${tag} SANC agus nunez`);
  await expect(card.first()).toBeVisible();
  await expect(page.getByText(/^1\/\d+ miembros$/)).toBeVisible();

  // Por empresa y por cargo
  await search.fill(`busquedas ${tag}`);
  await expect(card.first()).toBeVisible();
  await expect(card.first()).toContainText(`Ingeniera de Calidad ${tag} @ Búsquedas ${tag} SA`);
  await search.fill(`calidad ingeniera ${tag}`);
  await expect(card.first()).toBeVisible();

  // Una palabra que no está en ningún dato no matchea
  await search.fill(`${tag} pepe`);
  await expect(page.getByRole('status').filter({ hasText: `grep -i "${tag} pepe"` })).toContainText(
    'Nadie coincide con la búsqueda',
  );
});

test('the members search finds seeded people by reversed name without accents', async ({
  page,
}) => {
  await page.goto('/miembros');
  const search = page.getByRole('textbox', { name: 'Buscar miembros' });
  await search.fill('garcia maria');
  await expect(page.getByRole('link', { name: /María García/ }).first()).toBeVisible();
  await search.fill('e2e miembro');
  await expect(page.getByRole('link', { name: /Miembro E2E/ }).first()).toBeVisible();
});

test('TC-BUS-004 Barra de búsqueda de las páginas', async ({ page }) => {
  await page.goto('/changelog');
  const search = page.getByRole('textbox', { name: 'Buscar cambios' });
  const counter = page.getByText(/^\d+\/\d+ cambios$/);
  const all = (await counter.textContent())!.split('/')[1];
  await expect(search).not.toBeFocused();

  await expect(async () => {
    await page.locator('body').press('/');
    await expect(search).toBeFocused({ timeout: 1_000 });
  }).toPass();
  // El / que enfoca no se escribe en el campo
  await expect(search).toHaveValue('');

  await page.keyboard.type('zzzqqq');
  await expect(search).toHaveValue('zzzqqq');
  await expect(counter).toHaveText(`0/${all}`);

  await page.keyboard.press('Escape');
  await expect(search).toHaveValue('');
  await expect(counter).toHaveText(`${all.replace(' cambios', '')}/${all}`);
});

test('typing / inside another input does not steal the focus', async ({ page }) => {
  await page.goto('/conversaciones');
  const search = page.getByRole('textbox', { name: 'Buscar conversaciones' });
  await search.fill('a/b');
  await expect(search).toHaveValue('a/b');
  await expect(search).toBeFocused();
});

test('?q= prefills the page search bar', async ({ page }) => {
  await page.goto('/changelog?q=zzzqqq');
  await expect(page.getByRole('textbox', { name: 'Buscar cambios' })).toHaveValue('zzzqqq');
  await expect(page.getByText(/^0\/\d+ cambios$/)).toBeVisible();
});
