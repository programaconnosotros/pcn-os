import type { Page } from '@playwright/test';
import type { PrismaClient } from '../../src/generated/prisma/client';
import { ADVICE, PROJECT, USERS } from './support/data';
import { displayName } from '../../src/lib/people-names';
import { expect as baseExpect, test } from './support/fixtures';
import {
  createUser,
  seededUserId,
  signIn,
  uniqueId,
  type CreatedUser,
} from './support/content-helpers';

// Perfil: edición (/perfil), perfil público (/perfil/[id]) y sus pestañas, badges, setups y logros.
// Los tests que cambian un perfil usan un usuario propio, nunca los sembrados.

const PREFIX = 'e2e-per';

// Casi todos inician sesión con el formulario (bcrypt) y esperan server actions: con la suite
// entera corriendo en paralelo el servidor tarda, así que cada test tiene el triple de tiempo.
test.slow();

/** Para lo que llega después de una server action (toasts, cambios guardados). */
const ACTION = { timeout: 30_000 };
// Las navegaciones también tardan con el servidor cargado
const expect = baseExpect.configure({ timeout: 20_000 });

/** Lo que se ve de la barra de completitud del formulario: `perfil.completo NN%`. */
const completeness = (page: Page) =>
  // Mientras la página termina de llegar por streaming puede haber una copia oculta: solo la visible
  page
    .getByRole('complementary')
    .getByText('perfil.completo')
    .locator('xpath=..')
    .getByText(/^\d+%$/)
    .filter({ visible: true });

/**
 * Un campo del formulario por su label. Mientras la página llega por streaming puede quedar una
 * copia oculta del formulario: se toma solo la visible.
 */
const field = (page: Page, label: string) => page.getByLabel(label).filter({ visible: true });

const saveWithKeyboard = (page: Page) => page.keyboard.press('ControlOrMeta+s');

const openOwnProfileForm = async (page: Page, user: CreatedUser) => {
  await signIn(page, user);
  await page.goto('/perfil');
  await expect(field(page, 'nombre')).toHaveValue(user.name);
};

/** Un setup cargado directo en la base: publicarlo desde la UI necesita subir la foto a S3. */
const createSetup = (db: PrismaClient, authorId: string) =>
  db.setup.create({
    data: {
      id: uniqueId(PREFIX),
      title: `Setup ${uniqueId(PREFIX)}`,
      description: 'Escritorio de prueba de la suite e2e.',
      imageUrl: 'https://example.com/e2e-setup.webp',
      thumbUrl: 'https://example.com/e2e-setup-thumb.webp',
      width: 1200,
      height: 900,
      authorId,
    },
  });

test.describe('editing my profile', () => {
  test('TC-PER-001 Editar el perfil y guardar con el teclado', async ({ page, db }) => {
    const user = await createUser(db, PREFIX);
    await openOwnProfileForm(page, user);

    // Nombre y país cargados, sin foto, slogan ni lenguajes: 2 de 5
    await expect(completeness(page)).toHaveText('40%');

    const slogan = `Slogan ${uniqueId(PREFIX)}`;
    await field(page, 'slogan').fill(slogan);
    await page.getByRole('combobox', { name: 'país' }).click();
    await page.getByRole('option', { name: 'Uruguay' }).click();
    await expect(completeness(page)).toHaveText('60%');
    await expect(page.getByRole('main').getByText('2 campos modificados')).toBeVisible();

    await saveWithKeyboard(page);
    await expect(page.getByText('Perfil actualizado correctamente')).toBeVisible(ACTION);
    await expect(page.getByRole('main').getByText('todo guardado')).toBeVisible();

    const saved = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.slogan).toBe(slogan);
    expect(saved.countryOfOrigin).toBe('Uruguay');
    // Fuera de Argentina no hay provincia
    expect(saved.province ?? '').toBe('');

    await page.goto(`/perfil/${user.id}`);
    await expect(
      page
        .getByRole('main')
        .getByRole('heading', { level: 1, name: displayName(user.name), exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('main').getByText(slogan)).toBeVisible();
    await expect(page.getByRole('main').getByText('Uruguay')).toBeVisible();

    await page.goto('/perfil');
    await expect(completeness(page)).toHaveText('60%');
  });

  test('TC-PER-002 Validaciones del perfil', async ({ page, db }) => {
    const user = await createUser(db, PREFIX);
    await openOwnProfileForm(page, user);

    await field(page, 'nombre').fill('ab');
    await field(page, 'linkedin').fill('linkedin');
    await saveWithKeyboard(page);

    await expect(
      page.getByRole('main').getByText('El nombre debe tener al menos 3 caracteres'),
    ).toBeVisible();
    await expect(page.getByRole('main').getByText('La URL debe ser válida')).toBeVisible();
    await expect(page.getByText('Perfil actualizado correctamente')).toBeHidden();

    // Hasta 5 puestos: con 5 cargados ya no se ofrece agregar otro
    const addPosition = page.getByRole('button', { name: 'agregar puesto' });
    for (let count = 2; count <= 5; count++) {
      await addPosition.click();
      await expect(field(page, `Cargo del puesto ${count}`)).toBeVisible();
    }
    await expect(addPosition).toBeHidden();
    await expect(field(page, 'Cargo del puesto 6')).toHaveCount(0);

    const saved = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.name).toBe(user.name);
    expect(saved.linkedinUrl).toBeNull();
  });

  test('saves work positions and studies, and shows them on the public profile', async ({
    page,
    db,
  }) => {
    const user = await createUser(db, PREFIX);
    await openOwnProfileForm(page, user);

    await field(page, 'Cargo del puesto 1').fill('Desarrolladora Frontend');
    await field(page, 'Empresa del puesto 1').fill('Empresa E2E');
    await page.getByRole('button', { name: 'agregar puesto' }).click();
    await field(page, 'Cargo del puesto 2').fill('Mentora');
    await field(page, 'carrera').fill('Ingeniería en Sistemas');
    await field(page, 'institución').fill('UTN');
    await field(page, 'github').fill('https://github.com/e2e-per');
    await page.getByRole('button', { name: 'guardarCambios();' }).click();
    await expect(page.getByText('Perfil actualizado correctamente')).toBeVisible(ACTION);

    const positions = await db.userPosition.findMany({
      where: { userId: user.id },
      orderBy: { order: 'asc' },
    });
    expect(positions.map((p) => [p.jobTitle, p.enterprise])).toEqual([
      ['Desarrolladora Frontend', 'Empresa E2E'],
      ['Mentora', null],
    ]);
    const saved = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.jobTitle).toBe('Desarrolladora Frontend');

    await page.goto(`/perfil/${user.id}`);
    await expect(page.getByRole('main').getByText('Desarrolladora Frontend')).toBeVisible();
    await expect(page.getByRole('main').getByText('Empresa E2E')).toBeVisible();
    await expect(page.getByRole('main').getByText('Ingeniería en Sistemas')).toBeVisible();
    await expect(
      page.getByRole('link', { name: `Perfil de GitHub de ${user.name}` }),
    ).toHaveAttribute('href', 'https://github.com/e2e-per');
  });

  test('the email cannot be edited from the profile form', async ({ page, db }) => {
    const user = await createUser(db, PREFIX);
    await openOwnProfileForm(page, user);

    const email = field(page, 'email');
    await expect(email).toHaveValue(user.email);
    await expect(email).toHaveAttribute('readonly', '');
  });

  test('TC-PER-003 Foto de perfil (archivo demasiado grande)', async ({ page, db }) => {
    const user = await createUser(db, PREFIX);
    await openOwnProfileForm(page, user);

    // El tope del avatar es 5 MB (el caso manual dice 10 MB, que es el default del componente).
    // Se valida en el navegador antes de pedir la subida a S3.
    await page
      .getByRole('main')
      .locator('input[type="file"]')
      .setInputFiles({
        name: 'enorme.png',
        mimeType: 'image/png',
        buffer: Buffer.alloc(6 * 1024 * 1024),
      });
    await expect(
      page.getByRole('main').getByText('El archivo es demasiado grande. Máximo 5MB'),
    ).toBeVisible();
  });

  test('TC-PER-003 Foto de perfil (tipo no permitido)', async ({ page, db }) => {
    const user = await createUser(db, PREFIX);
    await openOwnProfileForm(page, user);

    await page
      .getByRole('main')
      .locator('input[type="file"]')
      .setInputFiles({
        name: 'cv.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4 e2e'),
      });
    await expect(page.getByRole('main').getByText(/Tipo de archivo no permitido/)).toBeVisible({
      timeout: 5_000,
    });
  });
});

test.describe('anonymous visitors', () => {
  test('TC-PER-004 /perfil sin sesión', async ({ page }) => {
    await page.goto('/perfil');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('button', { name: 'guardarCambios();' })).toHaveCount(0);
    await expect(field(page, 'slogan')).toHaveCount(0);
  });

  test('do not see contact details on a public profile', async ({ page, db }) => {
    const memberId = await seededUserId(db, 'member');
    await page.goto(`/perfil/${memberId}`);
    await expect(
      page
        .getByRole('main')
        .getByRole('heading', { level: 1, name: USERS.member.name, exact: true }),
    ).toBeVisible();
    await expect(page.getByText(USERS.member.email)).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'editar perfil' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'otorgar' })).toHaveCount(0);
  });
});

test.describe('public profile as another member', () => {
  test.use({ as: 'organizer' });

  test('TC-PER-005 Perfil público y sus pestañas', async ({ page, db }) => {
    const memberId = await seededUserId(db, 'member');
    await page.goto(`/perfil/${memberId}`);
    await expect(
      page
        .getByRole('main')
        .getByRole('heading', { level: 1, name: USERS.member.name, exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'editar perfil' })).toHaveCount(0);
    // Con sesión se ve el contacto
    await expect(page.getByRole('link', { name: USERS.member.email })).toBeVisible();

    const main = page.getByRole('main');
    const tabs = page.getByRole('navigation', { name: 'Secciones del perfil' });
    const checks: [label: RegExp, tab: string, content: string | null][] = [
      [/^proyectos/, 'proyectos', PROJECT.title],
      [/^consejos/, 'consejos', ADVICE.content],
      [/^charlas/, 'charlas', 'Charla E2E sobre Playwright'],
      [/^eventos/, 'eventos', 'Miembro todavía no organizó ningún evento.'],
      // La galería depende de en qué fotos lo etiqueten otros specs
      [/^galería/, 'fotos', null],
      [
        /^contribuciones/,
        'contribuciones',
        'Todavía no vinculamos a Miembro con una cuenta que contribuyó al sitio.',
      ],
    ];
    for (const [label, tab, content] of checks) {
      const link = tabs.getByRole('link', { name: label });
      await link.click();
      await expect(page).toHaveURL(new RegExp(`/perfil/${memberId}\\?tab=${tab}$`));
      await expect(link).toHaveAttribute('aria-current', 'page');
      if (content) await expect(main.getByText(content).first()).toBeVisible();
    }

    // Una pestaña abierta directo desde la URL
    await page.goto(`/perfil/${memberId}?tab=consejos`);
    await expect(tabs.getByRole('link', { name: /^consejos/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    // The news ticker keeps copies of the same text: the card comes first.
    await expect(page.getByRole('main').getByText(ADVICE.content).first()).toBeVisible();

    await page.goto('/perfil/no-existe');
    await expect(page).toHaveTitle(/^404/);
    await expect(
      page.getByRole('main').getByText('bash: cd: /perfil/no-existe: No such file or directory'),
    ).toBeVisible();
  });

  test('an unknown tab falls back to the overview', async ({ page, db }) => {
    const memberId = await seededUserId(db, 'member');
    await page.goto(`/perfil/${memberId}?tab=no-existe`);
    await expect(
      page
        .getByRole('navigation', { name: 'Secciones del perfil' })
        .getByRole('link', { name: /^resumen/ }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('regular members cannot award badges', async ({ page, db }) => {
    const memberId = await seededUserId(db, 'member');
    await page.goto(`/perfil/${memberId}`);
    await expect(
      page
        .getByRole('main')
        .getByRole('heading', { level: 1, name: USERS.member.name, exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'otorgar' })).toHaveCount(0);
  });
});

test.describe('my own public profile', () => {
  test.use({ as: 'member' });

  test('shows the edit link that leads to /perfil', async ({ page, db }) => {
    const memberId = await seededUserId(db, 'member');
    await page.goto(`/perfil/${memberId}`);
    await page.getByRole('link', { name: 'editar perfil' }).click();
    await expect(page).toHaveURL(/\/perfil$/);
    await expect(field(page, 'email')).toHaveValue(USERS.member.email);
  });
});

test.describe('custom badges', () => {
  test.use({ as: 'admin' });

  test('TC-PER-006 Badges personalizados', async ({ page, db }) => {
    const target = await createUser(db, PREFIX);
    const name = `Badge ${uniqueId('per').slice(-6)}`;
    try {
      await page.goto(`/perfil/${target.id}`);
      await expect(page.getByRole('main').getByText('Todavía no tiene badges.')).toBeVisible();
      await page.getByRole('button', { name: 'otorgar' }).click();

      const dialog = page.getByRole('dialog');
      const create = dialog.getByRole('button', { name: 'crearYOtorgar();' });
      // Con un solo carácter el formulario no deja crearlo (el server respondería "El nombre es
      // muy corto", pero la UI ya bloquea el botón)
      await dialog.getByPlaceholder('Nombre (ej: Bug Hunter)').fill('X');
      await dialog
        .getByPlaceholder(/Por qué se lo ganan/)
        .fill('Por encontrar bugs en la suite e2e.');
      await expect(create).toBeDisabled();

      await dialog.getByPlaceholder('Nombre (ej: Bug Hunter)').fill(name);
      await dialog.getByRole('button', { name: 'bug' }).click();
      await expect(create).toBeEnabled();
      await create.click();

      await expect(page.getByText(`${target.name} ganó "${name}"`)).toBeVisible(ACTION);
      await expect(dialog).toBeHidden();
      const revoke = page.getByRole('button', { name: `Quitar el badge ${name}` });
      await expect(revoke).toBeVisible();
      await expect(page.getByRole('main').getByText(name, { exact: true })).toBeVisible();

      const badge = await db.badge.findFirstOrThrow({ where: { name } });
      expect(badge.icon).toBe('bug');
      expect(await db.userBadge.count({ where: { badgeId: badge.id, userId: target.id } })).toBe(1);

      await revoke.click();
      await expect(page.getByText(`Badge "${name}" quitado`)).toBeVisible(ACTION);
      await expect(revoke).toBeHidden();
      await expect(page.getByRole('main').getByText('Todavía no tiene badges.')).toBeVisible();
      expect(await db.userBadge.count({ where: { badgeId: badge.id } })).toBe(0);
    } finally {
      await db.badge.deleteMany({ where: { name } });
    }
  });
});

test.describe('setups', () => {
  test('TC-PER-007 Publicar un setup y darle like (like y permisos)', async ({ page, db }) => {
    // Publicar el setup necesita subir la foto a S3: se carga en la base y se prueba el resto
    const author = await createUser(db, PREFIX);
    const other = await createUser(db, PREFIX);
    const setup = await createSetup(db, author.id);

    await signIn(page, other);
    await page.goto(`/setups/${setup.id}`);
    await expect(page.getByRole('main').getByText(setup.description)).toBeVisible();

    const like = page.getByRole('button', { name: /Me gusta/ });
    await expect(like).toHaveAttribute('aria-pressed', 'false');
    await like.click();
    await expect(like).toHaveAttribute('aria-pressed', 'true');
    await expect(like).toHaveText(/1/);
    await expect
      .poll(() => db.setupLike.count({ where: { setupId: setup.id, userId: other.id } }))
      .toBe(1);

    await expect(like).toBeEnabled();
    await like.click();
    await expect(like).toHaveAttribute('aria-pressed', 'false');
    await expect(like).toHaveText(/0/);
    await expect.poll(() => db.setupLike.count({ where: { setupId: setup.id } })).toBe(0);

    // Quien no lo publicó no puede editarlo ni eliminarlo
    await expect(page.getByRole('button', { name: 'editar' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'eliminar' })).toHaveCount(0);
  });

  test('the author can edit and delete their setup', async ({ page, db }) => {
    const author = await createUser(db, PREFIX);
    const setup = await createSetup(db, author.id);
    await signIn(page, author);
    await page.goto(`/setups/${setup.id}`);

    await expect(page.getByRole('button', { name: 'editar' })).toBeVisible();
    await page.getByRole('button', { name: 'eliminar' }).click();
    await expect(page.getByRole('alertdialog', { name: '¿Eliminar este setup?' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('alertdialog')).toBeHidden();
    expect(await db.setup.count({ where: { id: setup.id } })).toBe(1);
  });

  test('anonymous visitors are sent to log in to like a setup', async ({ page, db }) => {
    const author = await createUser(db, PREFIX);
    const setup = await createSetup(db, author.id);
    await page.goto(`/setups/${setup.id}`);

    const like = page.getByRole('link', { name: /Me gusta/ });
    await expect(like).toHaveAttribute('href', `/iniciar-sesion?redirect=/setups/${setup.id}`);
    await expect(page.getByRole('button', { name: 'eliminar' })).toHaveCount(0);
    await like.click();
    await expect(page).toHaveURL(/\/iniciar-sesion\?redirect=/);
  });
});

test.describe('achievements', () => {
  test('TC-PER-008 Logros calculados', async ({ page, db }) => {
    const user = await createUser(db, PREFIX);
    const DAY = 86_400_000;
    const admin = await seededUserId(db, 'admin');

    // 10 eventos pasados con la inscripción del usuario (Habitué) y una charla dada (Speaker).
    // Fechas lejanas para no aparecer entre los eventos recientes de otros specs.
    for (let i = 0; i < 10; i++) {
      await db.event.create({
        data: {
          id: uniqueId(PREFIX),
          name: `Evento logros ${PREFIX} ${i}`,
          description: 'Evento pasado para calcular logros.',
          date: new Date(Date.UTC(2001, 0, 1) + i * DAY),
          isOnline: true,
          createdById: admin,
          registrations: { create: { userId: user.id } },
        },
      });
    }
    const giveTalk = (speaker: CreatedUser) =>
      db.talk.create({
        data: {
          title: `Charla logros ${uniqueId(PREFIX)}`,
          description: 'Una charla para el logro Speaker.',
          manualEventTitle: 'Meetup externa',
          speakers: {
            create: {
              speakerName: speaker.name,
              speakerPhone: '+5493510000001',
              userId: speaker.id,
            },
          },
        },
      });
    await giveTalk(user);
    // Alguien con más charlas: si no, empataría el primer puesto y "Top speaker" reemplaza a Speaker
    const rival = await createUser(db, PREFIX);
    await giveTalk(rival);
    await giveTalk(rival);

    await page.goto(`/perfil/${user.id}`);
    const badges = page
      .getByRole('main')
      .getByRole('heading', { name: /badges/ })
      .locator('xpath=../..');
    await expect(badges.getByText('Habitué', { exact: true })).toBeVisible();
    await expect(badges.getByText('Speaker', { exact: true })).toBeVisible();
    for (const missing of ['Organizador', 'Builder', 'Lector', 'Contributor']) {
      await expect(badges.getByText(missing, { exact: true })).toHaveCount(0);
    }

    // /logros se cachea entero: guardar el perfil (una escritura en User desde la app) lo renueva
    await signIn(page, user);
    await page.goto('/perfil');
    await field(page, 'slogan').fill('Voy a todos los eventos');
    await saveWithKeyboard(page);
    await expect(page.getByText('Perfil actualizado correctamente')).toBeVisible(ACTION);

    await page.goto('/logros');
    await expect(page.getByRole('main').getByText(/Desbloqueaste\s+2\/\d+\s+logros/)).toBeVisible();

    const row = (name: string) =>
      page
        .getByRole('main')
        .getByRole('article')
        .filter({ has: page.getByRole('heading', { name, exact: true }) });
    for (const name of ['Habitué', 'Speaker']) {
      await expect(row(name).getByText('tuyo')).toBeVisible();
      // Entre quienes lo tienen (puede quedar plegado en "+N más" si ya hay muchos)
      await expect(row(name).getByTitle(user.name)).toHaveCount(1);
    }
    // Para lo que le falta, la barra de progreso
    await expect(row('Espectador').getByRole('progressbar')).toHaveAttribute('aria-valuemax', '25');
    await expect(row('Espectador').getByRole('img', { name: 'Bloqueado' })).toBeVisible();
    await expect(row('Builder').getByText('tuyo')).toHaveCount(0);
  });

  test('/logros invites anonymous visitors to log in', async ({ page }) => {
    await page.goto('/logros');
    await expect(
      page
        .getByRole('main')
        .getByText('Participá en la comunidad y desbloqueá badges para tu perfil.'),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'iniciá sesión' })).toHaveAttribute(
      'href',
      '/iniciar-sesion',
    );
    await expect(page.getByRole('progressbar')).toHaveCount(0);
  });
});
