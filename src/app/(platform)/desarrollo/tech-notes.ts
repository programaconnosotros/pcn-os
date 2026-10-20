// Theory notes on the website's stack, rendered by `TechNotes` on /desarrollo.
//
// Every example is a real (sometimes trimmed) excerpt of this repo, with the path it comes
// from so people can go read the whole file. Lines elided from an excerpt are marked with
// `// …`. When you change one of these files in a way that breaks an excerpt, update it here.
//
// Inline code in prose goes between backticks: `TechNotes` renders it as <code>.

export type TechExample = {
  /** Path relative to the repo root, e.g. `src/lib/prisma.ts`. */
  file: string;
  /** Language label shown in the header of the code block. */
  lang: string;
  /** What to look at in this excerpt. */
  caption?: string;
  code: string;
};

export type TechNote = {
  /** Anchor id (`#nota-<id>`). */
  id: string;
  name: string;
  /** One-line summary shown while the note is collapsed. */
  tagline: string;
  /** "Qué es": the theory, independent from this project. */
  what: string;
  concepts: { term: string; detail: string }[];
  /** "Cómo lo usamos acá": paragraphs about this repo. */
  usage: string[];
  examples: TechExample[];
  /** Official docs of the technology. */
  docsUrl?: string;
  /** Folder of this repo where the note's code lives (for notes about the site's own modules). */
  sourcePath?: string;
};

export type TechNoteGroup = {
  id: string;
  title: string;
  notes: TechNote[];
};

export const techNoteGroups: TechNoteGroup[] = [
  {
    id: 'framework',
    title: 'framework',
    notes: [
      {
        id: 'nextjs-app-router',
        name: 'Next.js · App Router',
        tagline: 'el sistema de archivos es el router',
        what: 'Next.js es un framework de React que suma lo que React solo no trae: ruteo, renderizado en el servidor, caché, optimización de imágenes y fuentes, y un build listo para producción. El App Router (la carpeta `app/`) arma las rutas a partir de carpetas: cada carpeta es un segmento de la URL y ciertos archivos con nombre especial definen qué se renderiza en ese segmento.',
        concepts: [
          {
            term: 'page.tsx',
            detail:
              'Hace que la carpeta sea una ruta pública. Sin `page.tsx` la carpeta existe pero no se puede visitar.',
          },
          {
            term: 'layout.tsx',
            detail:
              'UI compartida que envuelve a todas las páginas de abajo y no se vuelve a montar al navegar entre ellas (por eso el sidebar no parpadea).',
          },
          {
            term: 'loading.tsx',
            detail:
              'Skeleton que Next muestra al instante mientras la página se resuelve en el servidor. Por dentro es un `<Suspense>` automático.',
          },
          {
            term: '(grupo)',
            detail:
              'Una carpeta entre paréntesis agrupa rutas para compartir un layout sin agregar nada a la URL: `(platform)/desarrollo` responde en `/desarrollo`.',
          },
          {
            term: '[param]',
            detail:
              'Segmento dinámico: `consejos/[id]` atiende `/consejos/abc123` y recibe `{ id: "abc123" }` en `params`.',
          },
          {
            term: 'archivos de metadata',
            detail:
              '`sitemap.ts`, `robots.ts` y `opengraph-image.tsx` generan `/sitemap.xml`, `/robots.txt` y la imagen que se ve al compartir el link.',
          },
        ],
        usage: [
          'Todo el sitio vive en `src/app`. Las secciones de la comunidad están dentro del grupo `(platform)`, que comparte el layout con sidebar, navegación mobile y PCN OS. Las pantallas de login y registro están en el grupo `(autenticacion)`, que tiene su propio layout más simple.',
          'Casi todas las páginas exportan `metadata` (o `generateMetadata` si dependen de la base) para el título, la descripción y las tarjetas de Open Graph, y muchas tienen su `opengraph-image.tsx` que dibuja una tarjeta con estética de terminal.',
        ],
        examples: [
          {
            file: 'src/app',
            lang: 'tree',
            caption: 'Un recorte del árbol de rutas y qué URL genera cada archivo.',
            code: `src/app/
├── layout.tsx               # layout raíz: <html>, fuentes, providers
├── (platform)/              # grupo: comparte sidebar, no aparece en la URL
│   ├── layout.tsx
│   ├── desarrollo/
│   │   ├── page.tsx         # → /desarrollo
│   │   ├── loading.tsx      # skeleton mientras carga
│   │   └── opengraph-image.tsx
│   └── consejos/[id]/
│       └── page.tsx         # → /consejos/:id
├── (autenticacion)/         # → /iniciar-sesion, /crear-cuenta…
├── api/search/route.ts      # → GET /api/search?q=…
├── sitemap.ts               # → /sitemap.xml
└── robots.ts                # → /robots.txt`,
          },
          {
            file: 'src/app/(platform)/consejos/[id]/opengraph-image.tsx',
            lang: 'tsx',
            caption:
              'La imagen para redes de cada consejo se genera con los datos del consejo. `params` es una Promise en Next 15+.',
            code: `export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Consejo de la comunidad programaConNosotros';

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const advice = await prisma.advice.findUnique({
    where: { id },
    select: { content: true, author: { select: { name: true } } },
  });

  return renderTerminalCard({
    path: 'consejos',
    command: advice ? \`fortune --from "\${advice.author.name}"\` : 'fortune',
    title: advice ? \`“\${advice.content}”\` : 'Consejos de la comunidad',
    meta: advice ? [\`@\${advice.author.name}\`] : [],
  });
}`,
          },
        ],
        docsUrl: 'https://nextjs.org/docs/app',
      },
      {
        id: 'server-components',
        name: 'React Server Components',
        tagline: 'componentes que corren solo en el servidor',
        what: 'En el App Router todo componente es, por defecto, un Server Component: se ejecuta en el servidor, puede ser `async`, puede leer la base de datos o secretos directamente, y al navegador le llega solo el HTML resultante (su código no se suma al bundle de JavaScript). Cuando necesitás estado, efectos o eventos del navegador, marcás el archivo con `"use client"` y pasa a ser un Client Component.',
        concepts: [
          {
            term: 'async components',
            detail:
              'Un Server Component puede hacer `await` adentro del cuerpo: no hace falta `useEffect` ni un endpoint intermedio para traer datos.',
          },
          {
            term: '"use client"',
            detail:
              'Marca la frontera: ese archivo y todo lo que importe se manda al navegador. Conviene poner la frontera lo más abajo posible del árbol.',
          },
          {
            term: 'props serializables',
            detail:
              'De servidor a cliente solo pasan datos que se puedan serializar (strings, números, objetos planos, fechas, JSX). Funciones no, salvo server actions.',
          },
          {
            term: 'APIs dinámicas',
            detail:
              '`cookies()`, `headers()` y `params` son asíncronas desde Next 15: siempre van con `await`.',
          },
        ],
        usage: [
          'Las páginas leen la base con Prisma directamente desde el componente. Por ejemplo, la página de un consejo busca el consejo y su autor sin pasar por una API.',
          'Los componentes interactivos (formularios, el buscador, PCN OS, el cursor hacker) son Client Components, y las páginas los usan como hojas del árbol.',
        ],
        examples: [
          {
            file: 'src/app/(platform)/consejos/[id]/page.tsx',
            lang: 'tsx',
            caption:
              '`generateMetadata` corre en el servidor, espera `params` y consulta la base para armar el título de la pestaña.',
            code: `export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const advice = await prisma.advice.findUnique({
    where: { id: params.id },
    select: {
      content: true,
      author: {
        select: {
          name: true,
        },
      },
    },
  });
  // …
}

export default async function AdvicePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const sessionId = (await cookies()).get('sessionId');
  // …
}`,
          },
        ],
        docsUrl: 'https://nextjs.org/docs/app/getting-started/server-and-client-components',
      },
      {
        id: 'streaming',
        name: 'Streaming y Suspense',
        tagline: 'mandar la página por partes',
        what: 'Con streaming, el servidor manda el HTML a medida que lo tiene listo en vez de esperar a que termine todo. `<Suspense>` marca una parte que puede tardar: mientras se resuelve se muestra el `fallback` y, cuando los datos llegan, React reemplaza el skeleton por el contenido sin recargar.',
        concepts: [
          {
            term: '<Suspense fallback>',
            detail:
              'Envuelve un componente async lento. El resto de la página se ve enseguida; solo esa parte espera.',
          },
          {
            term: 'loading.tsx',
            detail:
              'Un Suspense a nivel de ruta: cubre la página entera mientras se resuelve, ideal para que la navegación responda al instante.',
          },
          {
            term: 'caché de fetch',
            detail:
              '`fetch(url, { next: { revalidate: 3600 } })` guarda la respuesta y la vuelve a pedir como mucho una vez por hora.',
          },
        ],
        usage: [
          'Esta misma página es el ejemplo: las estadísticas de colaboración piden datos a la API de GitHub, que puede tardar, así que van dentro de un `<Suspense>` con un skeleton. El resto de /desarrollo se muestra sin esperar.',
          'Cada sección tiene además su `loading.tsx` con skeletons que imitan la forma real de la página.',
        ],
        examples: [
          {
            file: 'src/app/(platform)/desarrollo/page.tsx',
            lang: 'tsx',
            code: `<Section title="Estadísticas de colaboración">
  <Suspense fallback={<CollaborationStatsSkeleton />}>
    <CollaborationStats />
  </Suspense>
</Section>`,
          },
          {
            file: 'src/app/(platform)/desarrollo/loading.tsx',
            lang: 'tsx',
            code: `export default function Loading() {
  return (
    <>
      <div className="flex flex-1 flex-col p-4 pt-0">
        <div className="mt-4">
          <PageTitleSkeleton titleClassName="w-44" />
          <TextLineSkeleton lineClassName="h-5" className="h-3.5 w-52" />
        </div>
      </div>
    </>
  );
}`,
          },
        ],
        docsUrl: 'https://nextjs.org/docs/app/getting-started/linking-and-navigating#streaming',
      },
      {
        id: 'server-actions',
        name: 'Server Actions',
        tagline: 'funciones del servidor que llamás desde el cliente',
        what: 'Una Server Action es una función `async` en un archivo marcado con `"use server"`. Desde un componente del cliente la llamás como cualquier función, pero Next la ejecuta en el servidor a través de un POST que arma solo. Reemplazan a la mayoría de los endpoints REST para mutaciones: crear, editar, borrar.',
        concepts: [
          {
            term: '"use server"',
            detail:
              'Todas las funciones exportadas del archivo pasan a ser endpoints. Por eso cada una tiene que validar sus argumentos y chequear permisos: cualquiera puede invocarlas.',
          },
          {
            term: 'revalidatePath',
            detail:
              'Después de mutar, invalida la caché de una ruta para que la próxima visita muestre los datos nuevos.',
          },
          {
            term: 'redirect',
            detail:
              'Corta la ejecución lanzando una excepción especial y manda al usuario a otra URL.',
          },
        ],
        usage: [
          'Las acciones viven en `src/actions`, agrupadas por dominio (`auth`, `events`, `testimonials`, `talks`…), un archivo por acción y su test al lado.',
          'Todas siguen el mismo patrón: límite de envíos, validación con Zod, sesión desde la cookie, escritura con Prisma y `revalidatePath` de las páginas afectadas.',
        ],
        examples: [
          {
            file: 'src/actions/testimonials/create-testimonial.ts',
            lang: 'ts',
            code: `'use server';

import prisma from '@/lib/prisma';
import { testimonialSchema, TestimonialFormData } from '@/schemas/testimonial-schema';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
// …

export const createTestimonial = async (data: TestimonialFormData) => {
  await enforceRateLimit('createContent');

  const validatedData = testimonialSchema.parse(data);

  const sessionId = (await cookies()).get('sessionId')?.value;

  if (!sessionId) {
    throw new Error('Debes estar autenticado para crear un testimonio');
  }
  // …
  const testimonial = await prisma.testimonial.create({
    data: {
      body: validatedData.body,
      userId: session.userId,
    },
  });
  // …
  revalidatePath('/testimonios');
};`,
          },
        ],
        docsUrl: 'https://nextjs.org/docs/app/getting-started/updating-data',
      },
      {
        id: 'route-handlers',
        name: 'Route Handlers y Proxy',
        tagline: 'endpoints HTTP y la capa antes del request',
        what: 'Un `route.ts` dentro de `app/` define un endpoint HTTP: exportás funciones con el nombre del método (`GET`, `POST`…) que reciben un `Request` y devuelven un `Response`. El `proxy.ts` (antes llamado `middleware.ts`, renombrado en Next 16) corre antes de cada request que matchee su `matcher` y puede redirigir, reescribir o tocar headers.',
        concepts: [
          {
            term: 'route.ts',
            detail:
              'Útil cuando el que llama no es un componente React: el buscador global, feeds, webhooks, descargas.',
          },
          {
            term: 'Response.json()',
            detail: 'La API web estándar para devolver JSON, sin helpers propios de Next.',
          },
          {
            term: 'proxy.ts',
            detail:
              'Se ejecuta antes de renderizar. Next recomienda usarlo como último recurso y resolver la autorización cerca de los datos.',
          },
        ],
        usage: [
          'El buscador (⌘K) consulta `/api/search`, que mezcla un índice estático de las páginas con el contenido de la base: las tablas chicas se filtran en memoria y el foro, los consejos y los miembros se buscan en Postgres con full-text search (`tsvector` y `pg_trgm`, que tolera errores de tipeo).',
          'El proxy está preparado para `/perfil`, pero hoy deja pasar todo: los permisos se verifican en cada página y cada server action.',
        ],
        examples: [
          {
            file: 'src/app/api/search/route.ts',
            lang: 'ts',
            code: `export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, MAX_QUERY_LENGTH);

  if (!query) {
    return Response.json({ query, results: [] } satisfies SearchResponse);
  }

  let databaseEntries: Awaited<ReturnType<typeof loadDatabaseEntries>> = [];
  try {
    databaseEntries = await loadDatabaseEntries(query);
  } catch (error) {
    // Static content is still searchable when the database is unavailable.
    console.error('search: database lookup failed', error);
  // …
}`,
          },
          {
            file: 'src/proxy.ts',
            lang: 'ts',
            code: `export function proxy(_request: NextRequest) {
  // …
  return NextResponse.next();
}

export const config = {
  matcher: ['/perfil/:path*'],
};`,
          },
        ],
        docsUrl: 'https://nextjs.org/docs/app/api-reference/file-conventions/route',
      },
    ],
  },
  {
    id: 'frontend',
    title: 'frontend',
    notes: [
      {
        id: 'react',
        name: 'React 19',
        tagline: 'la UI como función del estado',
        what: 'React es una librería para construir interfaces con componentes: funciones que reciben props y devuelven JSX. Cuando cambia el estado, React vuelve a ejecutar el componente y actualiza en el DOM solo lo que cambió. Los hooks (`useState`, `useEffect`, `useMemo`…) son la forma de darle estado y efectos a esas funciones.',
        concepts: [
          {
            term: 'componentes',
            detail: 'Piezas reutilizables y componibles. Se nombran en PascalCase y devuelven JSX.',
          },
          {
            term: 'hooks',
            detail:
              'Funciones `use…` que solo se llaman en el nivel superior de un componente o de otro hook, nunca dentro de ifs o loops.',
          },
          {
            term: 'custom hooks',
            detail:
              'Extraen lógica con estado a una función reutilizable (por ejemplo `useContentMarks`).',
          },
          {
            term: 'context / providers',
            detail:
              'Comparten un valor con todo un subárbol sin pasarlo prop por prop. Así se inyectan el tema y el cliente de React Query.',
          },
        ],
        usage: [
          'Los componentes están en `src/components`, agrupados por feature (`events/`, `talks/`, `os/`…). Los hooks propios están en `src/hooks`.',
          'El layout raíz monta los providers globales una sola vez. Como necesitan estado del navegador, cada provider es un Client Component chico que recibe `children`.',
        ],
        examples: [
          {
            file: 'src/components/react-query-provider.tsx',
            lang: 'tsx',
            caption:
              'El `useState` asegura que el `QueryClient` se cree una sola vez por pestaña y no en cada render.',
            code: `'use client';

import { useState, type PropsWithChildren } from 'react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

export const ReactQueryProvider = ({ children }: PropsWithChildren) => {
  const [client] = useState(new QueryClient());

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};`,
          },
        ],
        docsUrl: 'https://react.dev/learn',
      },
      {
        id: 'typescript',
        name: 'TypeScript',
        tagline: 'JavaScript con tipos que se chequean antes de correr',
        what: 'TypeScript agrega tipos estáticos a JavaScript. El compilador revisa que uses bien cada valor (que no llames a algo que puede ser `null`, que no le pases un string a algo que espera un número) y después borra los tipos: en runtime es JavaScript normal. El editor usa esa información para autocompletar y refactorizar.',
        concepts: [
          {
            term: 'uniones discriminadas',
            detail:
              'Un tipo que es "una de varias formas" distinguidas por un campo común. Al chequear ese campo, TS sabe qué otros campos existen.',
          },
          {
            term: 'satisfies',
            detail:
              'Valida que un valor cumpla un tipo sin perder el tipo literal más preciso que infiere TS.',
          },
          {
            term: 'tipos derivados',
            detail:
              '`z.infer`, `ReturnType`, `Awaited` y `keyof typeof` sacan tipos de código que ya existe, así hay una sola fuente de verdad.',
          },
        ],
        usage: [
          'Todo el proyecto es TypeScript en modo estricto. Prisma genera los tipos de cada modelo y Zod los de cada formulario, así que casi nunca escribimos tipos a mano para los datos.',
          'Antes de pushear, `pnpm build` corre el chequeo de tipos: si no compila, no se pushea.',
        ],
        examples: [
          {
            file: 'src/actions/auth/sign-in.ts',
            lang: 'ts',
            caption:
              'El resultado es una unión discriminada por `success` y `error`: quien llama sabe que `email` solo existe en el caso `EMAIL_NOT_VERIFIED`.',
            code: `export const signIn = async (
  data: z.infer<typeof formSchema>,
): Promise<
  | { success: true; redirectTo: string }
  | { success: false; error: 'INVALID_CREDENTIALS' }
  | { success: false; error: 'EMAIL_NOT_VERIFIED'; email: string }
> => {`,
          },
          {
            file: 'src/lib/rate-limit.ts',
            lang: 'ts',
            caption:
              '`satisfies` chequea la forma de cada regla y `keyof typeof` convierte las claves en un tipo: `enforceRateLimit("typo")` no compila.',
            code: `export const RATE_LIMITS = {
  signIn: { limit: 20, windowSeconds: 15 * 60 },
  signUp: { limit: 5, windowSeconds: 60 * 60 },
  // …
  photoDownload: { limit: 30, windowSeconds: 60 * 60 },
} satisfies Record<string, RateLimitRule>;

export type RateLimitName = keyof typeof RATE_LIMITS;`,
          },
        ],
        docsUrl: 'https://www.typescriptlang.org/docs/handbook/intro.html',
      },
      {
        id: 'tailwind',
        name: 'Tailwind CSS',
        tagline: 'estilos con clases utilitarias',
        what: 'Tailwind es un framework de CSS "utility-first": en vez de escribir hojas de estilo con clases semánticas, componés el diseño con clases chicas que hacen una sola cosa (`p-4`, `font-mono`, `border-b`). En el build escanea el código y genera solo el CSS de las clases que usás. Los variants (`hover:`, `md:`, `dark:`) aplican una clase bajo una condición.',
        concepts: [
          {
            term: 'design tokens',
            detail:
              'Colores, fuentes y espaciados se definen en el bloque `@theme` de `src/app/globals.css` y se usan como clases (`text-pcnGreen`, `border-pcnGreen-200`).',
          },
          {
            term: 'variants custom',
            detail:
              'Con `@custom-variant` en el CSS podés crear tus propios prefijos condicionales.',
          },
          {
            term: 'valores arbitrarios',
            detail:
              'Corchetes para valores puntuales fuera de la escala: `text-[11px]`, `pb-[env(safe-area-inset-bottom)]`.',
          },
          {
            term: 'cn()',
            detail:
              '`clsx` arma la lista de clases condicionales y `tailwind-merge` resuelve conflictos (si pasás `p-2` y `p-4`, gana la última).',
          },
        ],
        usage: [
          'La paleta `pcnGreen` es el verde fósforo del sitio con 9 niveles de opacidad. Las líneas finas de las grillas son `border-pcnGreen-200`.',
          'Definimos dos variants propios para PCN OS: `os:` aplica en pantallas grandes cuando la página es el escritorio, y `embedded:` cuando la página está dentro de una ventana de PCN OS (un iframe). Un script en el layout raíz marca `data-embedded` en `<html>` antes del primer paint para que no haya parpadeo.',
        ],
        examples: [
          {
            file: 'src/app/globals.css',
            lang: 'css',
            code: `/*
  PCN OS variants:
  - \`os:\` applies on large screens when the page is the desktop host (not inside a window).
  - \`embedded:\` applies when the page is rendered inside a PCN OS window (an iframe).
  - \`lite:\` applies in PCN OS liviano (see src/components/os/os-display-mode.ts).
  The \`data-embedded\` and \`data-os-mode\` attributes are set before paint by the scripts in the
  root layout; \`data-os-mode="classic"\` turns the desktop off, so \`os:\` excludes it.
*/
@custom-variant os {
  @media (width >= 1024px) {
    html:not([data-embedded]):not([data-os-mode='classic']) & {
      @slot;
    }
  }
}
@custom-variant embedded (html[data-embedded] &);
@custom-variant lite (html[data-os-mode='lite'] &);`,
          },
          {
            file: 'src/components/ui/mobile-nav.tsx',
            lang: 'tsx',
            caption:
              'La barra de navegación mobile se oculta en desktop (`md:hidden`) y dentro de una ventana de PCN OS (`embedded:hidden`).',
            code: `className="mobile-tab-bar pointer-events-auto fixed inset-x-0 bottom-0 z-[60] bg-transparent pb-[env(safe-area-inset-bottom)] embedded:hidden md:hidden"`,
          },
          {
            file: 'src/components/ui/ruled-grid.tsx',
            lang: 'tsx',
            caption:
              'La grilla "con reglas" del sitio: celdas que comparten líneas finas en vez de flotar como tarjetas.',
            code: `// A grid whose cells share hairlines instead of floating as separate cards:
// the grid draws the top/left edge and every cell draws its own bottom/right.
export const RuledGrid = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('grid border-l border-t border-pcnGreen-200', className)} {...props} />
);`,
          },
        ],
        docsUrl: 'https://tailwindcss.com/docs',
      },
      {
        id: 'shadcn',
        name: 'shadcn/ui + Radix',
        tagline: 'componentes accesibles que son tuyos',
        what: 'shadcn/ui no es una dependencia: es una colección de componentes que copiás a tu repo y modificás a gusto. Por debajo usan Radix UI, primitivas sin estilos que resuelven la parte difícil (foco, teclado, ARIA, portales) de diálogos, menús, tabs o selects. Los estilos los ponés vos con Tailwind.',
        concepts: [
          {
            term: 'primitivas headless',
            detail:
              'Radix da el comportamiento y la accesibilidad; la apariencia queda 100% en tus manos.',
          },
          {
            term: 'cva',
            detail:
              '`class-variance-authority` define variantes (`variant`, `size`) como un mapa de clases, con tipos generados para las props.',
          },
          {
            term: 'Slot / asChild',
            detail:
              'Permite que un `<Button asChild>` le pase sus estilos al hijo, por ejemplo un `<Link>`, sin anidar un botón dentro de un link.',
          },
        ],
        usage: [
          'Los componentes están en `src/components/ui` y fueron rediseñados con la estética de terminal: botones con texto en mono que se leen como llamadas a funciones (`abrirGitHub();`), tabs, diálogos y menús con bordes en verde fósforo.',
        ],
        examples: [
          {
            file: 'src/components/ui/button.tsx',
            lang: 'tsx',
            code: `// Buttons with a fill and a border label their action as a function call, e.g. \`crearEvento();\`.
const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-sm font-mono text-sm font-medium …',
  {
    variants: {
      variant: {
        default: primaryCta,
        destructive:
          'border border-red-500/60 bg-red-500/10 text-red-400 hover:bg-red-500/20 …',
        outline: secondaryCta,
        ghost: 'text-foreground/80 hover:bg-pcnGreen-100 hover:text-pcnGreen',
        link: 'text-pcnGreen underline-offset-4 hover:underline',
        pcn: primaryCta,
        // …
      },
    },
  },
);`,
          },
        ],
        docsUrl: 'https://ui.shadcn.com/docs',
      },
      {
        id: 'forms',
        name: 'Zod + React Hook Form',
        tagline: 'un schema, validado en el cliente y en el servidor',
        what: 'Zod describe la forma de los datos con un schema y lo valida en runtime: `schema.parse(x)` devuelve el dato tipado o lanza un error con mensajes por campo. React Hook Form maneja el estado de los formularios sin re-renderizar todo en cada tecla; con `zodResolver` usa el schema de Zod para validar.',
        concepts: [
          {
            term: 'schema',
            detail:
              'Fuente de verdad de un formulario: reglas, mensajes de error y, con `z.infer`, también el tipo TypeScript.',
          },
          {
            term: 'zodResolver',
            detail: 'Conecta el schema a `useForm` para validar y mostrar los errores por campo.',
          },
          {
            term: 'doble validación',
            detail:
              'El cliente valida para dar feedback rápido; el servidor vuelve a validar porque el cliente no es confiable.',
          },
        ],
        usage: [
          'Los schemas viven en `src/schemas` y se importan desde los dos lados: el formulario los usa con `zodResolver` y la server action hace `parse` con el mismo schema.',
        ],
        examples: [
          {
            file: 'src/schemas/testimonial-schema.ts',
            lang: 'ts',
            code: `import { z } from 'zod';

export const testimonialSchema = z.object({
  body: z.string().min(10, { message: 'El testimonio debe tener al menos 10 caracteres' }),
});

export type TestimonialFormData = z.infer<typeof testimonialSchema>;`,
          },
          {
            file: 'src/components/talk-proposals/new-talk-proposal-form.tsx',
            lang: 'tsx',
            caption:
              'Un formulario con una lista dinámica de oradores: `useFieldArray` agrega y saca filas.',
            code: `const form = useForm<TalkProposalFormData>({
  resolver: zodResolver(talkProposalSchema),
  defaultValues: {
    title: '',
    description: '',
    speakers: [defaults.firstSpeaker],
  },
});

const { fields, append, remove } = useFieldArray({
  control: form.control,
  name: 'speakers',
});`,
          },
        ],
        docsUrl: 'https://zod.dev',
      },
      {
        id: 'react-query',
        name: 'TanStack Query',
        tagline: 'estado del servidor en el cliente',
        what: 'TanStack Query (React Query) cachea en el cliente datos que vienen del servidor. Cada consulta tiene una `queryKey`; la librería deduplica pedidos, los reintenta, los refresca cuando quedan viejos y permite actualizaciones optimistas: mostrar el cambio antes de que el servidor confirme y deshacerlo si falla.',
        concepts: [
          {
            term: 'useQuery',
            detail: 'Lee y cachea. `staleTime` define cuánto tiempo el dato se considera fresco.',
          },
          {
            term: 'useMutation',
            detail: 'Escribe. Tiene hooks de ciclo de vida: `onMutate`, `onError`, `onSettled`.',
          },
          {
            term: 'optimistic update',
            detail:
              'En `onMutate` guardás el estado anterior y escribís el nuevo en la caché; en `onError` lo restaurás.',
          },
        ],
        usage: [
          'Lo usamos donde la UI tiene que responder al instante, como marcar un artículo como leído o un video como visto. Las funciones de la query son server actions, así que no hay endpoints intermedios.',
        ],
        examples: [
          {
            file: 'src/hooks/use-content-marks.ts',
            lang: 'ts',
            code: `const { data, isLoading } = useQuery({
  queryKey,
  queryFn: () => getContentMarks(contentType),
  staleTime: 60 * 1000,
});
// …
const mutation = useMutation({
  mutationFn: async (changes: SetMarkInput[]) => { /* … */ },
  onMutate: async (changes) => {
    await queryClient.cancelQueries({ queryKey });
    const previous = queryClient.getQueryData<MarksData>(queryKey);
    queryClient.setQueryData<MarksData>(queryKey, (current) => { /* … */ });
    return { previous };
  },
  onError: (_error, _changes, context) => {
    queryClient.setQueryData(queryKey, context?.previous);
    toast.error('No pudimos guardar el cambio. Probá de nuevo.');
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey }),
});`,
          },
        ],
        docsUrl: 'https://tanstack.com/query/latest/docs/framework/react/overview',
      },
      {
        id: 'tanstack-table',
        name: 'TanStack Table',
        tagline: 'tablas con búsqueda, orden y paginación sin markup impuesto',
        what: 'TanStack Table es una librería "headless" para tablas: no dibuja nada, solo calcula. Le pasás los datos y la definición de columnas y te devuelve filas ya filtradas, ordenadas y paginadas; el HTML y los estilos los ponés vos. Es la misma idea que Radix, pero para tablas.',
        concepts: [
          {
            term: 'ColumnDef',
            detail:
              'Describe cada columna: de qué campo sale (`accessorKey`), cómo se dibuja su encabezado y su celda, y si se puede ordenar.',
          },
          {
            term: 'row models',
            detail:
              'Cada capacidad es un "modelo de filas" que activás a pedido: `getSortedRowModel`, `getFilteredRowModel`, `getPaginationRowModel`. Lo que no usás no pesa.',
          },
          {
            term: 'estado controlado',
            detail:
              'El orden y el filtro pueden vivir en tu `useState`, así los conectás con otros componentes como un buscador.',
          },
          {
            term: 'flexRender',
            detail: 'Dibuja lo que definiste en la columna, sea un string o un componente.',
          },
        ],
        usage: [
          'La usamos en la lista de inscripciones de cada evento y en la tabla de `/usuarios`. El buscador global es el mismo `SearchBar` estilo `grep` del resto del sitio, conectado al `globalFilter` de la tabla; las filas canceladas se ven atenuadas.',
        ],
        examples: [
          {
            file: 'src/components/events/registrations-data-table.tsx',
            lang: 'tsx',
            code: `const [sorting, setSorting] = useState<SortingState>([]);
const [globalFilter, setGlobalFilter] = useState('');

const table = useReactTable({
  data,
  columns: registrationColumns,
  state: { sorting, globalFilter },
  onSortingChange: setSorting,
  onGlobalFilterChange: setGlobalFilter,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  initialState: { pagination: { pageSize: 100 } },
});`,
          },
          {
            file: 'src/components/events/registrations-columns.tsx',
            lang: 'tsx',
            code: `export const registrationColumns: ColumnDef<EventRegistrationRow>[] = [
  {
    accessorKey: 'name',
    meta: { className: 'min-w-[260px] whitespace-nowrap' },
    header: ({ column }) => (
      <SortableHeader
        label="Nombre"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      />
    ),
    // …`,
          },
        ],
        docsUrl: 'https://tanstack.com/table/latest/docs/introduction',
      },
      {
        id: 'fechas',
        name: 'Fechas: Intl y date-fns',
        tagline: 'la hora del evento, en la zona horaria de quien la lee',
        what: 'Un `Date` de JavaScript es un instante (milisegundos desde 1970 en UTC); la zona horaria aparece recién al mostrarlo. `Intl.DateTimeFormat`, que viene con el navegador y con Node, formatea un instante en un idioma y una zona dados. date-fns es una librería de funciones chicas e inmutables para formatear y calcular con fechas, con traducciones como `es`.',
        concepts: [
          {
            term: 'UTC en la base',
            detail:
              'Postgres guarda el instante; mostrarlo en hora argentina, española o mexicana es problema de la UI.',
          },
          {
            term: 'hydration mismatch',
            detail:
              'Si el servidor formatea en su zona y el navegador en la del visitante, el texto no coincide y React avisa. `suppressHydrationWarning` acepta esa diferencia puntual.',
          },
          {
            term: '<time dateTime>',
            detail:
              'Marca la fecha en formato ISO para lectores de pantalla y buscadores, más allá de cómo se vea.',
          },
          {
            term: 'tree-shaking',
            detail:
              'Con date-fns importás solo las funciones que usás (`format`, `formatDistanceToNow`), no toda la librería.',
          },
        ],
        usage: [
          'Las fechas de los eventos se muestran con `LocalDate`, `LocalTime` y `LocalDateTime`: en el servidor se formatean en la hora de Buenos Aires y en el navegador en la zona de quien visita, en formato 24 h. date-fns se usa para textos más armados, como "hace 3 días" en los anuncios o el horario del flyer.',
        ],
        examples: [
          {
            file: 'src/components/ui/local-date-time.tsx',
            lang: 'tsx',
            code: `const CANONICAL_TZ = 'America/Argentina/Buenos_Aires';

function tz(): string | undefined {
  return typeof window === 'undefined' ? CANONICAL_TZ : undefined;
}

export function LocalTime({ date }: { date: Date | string }) {
  const d = new Date(date);
  const formatted = new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: tz(),
  }).format(d);
  return (
    <time dateTime={d.toISOString()} suppressHydrationWarning>
      {formatted}
    </time>
  );
}`,
          },
          {
            file: 'src/components/announcements/announcement-card.tsx',
            lang: 'tsx',
            code: `{formatDistanceToNow(new Date(announcement.createdAt), {
  addSuffix: true,
  locale: es,
})}`,
          },
        ],
        docsUrl:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat',
      },
      {
        id: 'motion',
        name: 'Motion + Embla Carousel',
        tagline: 'animaciones declarativas y carruseles táctiles',
        what: 'Motion (antes Framer Motion) anima componentes de React de forma declarativa: le decís el estado inicial, el final y el de salida, y la librería interpola. Su `AnimatePresence` resuelve algo que React solo no puede: animar un componente mientras se desmonta. Embla es un motor de carruseles liviano, con arrastre táctil y snap, sobre el que shadcn/ui arma su `Carousel`.',
        concepts: [
          {
            term: 'initial / animate / exit',
            detail: 'Los tres estados de un `motion.div`: cómo aparece, cómo queda y cómo se va.',
          },
          {
            term: 'AnimatePresence',
            detail: 'Mantiene montado al hijo que sale hasta que termina su animación de `exit`.',
          },
          {
            term: 'prefers-reduced-motion',
            detail:
              'Preferencia del sistema operativo para reducir animaciones; las respetamos en CSS y en los efectos de scroll.',
          },
          {
            term: 'scroll snap',
            detail:
              'El carrusel se acomoda siempre en un slide entero; Embla expone una API (`selectedScrollSnap`) para saber cuál se ve.',
          },
        ],
        usage: [
          'Motion se importa desde `motion/react` y anima detalles de la interfaz: el botón de volver arriba, el indicador de scroll, las ventanas y el dock de PCN OS, y los contadores que suben (`NumberTicker`). La home no lo usa: su hero y sus apariciones al scrollear son animaciones CSS, para que se vean sin esperar a que cargue el JavaScript. Embla mueve el carrusel de flyers de cada evento y los de charlas y lightning talks.',
        ],
        examples: [
          {
            file: 'src/components/ui/scroll-hud-button.tsx',
            lang: 'tsx',
            code: `<motion.div
  initial={{ opacity: 0, scale: 0.85, filter: 'blur(4px)' }}
  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
  exit={{ opacity: 0, scale: 0.85, filter: 'blur(4px)' }}
  transition={{ duration: 0.18, ease: 'easeOut' }}
  // …
>`,
          },
          {
            file: 'src/components/ui/scroll-to-top.tsx',
            lang: 'tsx',
            caption: 'Sin `AnimatePresence`, el botón desaparecería de golpe al volver arriba.',
            code: `<AnimatePresence>
  {isVisible && (
    <ScrollHudButton
      onClick={scrollToTop}
      label="Volver arriba"
      code={String(Math.round(progress * 100)).padStart(2, '0')}
      progress={progress}
      icon={<ChevronsUp className="h-4 w-4" strokeWidth={2.25} />}
    />
  )}
</AnimatePresence>`,
          },
          {
            file: 'src/components/events/event-flyer-carousel.tsx',
            lang: 'tsx',
            code: `const [api, setApi] = React.useState<CarouselApi>();
const [current, setCurrent] = React.useState(0);

React.useEffect(() => {
  if (!api) return;
  setCurrent(api.selectedScrollSnap());
  const handleSelect = () => setCurrent(api.selectedScrollSnap());
  api.on('select', handleSelect);
  return () => {
    api.off('select', handleSelect);
  };
}, [api]);`,
          },
        ],
        docsUrl: 'https://motion.dev/docs/react',
      },
      {
        id: 'layout-raiz',
        name: 'next/font · next-themes · Sonner',
        tagline: 'fuentes, tema y notificaciones montados una sola vez',
        what: '`next/font` descarga las fuentes en el build y las sirve desde tu propio dominio, sin pedidos a terceros ni saltos de layout cuando cargan. next-themes maneja el tema (claro/oscuro) poniendo una clase en `<html>` antes de que se pinte la página. Sonner es una librería de toasts: llamás a `toast.success()` desde cualquier lado y el `<Toaster>` montado en el layout los muestra.',
        concepts: [
          {
            term: 'variables CSS de fuente',
            detail:
              '`GeistSans.variable` expone la fuente como variable CSS, que Tailwind usa en `font-sans` y `font-mono`.',
          },
          {
            term: 'forcedTheme',
            detail:
              'Fija un tema sin importar la preferencia del sistema: el sitio es siempre oscuro, como una terminal.',
          },
          {
            term: 'toasts imperativos',
            detail:
              'No hace falta estado ni contexto propio: `toast()` funciona desde un handler, después de una server action.',
          },
        ],
        usage: [
          'El layout raíz carga Geist Sans y Geist Mono, fuerza el tema oscuro y monta el `Toaster`, al que le dimos estética de PCN OS: panel con scanlines, borde iluminado del color del toast y un prompt `>` antes del título. Los formularios y acciones avisan el resultado con `toast.success` o `toast.error`.',
        ],
        examples: [
          {
            file: 'src/app/layout.tsx',
            lang: 'tsx',
            code: `<html
  lang="es"
  className={\`\${GeistSans.variable} \${GeistMono.variable}\`}
  suppressHydrationWarning
>
  {/* … */}
  <body className={GeistSans.className}>
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      forcedTheme="dark"
      disableTransitionOnChange
    >
      <ReactQueryProvider>{children}</ReactQueryProvider>
      <Toaster closeButton position="top-right" />
      {/* … */}
    </ThemeProvider>
  </body>
</html>`,
          },
          {
            file: 'src/app/(platform)/notificaciones/notifications-client.tsx',
            lang: 'tsx',
            code: `try {
  await markNotificationAsRead(notificationId);
  toast.success('Notificación marcada como leída');
  router.refresh();
} catch (error: any) {
  toast.error(error.message || 'Error al marcar la notificación como leída');
}`,
          },
        ],
        docsUrl: 'https://nextjs.org/docs/app/getting-started/fonts',
      },
    ],
  },
  {
    id: 'datos',
    title: 'backend y datos',
    notes: [
      {
        id: 'prisma',
        name: 'Prisma',
        tagline: 'ORM con tipos generados y migraciones',
        what: 'Prisma es un ORM para Node.js. Describís los modelos en `schema.prisma`, Prisma genera un cliente con tipos para cada tabla y relación, y Prisma Migrate convierte los cambios del schema en archivos SQL versionados que se aplican en orden en cada base.',
        concepts: [
          {
            term: 'schema.prisma',
            detail:
              'Modelos, campos, relaciones, índices y enums en un solo archivo, que es la fuente de verdad de la base.',
          },
          {
            term: 'Prisma Client',
            detail:
              '`prisma.user.findUnique({ where, select, include })`: consultas tipadas, con autocompletado de campos y relaciones. Se genera como código TypeScript del proyecto en `src/generated/prisma` (no se commitea).',
          },
          {
            term: 'driver adapter',
            detail:
              'Desde Prisma 7 el cliente no trae un engine en Rust: arma el SQL en TypeScript y lo manda por `pg`, el driver de Postgres de Node, a través de `@prisma/adapter-pg`. `prisma.config.ts` define la URL que usa el CLI para migrar.',
          },
          {
            term: 'migraciones',
            detail:
              'Cada cambio del schema es una carpeta en `prisma/migrations` con su `migration.sql`. En producción se aplican con `prisma migrate deploy`.',
          },
          {
            term: 'singleton',
            detail:
              'En desarrollo el hot reload recarga módulos; guardar el cliente en `globalThis` evita abrir una conexión nueva en cada recarga.',
          },
        ],
        usage: [
          'El schema tiene decenas de modelos (usuarios, sesiones, eventos, charlas, galería, proyectos…) y más de 70 migraciones desde 2024. El cliente se regenera solo en `postinstall` y `prebuild`.',
          'Para un cambio de schema: editás `schema.prisma`, creás la migración con `pnpm create-migration <nombre>`, revisás el SQL generado y lo commiteás junto con el cambio.',
        ],
        examples: [
          {
            file: 'prisma/schema.prisma',
            lang: 'prisma',
            code: `model Testimonial {
  id        String   @id @default(cuid())
  body      String
  userId    String // Usuario que creó el testimonio (requerido)
  featured  Boolean  @default(false) // Si aparece en la home page
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([createdAt])
  @@index([featured])
}`,
          },
          {
            file: 'prisma/migrations/20261008130000_add_user_instagram_url/migration.sql',
            lang: 'sql',
            code: `-- AlterTable
ALTER TABLE "User" ADD COLUMN "instagramUrl" TEXT;`,
          },
          {
            file: 'src/lib/prisma.ts',
            lang: 'ts',
            code: `import { PrismaClient } from '@/generated/prisma/client';
import { pgAdapter } from '@/lib/database-url';

const prismaClientSingleton = () => {
  return new PrismaClient({ adapter: pgAdapter(process.env.DATABASE_URL) });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;`,
          },
        ],
        docsUrl: 'https://www.prisma.io/docs',
      },
      {
        id: 'cache-de-datos',
        name: 'Cache de datos',
        tagline: 'lecturas cacheadas que cada escritura vence sola',
        what: 'Un cache de datos guarda el resultado de una consulta para no repetirla en cada request. Lo difícil no es guardar sino invalidar: saber cuándo lo guardado dejó de ser cierto. Next.js trae un data cache del lado del servidor (`unstable_cache`) donde cada entrada lleva tags, y `revalidateTag` vence todas las entradas de un tag de una vez.',
        concepts: [
          {
            term: 'unstable_cache',
            detail:
              'Envuelve una función async: la primera llamada con ciertos argumentos consulta la base y guarda el resultado; las siguientes lo leen de memoria o de `.next/cache` hasta que vence o se invalida.',
          },
          {
            term: 'tags',
            detail:
              'Etiquetas de cada entrada. `revalidateTag(tag, { expire: 0 })` vence todas las que la llevan y el próximo request las recalcula.',
          },
          {
            term: 'invalidación por tabla',
            detail:
              'Cada lectura cacheada se etiqueta con las tablas que lee (`db:Event`); escribir en una tabla vence su tag. Más grueso que invalidar fila por fila, pero no hay forma de olvidarse un caso.',
          },
          {
            term: 'datos que dependen de la hora',
            detail:
              'Lo que cambia con el reloj (qué eventos son próximos) no se cachea filtrado: se cachea la lista completa y se filtra en cada request.',
          },
        ],
        usage: [
          'Casi todo lo que el sitio muestra es igual para todos y cambia poco, así que las lecturas públicas pasan por `cached()` (`src/lib/cache.ts`): eventos, charlas, galería, consejos, proyectos, miembros, perfiles, logros, el feed, la búsqueda, el sitemap. Una página vista por alguien sin sesión no toca Postgres; con sesión, solo la busca a ella y lo propio (tu inscripción, tus likes).',
          'Nadie invalida a mano: el cliente de Prisma tiene una extensión que, después de cada escritura, calcula qué tablas tocó (incluidas las escrituras anidadas y lo que se borra en cascada, a partir de las relaciones del schema) y vence sus tags. Una server action nueva no tiene que acordarse de nada.',
          'Al cachear una lectura nueva hay que declarar todas las tablas que lee, incluidas las de los `include` y los filtros por relación. En desarrollo, si una lectura cacheada toca una tabla que no declaró, la consola avisa con `[cache] <nombre> reads <Tabla>`.',
          'Las URLs firmadas de la galería vencen, así que se cachean las filas sin firmar y se firman después; cada firma se guarda durante su hora. Las tablas de tracking, logs, sesiones y tokens no se cachean nunca.',
        ],
        examples: [
          {
            file: 'src/lib/event-index.ts',
            lang: 'ts',
            caption: 'Una lectura cacheada: un nombre, la consulta y las tablas que lee.',
            code: `export const listEventIndex = cached(
  'event-index',
  () =>
    prisma.event.findMany({
      where: { deletedAt: null },
      orderBy: { date: 'asc' },
      select: { id: true, name: true, date: true, endDate: true },
    }),
  { models: ['Event'] },
);`,
          },
          {
            file: 'src/actions/events/fetch-upcoming-events.ts',
            lang: 'ts',
            caption: 'Lo que depende de la hora se filtra sobre la lista cacheada.',
            code: `export const fetchUpcomingEvents = async (limit: number = 5) => {
  const now = new Date();
  const events = await listEventIndex();
  return events
    .filter(({ date, endDate }) => date >= now || (endDate !== null && endDate >= now))
    .slice(0, limit)
    .map(({ id, name, date }) => ({ id, name, date }));
};`,
          },
          {
            file: 'src/lib/prisma.ts',
            lang: 'ts',
            caption: 'Cada escritura vence las lecturas de las tablas que tocó.',
            code: `}).$extends({
  name: 'data-cache',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!WRITES.has(operation)) {
          if (process.env.NODE_ENV !== 'production') checkCachedRead(modelsIn(model, args));
          return query(args);
        }
        const result = await query(args);
        expireModels(modelsIn(model, args, isDelete(operation)));
        return result;
      },
    },
  },
});`,
          },
        ],
        docsUrl: 'https://nextjs.org/docs/app/api-reference/functions/unstable_cache',
        sourcePath: 'src/lib/cache.ts',
      },
      {
        id: 'postgres',
        name: 'PostgreSQL',
        tagline: 'la base de datos relacional',
        what: 'PostgreSQL es una base de datos relacional open-source: tablas con filas y columnas tipadas, relaciones con claves foráneas, transacciones ACID e índices para que las consultas no recorran la tabla entera. Se consulta con SQL; en este proyecto casi siempre a través de Prisma.',
        concepts: [
          {
            term: 'claves foráneas',
            detail:
              '`onDelete: Cascade` en Prisma se traduce a una FK que borra las filas hijas al borrar la madre.',
          },
          {
            term: 'índices',
            detail:
              'Aceleran filtros y ordenamientos frecuentes (`@@index([createdAt])`) a cambio de un poco más de costo al escribir.',
          },
          {
            term: 'búsqueda sin mayúsculas',
            detail:
              '`mode: "insensitive"` en Prisma usa `ILIKE` de Postgres para buscar ignorando mayúsculas.',
          },
          {
            term: 'full-text search',
            detail:
              '`to_tsvector` parte un texto en palabras y `to_tsquery` arma la búsqueda: `progra:*` encuentra toda palabra que empiece así. Un índice GIN sobre el `tsvector` evita leer la tabla entera, y `ts_rank` ordena por relevancia.',
          },
          {
            term: 'pg_trgm',
            detail:
              'Extensión que compara textos por trigramas (grupos de 3 letras). Con el operador `<%` encuentra palabras parecidas: "reakt" encuentra "React". Así el buscador tolera errores de tipeo.',
          },
          {
            term: 'índice de expresión',
            detail:
              'Un índice sobre el resultado de una función (`search_text(content)`) en vez de una columna. La consulta tiene que repetir la expresión exacta o Postgres no lo usa, y la función tiene que ser `IMMUTABLE`.',
          },
        ],
        usage: [
          'En local Postgres corre en Docker Compose. Cada git worktree tiene además su propia base aislada, creada por `scripts/setup-worktree-db.sh`, así podés probar migraciones en una branch sin romper la de otra.',
          'El buscador (⌘K) busca el foro, los consejos y los miembros directamente en Postgres, porque son las tablas que más crecen. Usa full-text search por prefijo y, si no hay coincidencia exacta, `pg_trgm` para los errores de tipeo. `search_text()` normaliza igual que el buscador en memoria: minúsculas, sin tildes (con `unaccent`) y sin puntuación. Prisma no conoce estos índices, así que viven solo en la migración SQL escrita a mano.',
        ],
        examples: [
          {
            file: 'docker-compose.yml',
            lang: 'yaml',
            code: `database:
  image: postgres:13
  container_name: pcn-db
  restart: always
  environment:
    - POSTGRES_USER=\${POSTGRES_USER}
    - POSTGRES_PASSWORD=\${POSTGRES_PASSWORD}
    - POSTGRES_DB=\${POSTGRES_DB}
  ports:
    - '5432:5432'
  healthcheck:
    test: ['CMD-SHELL', 'pg_isready -U $\${POSTGRES_USER} -d $\${POSTGRES_DB}']
    interval: 5s
    timeout: 5s
    retries: 5`,
          },
          {
            file: 'prisma/migrations/20261031120000_full_text_search/migration.sql',
            lang: 'sql',
            caption:
              'Las extensiones, la función que normaliza el texto y los dos índices de una tabla.',
            code: `CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION search_text(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT btrim(regexp_replace(lower(public.unaccent('public.unaccent'::regdictionary, $1)), '[^a-z0-9]+', ' ', 'g')) $$;
-- …
CREATE INDEX "Advice_search_fts_idx" ON "Advice"
  USING GIN (to_tsvector('simple', search_text("content")));
CREATE INDEX "Advice_search_trgm_idx" ON "Advice"
  USING GIN (search_text("content") gin_trgm_ops);`,
          },
          {
            file: 'src/lib/search/full-text.ts',
            lang: 'sql',
            caption:
              'La consulta del foro: coincidencias por prefijo o con un typo, las exactas primero.',
            code: `SELECT "id" FROM "ForumPost"
WHERE to_tsvector('simple', search_text("title" || ' ' || "content")) @@ to_tsquery('simple', \${query.prefixes})
   OR (\${query.typos} AND \${query.text} <% search_text("title" || ' ' || "content"))
ORDER BY
  ts_rank(to_tsvector('simple', search_text("title" || ' ' || "content")), to_tsquery('simple', \${query.prefixes})) DESC,
  word_similarity(\${query.text}, search_text("title" || ' ' || "content")) DESC,
  "activeAt" DESC
LIMIT \${CANDIDATES}`,
          },
        ],
        docsUrl: 'https://www.postgresql.org/docs/current/textsearch-intro.html',
      },
      {
        id: 'auth',
        name: 'Autenticación propia',
        tagline: 'sesiones en la base + cookie httpOnly',
        what: 'Autenticar es verificar quién sos; autorizar es decidir qué podés hacer. Un esquema clásico de sesiones: al loguearte, el servidor crea un registro de sesión y te manda su id en una cookie `httpOnly` (JavaScript no la puede leer). En cada request el servidor busca esa sesión para saber quién sos. Las contraseñas nunca se guardan en texto plano, sino como hash con un algoritmo lento como bcrypt.',
        concepts: [
          {
            term: 'bcrypt',
            detail:
              'Hash con sal y costo configurable: aunque se filtre la base, recuperar las contraseñas es carísimo.',
          },
          {
            term: 'cookie httpOnly',
            detail:
              'Protege la sesión de scripts inyectados (XSS). `sameSite: "lax"` ayuda contra CSRF y `secure` la limita a HTTPS.',
          },
          {
            term: 'rate limiting',
            detail:
              'Limitar intentos por usuario o IP frena ataques de fuerza bruta y el spam de formularios.',
          },
          {
            term: 'mensajes genéricos',
            detail:
              'Responder "credenciales inválidas" tanto si el email no existe como si la contraseña está mal evita revelar qué emails están registrados.',
          },
        ],
        usage: [
          'No usamos un proveedor externo: el modelo `Session` vive en Postgres y la cookie se llama `sessionId`. Todas las lecturas pasan por `findSession()` (en `src/lib/session.ts`), que descarta las sesiones vencidas; cerrar sesión borra la fila. Registrarse requiere verificar el email con un código de 6 dígitos.',
          'Todos los formularios pasan por `enforceRateLimit`, una ventana deslizante en memoria (alcanza porque el sitio corre en un solo proceso). Los admins no tienen límite.',
        ],
        examples: [
          {
            file: 'src/actions/auth/sign-in.ts',
            lang: 'ts',
            code: `const isPasswordValid = await bcrypt.compare(password, user.password);

if (!isPasswordValid) {
  return { success: false, error: 'INVALID_CREDENTIALS' };
}

if (!user.emailVerified) {
  return { success: false, error: 'EMAIL_NOT_VERIFIED', email };
}

await createSession(user.id);`,
          },
          {
            file: 'src/lib/session.ts',
            lang: 'ts',
            code: `// La cookie lleva un token aleatorio; la base guarda solo su hash como id de la sesión
export const hashSessionToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

// Todas las lecturas de sesión pasan por acá: una sesión vencida no sirve en ningún lado
export const findSession = (token: string) =>
  prisma.session.findUnique({
    where: { id: hashSessionToken(token), expires: { gt: new Date() } },
    include: { user: true },
  });

// Cerrar sesión borra la fila, así la cookie deja de servir aunque alguien la copie
export const deleteCurrentSession = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { id: hashSessionToken(token) } });
  }

  cookieStore.delete(SESSION_COOKIE);
};`,
          },
        ],
        docsUrl:
          'https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html',
      },
      {
        id: 'mcp-oauth',
        name: 'MCP y OAuth 2.1',
        tagline: 'Claude conectado al sitio, como un admin',
        what: 'MCP (Model Context Protocol) es un protocolo abierto para que un modelo como Claude use herramientas de otros sistemas: el servidor publica "tools" con un nombre, una descripción y un schema de entrada, y el cliente las llama con JSON-RPC sobre HTTP. Para un servidor remoto, la autorización es OAuth 2.1: el cliente se registra, manda a la persona a una pantalla de consentimiento y recibe un token de vida corta para llamar a las tools.',
        concepts: [
          {
            term: 'PKCE',
            detail:
              'El cliente inventa un secreto (verifier), manda solo su hash (challenge) al pedir la autorización y muestra el verifier al canjear el código: quien intercepte el código no lo puede usar.',
          },
          {
            term: 'registro dinámico',
            detail:
              'RFC 7591: el cliente se registra solo, sin que nadie cargue un client_id a mano. Como cualquiera puede registrarse, los redirect URIs van en una allowlist.',
          },
          {
            term: 'refresh token rotation',
            detail:
              'Cada refresh devuelve un par nuevo y anula el anterior. Si aparece uno ya usado, dos partes lo tienen: se revoca toda la conexión.',
          },
          {
            term: 'audience (RFC 8707)',
            detail:
              'El token dice para qué recurso se emitió y el servidor lo verifica: un token para /api/mcp no sirve en otro lado.',
          },
        ],
        usage: [
          'El endpoint vive en `src/app/api/mcp` (con `mcp-handler`) y el servidor OAuth en `src/lib/oauth`. Solo pueden conectarse admins con 2FA, y se vuelve a chequear en cada request.',
          'Las tools de escritura no reimplementan nada: corren con `runAsUser`, que guarda la sesión del admin en un `AsyncLocalStorage`, y llaman a las mismas server actions que los formularios. `getCurrentSession()` mira primero esa sesión.',
        ],
        examples: [
          {
            file: 'src/lib/acting-user.ts',
            lang: 'ts',
            code: `const acting = new AsyncLocalStorage<SessionWithUser>();

/** Runs \`fn\` with \`session\` as the current session of every server action it calls. */
export const runAsUser = <T>(session: SessionWithUser, fn: () => Promise<T>) =>
  acting.run(session, fn);`,
          },
          {
            file: 'src/lib/oauth/crypto.ts',
            lang: 'ts',
            caption: 'PKCE S256, comparado en tiempo constante',
            code: `export const verifyPkce = (verifier: unknown, challenge: string) => {
  if (typeof verifier !== 'string' || !PKCE_VERIFIER.test(verifier)) return false;
  const expected = Buffer.from(challenge);
  const actual = Buffer.from(pkceChallengeFor(verifier));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};`,
          },
        ],
        docsUrl: 'https://modelcontextprotocol.io/specification/latest/basic/authorization',
        sourcePath: 'src/lib/mcp',
      },
      {
        id: 'aws',
        name: 'AWS S3 + CloudFront',
        tagline: 'archivos subidos directo del navegador',
        what: 'S3 es el almacenamiento de objetos de AWS: guardás archivos (imágenes, videos) en un "bucket" bajo una clave. CloudFront es su CDN: copia esos archivos en servidores cerca de cada visitante. Una URL prefirmada es un permiso temporal firmado por el servidor para que el navegador suba o baje un archivo puntual sin conocer las credenciales.',
        concepts: [
          {
            term: 'URL prefirmada',
            detail:
              'El archivo va del navegador a S3 sin pasar por nuestro servidor, que solo firma el permiso (válido 5 minutos).',
          },
          {
            term: 'Cache-Control immutable',
            detail:
              'Si la clave cambia cada vez que cambia el archivo, se puede cachear para siempre.',
          },
          {
            term: 'remotePatterns',
            detail:
              'Lista de dominios desde los que `next/image` acepta optimizar imágenes remotas.',
          },
        ],
        usage: [
          'Los flyers de eventos, las fotos de perfil, los logos de proyectos y la galería se guardan en S3 y se sirven por CloudFront.',
          'Los archivos de la galería son privados: CloudFront solo los entrega con una URL firmada que generamos al renderizar. Cómo se optimizan las fotos y los videos antes de llegar ahí está en la nota de la galería, más abajo.',
        ],
        examples: [
          {
            file: 'src/lib/s3.ts',
            lang: 'ts',
            code: `const uniqueFileName = \`\${folder}/\${Date.now()}-\${crypto.randomUUID()}.\${extension}\`;

const command = new PutObjectCommand({
  Bucket: S3_BUCKET,
  Key: uniqueFileName,
  ContentType: contentType,
});

// URL válida por 5 minutos
// Firmar host y content-type para que el navegador pueda enviar el content-type correcto
const uploadUrl = await getSignedUrl(s3Client, command, {
  expiresIn: 300,
  signableHeaders: new Set(['host', 'content-type']),
});

return { uploadUrl, fileUrl: publicFileUrl(uniqueFileName), key: uniqueFileName };`,
          },
          {
            file: 'next.config.mjs',
            lang: 'js',
            code: `// CloudFront CDN for uploaded event flyers / photos
...(process.env.AWS_CLOUDFRONT_URL
  ? [{ protocol: 'https', hostname: new URL(process.env.AWS_CLOUDFRONT_URL).hostname }]
  : []),`,
          },
        ],
        docsUrl: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html',
      },
      {
        id: 'email',
        name: 'Resend + React Email + MailHog',
        tagline: 'emails reales en prod, atrapados en local',
        what: 'Resend es un servicio para mandar emails desde código con una API: se verifica el dominio una vez (registros DNS) y cada email es una llamada con el remitente, el destinatario y el HTML. React Email permite escribir el contenido del email como un componente de React y convertirlo a HTML con `render`. MailHog es un servidor SMTP falso para desarrollo: acepta todos los emails y los muestra en una interfaz web, así podés probar flujos de verificación sin mandarle nada a nadie; en local Nodemailer le habla por SMTP.',
        concepts: [
          {
            term: 'SMTP',
            detail: 'El protocolo con el que los servidores se pasan emails.',
          },
          {
            term: 'dominio verificado',
            detail:
              'Resend solo manda desde direcciones de un dominio que probaste que es tuyo con registros DNS (SPF y DKIM), que además evitan que los emails caigan en spam.',
          },
        ],
        usage: [
          'Los códigos de verificación de cuenta y de recuperación de contraseña se mandan por email. Las plantillas son componentes en `src/components/auth` con estilos inline (los clientes de email ignoran casi todo el CSS externo) y `@react-email/render` las convierte a HTML. En producción salen por Resend; con Docker Compose, MailHog queda en http://localhost:18025 para ver lo que el sitio "envió".',
        ],
        examples: [
          {
            file: 'src/lib/email.ts',
            lang: 'ts',
            code: `const { error } = await new Resend(apiKey).emails.send({
  from: formatSender(getSender()),
  to,
  subject,
  html,
});
if (error) throw new Error(\`Resend: \${error.message}\`);`,
          },
          {
            file: 'src/actions/auth/send-verification-code.ts',
            lang: 'ts',
            code: `// Enviar email con el código
const emailHtml = await render(EmailVerificationEmail({ userName: user.name, code }));
await sendEmail({
  to: user.email,
  subject: 'Verificá tu correo electrónico - programaConNosotros',
  html: emailHtml,
});`,
          },
        ],
        docsUrl: 'https://nodemailer.com/about/',
      },
      {
        id: 'github-api',
        name: 'GitHub REST API',
        tagline: 'las estadísticas de esta página',
        what: 'GitHub expone una API REST pública para leer repos, commits, pull requests y contribuidores. Sin token permite 60 requests por hora por IP; con token, muchas más. Algunos endpoints de estadísticas se calculan en segundo plano y responden `202` hasta que el resultado está listo.',
        concepts: [
          {
            term: 'paginación',
            detail:
              'Las listas vienen de a páginas; el header `Link` trae la URL de la última página, que sirve para contar sin bajar todo.',
          },
          {
            term: 'snapshot',
            detail:
              'En vez de pedirle los números a GitHub en cada visita, un script los baja una vez y los guarda en un JSON que se commitea: la página no depende de que GitHub responda ni del límite de requests.',
          },
          {
            term: 'Promise.all',
            detail: 'Los pedidos independientes salen en paralelo en vez de uno atrás del otro.',
          },
        ],
        usage: [
          'La sección "Estadísticas de colaboración" de esta página, las contribuciones de cada perfil y /vinculos leen `src/data/github-stats.json`. Ese archivo lo genera `pnpm github:stats` (`scripts/update-github-stats.mjs`): estrellas, commits, PRs mergeadas, tiempo mediano hasta el merge, lenguajes, líneas de código y el detalle de cada contribuidor. El sitio nunca llama a GitHub mientras renderiza.',
        ],
        examples: [
          {
            file: 'scripts/update-github-stats.mjs',
            lang: 'js',
            code: `/** A /stats/* endpoint, or \`null\` if GitHub is still computing it after every retry. */
const githubStats = async (path) => {
  for (let attempt = 1; attempt <= STATS_ATTEMPTS; attempt++) {
    const response = await github(path);
    if (response.status === 200) return response.json();
    await new Promise((resolve) => setTimeout(resolve, STATS_RETRY_MS));
  }
  console.warn(\`! \${path}: GitHub todavía lo está calculando, queda el valor anterior\`);
  return null;
};

/** Total item count of a paginated endpoint, read from the \`rel="last"\` page of \`per_page=1\`. */
const countFromLinkHeader = (response, fallback) => {
  const match = response.headers.get('link')?.match(/[?&]page=(\\d+)>; rel="last"/);
  return match ? Number(match[1]) : fallback;
};`,
          },
        ],
        docsUrl: 'https://docs.github.com/en/rest',
      },
    ],
  },
  {
    id: 'calidad',
    title: 'testing y calidad',
    notes: [
      {
        id: 'jest',
        name: 'Jest',
        tagline: 'tests unitarios de las server actions',
        what: 'Jest es un framework de testing para JavaScript: corre archivos `*.test.ts`, te da `describe`/`it`/`expect` y un sistema de mocks para reemplazar dependencias (la base, las cookies) por dobles controlados. Un test unitario prueba una unidad aislada: rápido y determinista.',
        concepts: [
          {
            term: 'jest.mock',
            detail:
              'Reemplaza un módulo entero. Se "hoistea" arriba del archivo, antes de los imports.',
          },
          {
            term: 'mockDeep',
            detail:
              '`jest-mock-extended` crea un mock tipado de todo el cliente de Prisma, con cada método como `jest.fn()`.',
          },
          {
            term: 'Arrange · Act · Assert',
            detail:
              'Preparás los mocks, llamás a la función y verificás el resultado y los efectos.',
          },
        ],
        usage: [
          'Cada server action tiene su test al lado (`sign-in.ts` → `sign-in.test.ts`). `jest.setup.ts` mockea globalmente Prisma, `next/headers`, `next/cache` y `next/navigation`, así los tests no necesitan base ni servidor.',
        ],
        examples: [
          {
            file: 'jest.setup.ts',
            lang: 'ts',
            code: `jest.mock('@/lib/prisma', () => {
  const { mockDeep } = require('jest-mock-extended');
  return {
    __esModule: true,
    default: mockDeep(),
  };
});
// …
// redirect() normally throws to interrupt control flow; replicate that here so
// tests can assert on it with .rejects.toThrow('NEXT_REDIRECT:/some/path')
jest.mock('next/navigation', () => ({
  redirect: jest.fn().mockImplementation((url: string) => {
    throw new Error(\`NEXT_REDIRECT:\${url}\`);
  }),
}));`,
          },
          {
            file: 'src/actions/auth/sign-in.test.ts',
            lang: 'ts',
            code: `it('returns INVALID_CREDENTIALS when password is wrong', async () => {
  prismaMock.user.findUnique.mockResolvedValue(baseUser as any);
  (bcryptMock.compare as jest.Mock).mockResolvedValue(false);

  const result = await signIn(validInput);

  expect(result).toEqual({ success: false, error: 'INVALID_CREDENTIALS' });
  expect(prismaMock.session.create).not.toHaveBeenCalled();
});`,
          },
        ],
        docsUrl: 'https://jestjs.io/docs/getting-started',
      },
      {
        id: 'playwright',
        name: 'Playwright',
        tagline: 'un navegador de verdad, manejado por código',
        what: 'Playwright controla Chromium, Firefox y WebKit desde código. Sirve para tests end-to-end (abrir la página, hacer clic, verificar lo que se ve, como lo haría una persona) y para automatizar el navegador en general, por ejemplo sacar capturas.',
        concepts: [
          {
            term: 'E2E',
            detail:
              'Prueba el sistema entero: frontend, backend y base juntos. Más lento que un unitario, pero agarra errores de integración.',
          },
          {
            term: 'locators',
            detail:
              '`page.getByRole(…)` busca elementos como los ve un usuario (rol y texto) y no por clases CSS frágiles.',
          },
          {
            term: 'projects',
            detail:
              'Un mismo test corre en varios navegadores o tamaños de pantalla: acá, Desktop Chrome y un Pixel 7 para los specs mobile.',
          },
        ],
        usage: [
          'La suite E2E de regresión está en `tests/e2e/` y corre una vez por semana con `pnpm test:e2e`: recrea una base con datos de prueba, compila la app y la recorre en Chromium (desktop y mobile), con un test por caso de /desarrollo/calidad. Además usamos Playwright para las capturas de las PRs: `pnpm screenshot /ruta` abre cada ruta en Chromium y guarda la página completa.',
        ],
        examples: [
          {
            file: 'tests/e2e/smoke.spec.ts',
            lang: 'ts',
            code: `test.describe('signed in as a member', () => {
  test.use({ as: 'member' });

  test('the session from auth.setup works', async ({ page, db }) => {
    await page.goto('/notificaciones');
    await expect(page).toHaveURL(/\\/notificaciones/);
  });
});`,
          },
          {
            file: 'scripts/pr-screenshots.mjs',
            lang: 'js',
            code: `const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
});

for (const route of routes) {
  // …
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.screenshot({ path: outPath, fullPage: true });
  await page.close();
}`,
          },
        ],
        docsUrl: 'https://playwright.dev/docs/intro',
      },
      {
        id: 'git-hooks',
        name: 'ESLint · Prettier · Husky',
        tagline: 'la calidad se chequea sola antes de pushear',
        what: 'ESLint analiza el código buscando errores y malas prácticas (por ejemplo, romper las reglas de los hooks). Prettier lo formatea siempre igual, así nadie discute de comas. Husky instala git hooks: scripts que git corre antes de un commit o de un push. lint-staged corre comandos solo sobre los archivos que estás commiteando.',
        concepts: [
          {
            term: 'pre-commit',
            detail: 'Corre al hacer `git commit`. Acá: Prettier sobre los archivos staged.',
          },
          {
            term: 'pre-push',
            detail:
              'Corre al hacer `git push` y lo cancela si algo falla: lint, formato, tests y build.',
          },
          {
            term: 'eslint-config-prettier',
            detail: 'Apaga las reglas de ESLint que se pisarían con Prettier.',
          },
        ],
        usage: [
          'Prettier usa `prettier-plugin-tailwindcss`, que además ordena las clases de Tailwind en un orden consistente.',
        ],
        examples: [
          {
            file: '.husky/pre-push',
            lang: 'sh',
            code: `pnpm lint
pnpm format:check
pnpm test
pnpm build`,
          },
          {
            file: 'package.json',
            lang: 'json',
            code: `"lint-staged": {
  "*.{js,jsx,ts,tsx,json,jsonc,css,scss,md,mjs,cjs}": "prettier --write"
}`,
          },
        ],
        docsUrl: 'https://typicode.github.io/husky/',
      },
    ],
  },
  {
    id: 'infra',
    title: 'infraestructura',
    notes: [
      {
        id: 'docker',
        name: 'Docker y Docker Compose',
        tagline: 'el mismo entorno en todas las máquinas',
        what: 'Docker empaqueta una aplicación con todo lo que necesita (sistema, Node, dependencias) en una imagen; un contenedor es esa imagen corriendo, aislado del resto. Docker Compose levanta varios contenedores relacionados (web, base, mail) con un solo comando y los conecta en una red privada donde se encuentran por nombre.',
        concepts: [
          {
            term: 'Dockerfile',
            detail: 'La receta paso a paso para construir la imagen.',
          },
          {
            term: 'volúmenes',
            detail:
              'Montan carpetas del host en el contenedor: así el código que editás se ve adentro sin reconstruir.',
          },
          {
            term: 'healthcheck + depends_on',
            detail:
              'La web arranca recién cuando Postgres responde, no cuando su contenedor apenas existe.',
          },
        ],
        usage: [
          '`docker-compose up -d` levanta la web, Postgres y MailHog para desarrollar. En producción se construye `Dockerfile.prod`, que instala dependencias y hace el build de Next dentro de la imagen.',
        ],
        examples: [
          {
            file: 'Dockerfile.prod',
            lang: 'dockerfile',
            code: `FROM node:24.21.0
WORKDIR /app
COPY . .
RUN npm install -g pnpm@9.4.0
RUN pnpm install \\
		&& pnpm run build
EXPOSE 3000
CMD ["pnpm", "start"]`,
          },
          {
            file: 'docker-compose.yml',
            lang: 'yaml',
            code: `web:
  build: .
  container_name: pcn-web
  restart: always
  ports:
    - '3000:3000'
  volumes:
    - .:/app
    - /app/node_modules
  depends_on:
    database:
      condition: service_healthy
    mailhog:
      condition: service_started`,
          },
        ],
        docsUrl: 'https://docs.docker.com/get-started/',
      },
      {
        id: 'kamal',
        name: 'Kamal + GitHub Actions',
        tagline: 'push a main = deploy a producción',
        what: 'GitHub Actions ejecuta workflows (CI/CD) en máquinas de GitHub cuando pasa algo en el repo, por ejemplo un push. Kamal es una herramienta de deploy: construye la imagen Docker, la sube a un registry, se conecta por SSH a tus servidores y reemplaza el contenedor viejo por el nuevo sin downtime, con un proxy que maneja HTTPS.',
        concepts: [
          {
            term: 'CI/CD',
            detail:
              'Integración y entrega continuas: cada cambio aprobado llega a producción de forma automática y repetible.',
          },
          {
            term: 'registry',
            detail:
              'Donde se guardan las imágenes construidas (en este caso, Amazon ECR) para que el servidor las descargue.',
          },
          {
            term: 'zero-downtime',
            detail:
              'kamal-proxy solo pasa el tráfico al contenedor nuevo cuando responde bien; recién ahí apaga el viejo.',
          },
          {
            term: 'secretos',
            detail:
              'Las credenciales viven en GitHub Secrets y llegan como variables de entorno; nunca se commitean.',
          },
          {
            term: 'lifecycle policy',
            detail:
              'Reglas con las que el registry borra solo las imágenes viejas. Sin ellas, cada deploy suma una imagen de más de 1 GB que se paga para siempre.',
          },
        ],
        usage: [
          'Trabajamos en branches, las mergeamos a `testing` y de ahí a `main`. Cada push a `main` dispara el workflow: instala dependencias, aplica las migraciones pendientes con `prisma migrate deploy` y corre `kamal deploy`. El healthcheck que usa Kamal es la ruta `/up`.',
          'ECR conserva las últimas 10 imágenes con tag, que alcanzan para volver atrás con `kamal rollback`, y borra las imágenes sin tag (capas de builds intermedios) un día después de subidas. La política está versionada en `config/ecr-lifecycle-policy.json`; si la cambiás, aplicala con `aws ecr put-lifecycle-policy`.',
        ],
        examples: [
          {
            file: '.github/workflows/deployment.yml',
            lang: 'yaml',
            code: `on:
  workflow_dispatch:
  push:
    branches:
      - main
# …
      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run Prisma Migrations
        run: pnpm prisma migrate deploy

      - name: Run Kamal deploy
        run: kamal deploy`,
          },
          {
            file: 'config/deploy.yml',
            lang: 'yaml',
            code: `service: pcn-website
# …
proxy:
  hosts:
    - programaconnosotros.com
    - origin.programaconnosotros.com
  ssl: true
  app_port: 3000
# …
builder:
  arch: amd64
  context: .
  dockerfile: Dockerfile.prod
  cache:
    type: gha`,
          },
          {
            file: 'config/ecr-lifecycle-policy.json',
            lang: 'json',
            code: `{
  "rulePriority": 1,
  "description": "Keep the last 10 deployed images (for kamal rollback)",
  "selection": {
    "tagStatus": "tagged",
    "tagPatternList": ["*"],
    "countType": "imageCountMoreThan",
    "countNumber": 10
  },
  "action": { "type": "expire" }
}`,
          },
        ],
        docsUrl: 'https://kamal-deploy.org/docs/installation/',
      },
      {
        id: 'portless',
        name: 'pnpm · portless · worktrees',
        tagline: 'un entorno local por branch, sin pelear por puertos',
        what: 'pnpm es un package manager que guarda cada versión de cada paquete una sola vez en disco y la enlaza en cada proyecto: instala rápido y es estricto con las dependencias no declaradas. portless le da a cada servidor de desarrollo una URL estable `https://<nombre>.localhost` en vez de un puerto. Los git worktrees permiten tener varias branches del mismo repo en carpetas distintas al mismo tiempo.',
        concepts: [
          {
            term: 'lockfile',
            detail:
              '`pnpm-lock.yaml` fija la versión exacta de cada dependencia; `--frozen-lockfile` falla si no coincide con `package.json`.',
          },
          {
            term: 'overrides',
            detail:
              'Fuerzan la versión de una dependencia transitiva, por ejemplo para tapar una vulnerabilidad.',
          },
          {
            term: 'git worktree',
            detail:
              'Otra carpeta con otra branch del mismo repo, sin clonar de nuevo: ideal para revisar una PR sin frenar lo tuyo.',
          },
        ],
        usage: [
          '`pnpm dev` corre Next a través de portless: el checkout principal responde en `https://pcn-website.localhost` y un worktree en la branch `foo` en `https://foo.pcn-website.localhost`. Cada worktree tiene su propia base de datos, creada automáticamente.',
        ],
        examples: [
          {
            file: 'package.json',
            lang: 'json',
            code: `"dev": "portless run next dev",
"dev:docker": "next dev",
"setup-worktree-db": "bash scripts/setup-worktree-db.sh",`,
          },
          {
            file: 'scripts/setup-worktree-db.sh',
            lang: 'bash',
            code: `# ── 4. Derive the per-worktree database name ─────────────────────────────────
WORKTREE_BASENAME=$(basename "$CUR")
# lowercase, replace non-alphanumeric runs with _, strip trailing underscores
DB_NAME="pcn_$(echo "$WORKTREE_BASENAME" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '_' | sed 's/_*$//')"`,
          },
        ],
        docsUrl: 'https://pnpm.io/motivation',
      },
    ],
  },
  {
    id: 'modulos',
    title: 'módulos del sitio',
    notes: [
      {
        id: 'galeria',
        name: 'Galería · fotos y videos optimizados',
        tagline: 'del celular a la CDN: WebP, H.264 y URLs firmadas',
        what: 'Optimizar medios es achicar lo que baja cada visitante sin que se note: redimensionar al tamaño en que realmente se va a ver, recomprimir en formatos modernos (WebP para fotos, H.264 en MP4 para video), borrar metadatos que no hacen falta y servir una versión chica (thumbnail) en las grillas y la grande solo cuando alguien la abre. Una foto de celular pesa entre 3 y 10 MB y un minuto de video 4K cientos de MB; servidos tal cual, una grilla de fotos se vuelve inusable con datos móviles.',
        concepts: [
          {
            term: 'WebP',
            detail:
              'Formato de imagen de Google que pesa bastante menos que JPEG a calidad similar y que hoy soportan todos los navegadores.',
          },
          {
            term: 'EXIF',
            detail:
              'Metadatos que la cámara guarda en la foto: fecha, modelo, orientación y, muchas veces, la ubicación GPS exacta. Publicarlos tal cual es un problema de privacidad.',
          },
          {
            term: 'orientación',
            detail:
              'El sensor guarda la foto siempre "acostada" y un flag EXIF dice cómo girarla. Si borrás los metadatos sin aplicar antes ese giro, la foto queda de costado.',
          },
          {
            term: 'thumbnail',
            detail:
              'Versión chica de la imagen para grillas y listados. La original solo se descarga al abrirla.',
          },
          {
            term: 'WebCodecs',
            detail:
              'API del navegador que da acceso a los encoders y decoders de video del sistema: permite recomprimir un video en la compu del que lo sube, sin servidores de transcodificación.',
          },
          {
            term: 'H.264 vs HEVC',
            detail:
              'Codecs de video. Los iPhone graban en HEVC, que no todos los navegadores reproducen; H.264 en un MP4 se ve en todos lados.',
          },
          {
            term: 'fast start',
            detail:
              'Poner el índice del MP4 (el átomo `moov`) al principio del archivo para que el video arranque mientras se sigue descargando.',
          },
          {
            term: 'presigned POST',
            detail:
              'A diferencia del PUT prefirmado, lleva una policy con condiciones que S3 hace cumplir, como `content-length-range` para limitar el tamaño.',
          },
          {
            term: 'URL firmada de CloudFront',
            detail:
              'URL con una firma y una fecha de vencimiento: sin ella la CDN no entrega el archivo, así nadie puede listar ni enlazar los archivos para siempre.',
          },
          {
            term: 'loading="lazy"',
            detail:
              'El navegador posterga la descarga de una imagen hasta que está por entrar en pantalla.',
          },
        ],
        usage: [
          'Solo los admins suben contenido, desde `/galeria/subir`. Los archivos nunca pasan por nuestro servidor de ida: el navegador los manda directo a S3 con URLs prefirmadas, de a uno por vez, y después una server action termina el trabajo. Mientras sube, la página pide un wake lock para que el celular no apague la pantalla y avisa antes de cerrar la pestaña.',
          'Fotos: en el navegador, `exifr` lee la fecha en que se sacó (`DateTimeOriginal` o `CreateDate`, y si no hay EXIF la fecha del archivo) para precompletar el formulario. Las fotos HEIC de iPhone se convierten a JPEG en el navegador con `heic-to` (libheif en un worker, cargado solo cuando hace falta), después de leer la fecha, porque sharp no decodifica HEIC. El original va a `gallery/originals/` con un PUT prefirmado de 5 minutos; después `createPhoto` lo baja, `optimizePhoto` lo gira según el EXIF y genera dos WebP sin metadatos (GPS incluido): `full` de 2560 px a calidad 80 y `thumb` de 640 px a calidad 70. Se guardan bajo una carpeta con UUID, se borra el original y se crea el `GalleryItem` con el ancho y el alto.',
          'Videos: antes de subirlo, `readVideo` carga el archivo en un `<video>` oculto para leer duración y medidas y captura un cuadro (al segundo 1, o a un décimo en clips cortos) en un canvas como portada JPEG de hasta 1280 px; si el navegador no puede, la portada es negra. Después `compressVideo` lo recodifica en el navegador con Mediabunny (WebCodecs): H.264 + AAC en MP4 con fast start, lado corto de hasta 1080 px, hasta 30 fps y 5 Mbps, más o menos 40 MB por minuto. Si el navegador no puede (sin `VideoEncoder`, o Firefox, que no codifica AAC y perdería el audio) o el resultado no es más chico, se sube el original.',
          'El video se sube con un presigned POST de 15 minutos cuya policy rechaza más de 500 MB. `createVideo` verifica con un HEAD que el archivo llegó y convierte la portada a WebP (1280 px, calidad 75) con sharp. No hay ffmpeg ni transcodificación en el servidor: todo el trabajo pesado lo hace el navegador de quien sube.',
          'Todo lo que está bajo `gallery/` se guarda con `Cache-Control: public, max-age=31536000, immutable` (cada archivo nuevo es una clave nueva, así que nunca hay que invalidar caché) y CloudFront solo lo entrega con URL firmada. `signGalleryItem` firma al renderizar la página, con vencimiento al final de la hora siguiente: la misma foto tiene la misma URL durante toda una hora, así el navegador y la CDN la cachean.',
          'En la UI, la grilla usa solo los thumbnails de 640 px con `<img loading="lazy" decoding="async">`; al pasar las 94 fotos viejas a thumbnails, la grilla pasó de ~16 MB a 3,3 MB. Cada foto o video tiene su página `/galeria/[id]` con la versión grande o un `<video preload="metadata">` con la portada, que reproduce el MP4 progresivo y salta con range requests. Las flechas del teclado navegan y `router.prefetch` precalienta las vecinas. Los filtros por tipo, evento y persona viven en la URL, y la descarga del original pasa por `/api/galeria/[id]/descargar`, con rate limit de 30 por hora, que devuelve una URL prefirmada de S3 con `Content-Disposition: attachment`.',
        ],
        examples: [
          {
            file: 'src/lib/photo-processing.ts',
            lang: 'ts',
            caption:
              '`.rotate()` sin argumentos aplica la orientación del EXIF; sharp no copia los metadatos a la salida salvo que se lo pidas, así que el GPS desaparece. `clone()` reusa la misma decodificación para las dos versiones.',
            code: `export const FULL_SIZE = 2560;
export const THUMB_SIZE = 640;

const resize = { fit: 'inside', withoutEnlargement: true } as const;

export async function optimizePhoto(input: Buffer) {
  const image = sharp(input, { failOn: 'none' }).rotate();

  const [full, thumb] = await Promise.all([
    image
      .clone()
      .resize({ width: FULL_SIZE, height: FULL_SIZE, ...resize })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true }),
    image
      .clone()
      .resize({ width: THUMB_SIZE, height: THUMB_SIZE, ...resize })
      .webp({ quality: 70 })
      .toBuffer(),
  ]);

  return { full: full.data, thumb, width: full.info.width, height: full.info.height };
}`,
          },
          {
            file: 'src/components/photo-gallery/upload-media.ts',
            lang: 'ts',
            caption:
              'La fecha de la foto sale del EXIF en el navegador. `exifr` se importa dinámicamente para no sumarlo al bundle de las páginas que no suben fotos.',
            code: `export async function readTakenAt(file: File) {
  if (!isVideo(file)) {
    try {
      const { default: exifr } = await import('exifr');
      const exif = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate']);
      const date = exif?.DateTimeOriginal ?? exif?.CreateDate;
      if (date instanceof Date && !Number.isNaN(date.getTime())) return date;
    } catch {
      // No EXIF: fall back to the file date.
    }
  }
  return new Date(file.lastModified);
}`,
          },
          {
            file: 'src/components/photo-gallery/upload-media.ts',
            lang: 'ts',
            caption:
              'La compresión de video corre en el navegador. Si la conversión perdiera una pista (audio o video) o el navegador no puede codificar H.264, devuelve `null` y se sube el original.',
            code: `// Videos are re-encoded in the browser before uploading: H.264 (plays everywhere, unlike the
// HEVC iPhones record) with the short side capped at 1080p, at a bitrate that keeps a minute
// around 40 MB instead of the hundreds a 4K phone clip weighs.
const COMPRESSED_MAX_SHORT_SIDE = 1080;
// 60 fps phone clips come out at twice the bitrate; 30 is plenty for event videos.
const COMPRESSED_MAX_FRAME_RATE = 30;
const COMPRESSED_VIDEO_BITRATE = 5_000_000;
const COMPRESSED_AUDIO_BITRATE = 128_000;
// …
    if (!(await canEncodeVideo('avc', { ...size, quality }))) return null;

    const target = new BufferTarget();
    const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target });
    const conversion = await Conversion.init({
      input,
      output,
      tracks: 'primary',
      video: {
        codec: 'avc',
        ...size,
        fit: 'contain',
        frameRate,
        quality,
        // Bake the phone's rotation into the frames so every player shows it upright.
        allowTransformationMetadata: false,
        forceTranscode: true,
      },
      audio: { codec: 'aac', quality: new Quality({ bitrate: COMPRESSED_AUDIO_BITRATE }) },
      showWarnings: false,
    });
    // Keep both picture and sound: Firefox, for one, can't encode AAC and would drop the audio.
    const audioTrack = await input.getPrimaryAudioTrack();
    const keepsAll = [track, audioTrack].every((t) => !t || conversion.utilizedTracks.includes(t));
    if (!conversion.isValid || !keepsAll) return null;`,
          },
          {
            file: 'src/components/photo-gallery/photo-uploader.tsx',
            lang: 'tsx',
            caption:
              'El flujo de un video: comprimir, subir con POST firmado, subir la portada y recién ahí crear el registro.',
            code: `if (item.video) {
  update(item.key, { status: 'compressing' });
  const compressed = await compressVideo(item.file, (progress) =>
    update(item.key, { progress }),
  ).catch(() => null);
  const file = compressed?.file ?? item.file;

  update(item.key, { status: 'uploading', progress: 0, uploadedSize: compressed?.file.size });
  const { url, fields, key } = await getVideoUploadUrl(file.type, file.size);
  await postFile(url, fields, file, (progress) => update(item.key, { progress }));

  const poster = await getPhotoUploadUrl('poster.jpg', 'image/jpeg');
  await putFile(poster.uploadUrl, item.video.poster, 'image/jpeg');

  created = await createVideo(key, poster.key, {
  // …`,
          },
          {
            file: 'src/lib/s3.ts',
            lang: 'ts',
            caption:
              'Con un POST firmado es S3 el que rechaza un archivo de más de `maxBytes`, aunque alguien manipule el navegador.',
            code: `export async function getPresignedPost(key: string, contentType: string, maxBytes: number) {
  return createPresignedPost(s3Client, {
    Bucket: S3_BUCKET,
    Key: key,
    Conditions: [
      ['content-length-range', 1, maxBytes],
      ['eq', '$Content-Type', contentType],
    ],
    Fields: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000, immutable' },
    Expires: 15 * 60,
  });
}`,
          },
          {
            file: 'src/lib/gallery-signing.ts',
            lang: 'ts',
            caption:
              'El vencimiento se redondea a la hora para que la URL no cambie en cada render y se pueda cachear.',
            code: `export function signGallerySrc(src: string, now = Date.now()) {
  const expiresAt = new Date(Math.ceil(now / HOUR_MS) * HOUR_MS + HOUR_MS);
  if (!isSignedGallerySrc(src)) return { url: src, expiresAt };
  if (!KEY_PAIR_ID || !PRIVATE_KEY) throw new Error('Falta configurar la firma de CloudFront');

  const url = getSignedUrl({
    url: src,
    keyPairId: KEY_PAIR_ID,
    privateKey: PRIVATE_KEY,
    dateLessThan: expiresAt.toISOString(),
  });
  return { url, expiresAt };
}
// …
export const signGalleryItem = <T extends { src: string; thumbSrc: string }>(item: T) => ({
  ...item,
  thumbUrl: signGallerySrc(item.thumbSrc).url,
  fullUrl: signGallerySrc(item.src).url,
});`,
          },
          {
            file: 'src/components/photo-gallery/photo-card.tsx',
            lang: 'tsx',
            caption:
              'En la grilla solo se cargan los thumbnails, y recién cuando están por entrar en pantalla.',
            code: `{/* eslint-disable-next-line @next/next/no-img-element */}
<img
  src={photo.thumbUrl}
  alt=""
  loading="lazy"
  decoding="async"
  className="h-full w-full object-cover object-top brightness-[0.8] saturate-[0.7] …"
/>`,
          },
        ],
        docsUrl: 'https://sharp.pixelplumbing.com/api-output#webp',
        sourcePath: 'src/components/photo-gallery',
      },
      {
        id: 'eventos',
        name: 'Eventos · variantes, permisos y calendario',
        tagline: 'un solo modelo para meetups, coworks, online y multi-día',
        what: 'Un módulo de eventos resuelve siempre lo mismo: publicar qué pasa, cuándo y dónde, decidir quién puede crearlo y gestionarlo, y ayudar a la gente a llegar (agendarlo, encontrar el lugar, inscribirse). La clave de diseño es cubrir muchas variantes con un solo modelo y campos opcionales en vez de tablas distintas por tipo de evento.',
        concepts: [
          {
            term: 'campos opcionales como variantes',
            detail:
              'Un `endDate` nulo es un evento de un día; `isOnline` cambia la dirección por un link de streaming; `capacity` nulo es cupo ilimitado. La UI y la validación se adaptan a cada combinación.',
          },
          {
            term: 'soft delete',
            detail:
              'Borrar un evento solo le pone `deletedAt`: las inscripciones, charlas y fotos quedan, y todas las consultas filtran `deletedAt: null`.',
          },
          {
            term: 'permisos por recurso',
            detail:
              'Además de roles globales (admin), hay permisos sobre cada evento: quién lo creó y quiénes lo organizan.',
          },
          {
            term: 'funciones puras de permisos',
            detail:
              'Las reglas viven en funciones sin acceso a la base, fáciles de testear; un wrapper aparte busca los datos y las aplica.',
          },
          {
            term: 'iCalendar (.ics)',
            detail:
              'Formato estándar (RFC 5545) que entienden Google Calendar, Apple Calendar y Outlook. Es texto plano con líneas `CLAVE:valor` de hasta 75 bytes.',
          },
          {
            term: 'slug reutilizable',
            detail:
              'Un atajo como `/cowork` no apunta a un evento fijo sino al próximo que tenga ese slug, ideal para series que se repiten.',
          },
        ],
        usage: [
          'El modelo `Event` cubre todas las variantes: presencial (con `placeName`, `address`, `city`, y un link de Google Maps opcional, `googleMapsUrl`, del que salen el mapa embebido y el link "abrir en Google Maps") u online (`isOnline` + `streamingUrl`); de un día o de varios (`endDate`); con cupo (`capacity`) o sin límite; con inscripción propia o externa (`externalRegistrationUrl`, por ejemplo Luma); con convocatoria de charlas (`callForSpeakersEnabled`); con un "cupo completo" manual (`markedAsFull`); con uno o varios flyers (`flyerImages`, un carrusel que se ordena al subirlo) y sponsors. El schema de Zod pide lugar, ciudad y dirección solo si el evento no es online.',
          'Hay tres niveles de permisos: los admins pueden todo; los ambassadors (`isAmbassador`) crean eventos y editan o eliminan los que crearon; y cualquier usuario cargado como organizador puede editar el evento y gestionar sus inscripciones, charlas y propuestas. Quien crea un evento queda como organizador automáticamente, y elegir organizadores (con un buscador de miembros) queda para quien lo creó. Los eventos organizados aparecen en el perfil de cada persona.',
          'Convocatoria de charlas: si está activa, el evento muestra "proponer →" y cualquiera con sesión manda una propuesta con título, descripción y uno o más speakers (precompletado con su perfil). Quienes gestionan el evento la aceptan o rechazan (`PENDING`, `ACCEPTED`, `REJECTED`) y con un clic la convierten en una `Talk`, que también aparece en `/charlas`. Las nuevas propuestas e inscripciones generan notificaciones in-app para los admins.',
          'Mientras el evento no terminó, la página ofrece "agregar a Google Calendar" (un link de plantilla con fechas en UTC y zona horaria de Buenos Aires; si no hay hora de fin asume una hora y lo avisa) y "descargar .ics", generado por un route handler. Las fechas se muestran en la zona horaria de quien visita, en formato 24 h.',
          'El campo `shortcut` arma URLs cortas para flyers: `/[shortcut]` busca el próximo evento con ese slug y redirige a él, con sus propias tarjetas de Open Graph. En `/eventos` los próximos se muestran "en cartelera" y los pasados en un "museo" de flyers agrupado por año y numerado desde el Nº 001; el badge de estado ("Inscripciones abiertas", "Cupo completo", "En curso") se recalcula en el cliente cada minuto. Cada evento tiene además sus fotos de la galería, sus anuncios y una imagen de Open Graph generada.',
        ],
        examples: [
          {
            file: 'prisma/schema.prisma',
            lang: 'prisma',
            caption: 'Las variantes son columnas opcionales del mismo modelo.',
            code: `model Event {
  id                      String    @id @default(cuid())
  date                    DateTime
  endDate                 DateTime?
  name                    String
  description             String
  city                    String? // Nombre de la ciudad
  address                 String? // Dirección específica (calle, número, etc.)
  placeName               String? // Nombre del lugar (bar, universidad, etc.)
  flyerImages             String[]  @default([])
  googleMapsUrl           String? // Link de Google Maps del lugar; de ahí salen el mapa y los links
  capacity                Int? // Cupo máximo del evento (opcional)
  externalRegistrationUrl String? // URL externa de inscripción (ej: Luma)
  markedAsFull            Boolean   @default(false)
  callForSpeakersEnabled  Boolean   @default(false)
  isOnline                Boolean   @default(false)
  streamingUrl            String?
  shortcut                String? // Slug para URL corta de flyers (ej: "cowork" → /cowork). Reutilizable entre eventos.
  deletedAt               DateTime? // Eliminación lógica
  // …
  createdBy     User?               @relation("UserCreatedEvents", fields: [createdById], references: [id], onDelete: SetNull)
  organizers    EventOrganizer[]
  galleryItems  GalleryItem[]
  registrations EventRegistration[]
  sponsors      Sponsor[]
  announcements Announcement[]
  talkProposals TalkProposal[]
  talks         Talk[]
}`,
          },
          {
            file: 'src/schemas/event-schema.ts',
            lang: 'ts',
            caption:
              '`superRefine` valida reglas que dependen de otro campo: la ubicación es obligatoria solo para eventos presenciales.',
            code: `.superRefine((data, ctx) => {
  if (!data.isOnline) {
    if (!data.city || data.city.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: 2,
        type: 'string',
        inclusive: true,
        message: 'La ciudad debe tener al menos 2 caracteres',
        path: ['city'],
      });
    }
    // … lo mismo para placeName y address`,
          },
          {
            file: 'src/lib/event-permissions.ts',
            lang: 'ts',
            caption: 'Reglas puras, sin base de datos: se testean con objetos armados a mano.',
            code: `export function canCreateEvents(user: EventUser | null | undefined): user is EventUser {
  return !!user && (isSiteAdmin(user) || user.isAmbassador);
}

const isEventCreator = (user: EventUser, event: EventOwnership) =>
  user.isAmbassador && !event.deletedAt && event.createdById === user.id;

// Editar el evento y gestionar sus inscripciones, charlas y propuestas.
export function canEditEvent(user: EventUser | null | undefined, event: EventOwnership) {
  if (isSiteAdmin(user)) return true;
  if (!user || event.deletedAt) return false;
  return (
    isEventCreator(user, event) ||
    event.organizers.some((organizer) => organizer.userId === user.id)
  );
}

// Eliminar el evento y elegir sus organizadores queda para quien lo creó.
export function canDeleteEvent(user: EventUser | null | undefined, event: EventOwnership) {
  if (isSiteAdmin(user)) return true;
  return !!user && isEventCreator(user, event);
}`,
          },
          {
            file: 'src/lib/event-access.ts',
            lang: 'ts',
            caption:
              'El wrapper que usan las páginas (`getEventManager`) y las server actions (`requireEventManager`).',
            code: `/** El usuario logueado si puede gestionar el evento, o null. */
export async function getEventManager(eventId: string) {
  const user = (await getCurrentSession())?.user;
  return (await canManageEventById(user, eventId)) ? user! : null;
}

/** Para Server Actions: lanza un error salvo que quien llama gestione el evento. */
export async function requireEventManager(eventId: string) {
  const user = await getEventManager(eventId);
  if (!user) throw new Error('No autorizado');
  return user;
}`,
          },
          {
            file: 'src/app/(platform)/eventos/[id]/calendario.ics/route.ts',
            lang: 'ts',
            caption:
              'Una carpeta con punto en el nombre sirve un archivo: `/eventos/:id/calendario.ics`.',
            code: `export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await fetchEvent(id);

  if (!event) return new Response('Not found', { status: 404 });

  return new Response(createIcsFile(event), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': \`attachment; filename="pcn-evento-\${event.id}.ics"\`,
      'Cache-Control': 'no-store',
    },
  });
}`,
          },
          {
            file: 'src/lib/google-calendar.ts',
            lang: 'ts',
            code: `const location = event.isOnline
  ? event.streamingUrl
  : [event.placeName, event.address, event.city].filter(Boolean).join(', ');
// …
const url = new URL('https://calendar.google.com/calendar/r/eventedit');

url.searchParams.set('action', 'TEMPLATE');
url.searchParams.set('dates', \`\${utcDateTime(event.date)}/\${utcDateTime(endDate)}\`);
url.searchParams.set('stz', EVENT_TIME_ZONE);
url.searchParams.set('etz', EVENT_TIME_ZONE);
url.searchParams.set('text', event.name);
url.searchParams.set('details', details);
if (location) url.searchParams.set('location', location);`,
          },
          {
            file: 'src/lib/event-shortcuts.ts',
            lang: 'ts',
            caption:
              'Varios eventos comparten el slug (cada cowork usa "cowork"); siempre gana el próximo.',
            code: `export async function findNextEventByShortcut(slug: string) {
  const now = new Date();

  return prisma.event.findFirst({
    where: {
      deletedAt: null,
      shortcut: slug.toLowerCase(),
      OR: [{ date: { gte: now } }, { endDate: { gte: now } }],
    },
    orderBy: { date: 'asc' },
    include: { galleryItems: { where: visibleGalleryItem, select: { src: true }, take: 1 } },
  });
}`,
          },
        ],
        sourcePath: 'src/app/(platform)/eventos',
      },
      {
        id: 'inscripciones',
        name: 'Eventos · inscripciones',
        tagline: 'cupo, inscripción externa, cancelación y gestión',
        what: 'Inscribirse parece un simple INSERT, pero tiene varios casos: la persona no tiene sesión, ya estaba inscripta, se había dado de baja y vuelve, el evento se llenó, o la inscripción se maneja en otra plataforma. Además, quien organiza necesita ver la lista y el perfil del público.',
        concepts: [
          {
            term: 'restricción única',
            detail:
              '`@@unique([eventId, userId])` garantiza en la base una sola fila por persona y evento, aunque lleguen dos pedidos a la vez.',
          },
          {
            term: 'reactivar en vez de duplicar',
            detail:
              'Cancelar pone `cancelledAt`; volver a inscribirse lo vuelve a `null`. Así el historial queda y la restricción única se respeta.',
          },
          {
            term: 'condición de carrera',
            detail:
              'Contar los inscriptos y después insertar son dos pasos: dos personas pueden ver el último lugar libre al mismo tiempo. El error `P2002` de Prisma avisa cuando la base frenó un duplicado.',
          },
          {
            term: 'validar en el servidor',
            detail:
              'La UI esconde el botón cuando no hay cupo, pero la server action vuelve a contar: el cliente nunca es la fuente de verdad.',
          },
          {
            term: 'redirect con intención',
            detail:
              'Si no hay sesión, el botón manda al login con `redirect` y `autoRegister=true`; al volver, la página termina la inscripción sola.',
          },
        ],
        usage: [
          'Inscripción propia (cuando el evento no tiene `externalRegistrationUrl`): hace falta tener cuenta. Sin sesión, el botón lleva a `/iniciar-sesion?redirect=/eventos/:id&autoRegister=true` (también funciona desde el registro); al volver, `EventDetailClient` llama a `registerEvent` sola y muestra un diálogo de confirmación. Con sesión, el botón llama directo a `registerEvent`, que decide en el servidor si hay lugar o si la persona va a la lista de espera.',
          '`registerEvent` tiene rate limit (20 cada 10 minutos) y corre en una transacción que bloquea la fila del evento (`SELECT … FOR UPDATE`), así dos personas no se quedan con el último lugar. Rechaza si ya hay una inscripción activa o si ya está esperando, cuenta las activas contra `capacity` (o respeta `markedAsFull`), reactiva una cancelada o crea una nueva, y notifica a los admins. Cancelar (`cancelRegistration`) solo puede hacerlo la propia persona y es un soft delete; quienes gestionan el evento pueden además borrar una inscripción definitivamente.',
          'Lista de espera propia (`EventWaitlistEntry`): si no hay lugar, `registerEvent` suma a la persona al final de la fila y le muestra su posición. Cuando se libera un lugar (alguien cancela, se borra una inscripción o se edita el cupo), `promoteFromWaitlist` en `src/lib/event-waitlist.ts` inscribe en orden de llegada a quienes esperan, dentro de la misma transacción, y `notifyPromotions` les manda un email y avisa a los admins. Las filas no se borran: `promotedAt` y `cancelledAt` guardan quién consiguió lugar y quién se bajó. No promueve si el evento está marcado como lleno a mano o ya terminó.',
          'Inscripción externa: si el evento tiene `externalRegistrationUrl`, el botón abre esa URL (Luma, por ejemplo) y no se cuenta cupo en el sitio; si está marcado como lleno, el botón pasa a ser `unirmeAListaDeEspera();` y lleva a la lista de espera de esa plataforma. El evento se considera completo si tiene `markedAsFull` o si las inscripciones activas llegaron a `capacity`; la página lo muestra con "Cupo completo" y, si no, con "Quedan N lugares disponibles.".',
          'Quienes gestionan el evento ven `/eventos/[id]/inscripciones`: totales de activas y canceladas, cuántas son de estudiantes y cuántas de profesionales (según el perfil), una tabla de TanStack Table con búsqueda, orden por nombre y fecha, y acción para borrar, y la lista de espera en el orden en que se va a promover. El panel de admin muestra una barra de inscriptos sobre el cupo para cada evento próximo.',
          'Lo que todavía no tiene, por si querés contribuir: check-in con QR, emails de confirmación o recordatorio y exportar la lista a CSV.',
        ],
        examples: [
          {
            file: 'prisma/schema.prisma',
            lang: 'prisma',
            code: `model EventRegistration {
  id          String    @id @default(cuid())
  eventId     String
  userId      String // Usuario registrado (requerido)
  cancelledAt DateTime? // Fecha de cancelación (si fue cancelada)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([eventId, userId])
  @@index([eventId])
  @@index([userId])
  @@index([cancelledAt])
}`,
          },
          {
            file: 'src/lib/event-waitlist.ts',
            lang: 'ts',
            caption:
              'Con la fila del evento bloqueada, los lugares libres pasan a quienes esperan, en orden de llegada.',
            code: `for (;;) {
  if (event.capacity !== null) {
    const active = await tx.eventRegistration.count({
      where: { eventId: event.id, cancelledAt: null },
    });
    if (active >= event.capacity) break;
  }

  const next = await tx.eventWaitlistEntry.findFirst({
    where: activeWaitlistWhere(event.id),
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    include: { user: { select: { name: true, email: true } } },
  });
  if (!next) break;
  // …`,
          },
          {
            file: 'src/components/events/event-detail-client.tsx',
            lang: 'tsx',
            caption:
              'Al volver del login con `autoRegister=true`, la página completa la inscripción una sola vez.',
            code: `useEffect(() => {
  if (
    autoRegister &&
    isAuthenticated &&
    !isRegistered &&
    !isWaitlisted &&
    !hasAutoRegistered &&
    !externalRegistrationUrl
  ) {
    const performAutoRegister = async () => {
      setHasAutoRegistered(true);
      setIsAutoRegistering(true);

      try {
        await registerEvent(eventId, { skipRedirect: true });
        // …`,
          },
          {
            file: 'src/app/(platform)/eventos/[id]/page.tsx',
            lang: 'tsx',
            code: `const isFull = event.markedAsFull || (capacityInfo !== null && !capacityInfo.available);`,
          },
        ],
        sourcePath: 'src/actions/events',
      },
      {
        id: 'pcn-os',
        name: 'PCN OS · un escritorio hecho de iframes',
        tagline: 'ventanas que son páginas reales, carga diferida y tres modos según la compu',
        what: 'Un "escritorio web" imita un sistema operativo dentro del navegador: barra de menú, dock, ventanas que se mueven y se apilan. La decisión que más pesa es qué hay dentro de cada ventana. Renderizar componentes ahí obliga a duplicar ruteo y estado; usar un iframe por ventana reutiliza las páginas reales tal cual, con su scroll, sus diálogos y su diseño responsive al tamaño de la ventana, pero cada ventana pasa a ser una copia entera de la app. El resto del diseño es administrar ese costo: no cargar el escritorio donde no se usa y ofrecer modos más livianos para compus con pocos recursos.',
        concepts: [
          {
            term: 'host y ventana',
            detail:
              'El mismo layout corre en dos roles: el documento de arriba dibuja el escritorio y cada iframe dibuja solo la página. Un atributo en `<html>` (`data-embedded`) dice cuál es cuál.',
          },
          {
            term: 'postMessage',
            detail:
              'Canal entre documentos. Host y ventanas son del mismo origen y se mandan mensajes tipados: a dónde navegó la ventana, que la tocaron, que abra otra ventana, que suene música.',
          },
          {
            term: 'decidir antes del paint',
            detail:
              'Un script inline en el `<head>` marca atributos en `<html>` antes del primer paint, así el CSS muestra el layout correcto desde el primer frame. Decidirlo en JavaScript después de hidratar siempre parpadea.',
          },
          {
            term: 'import() diferido',
            detail:
              'Un `import()` dinámico crea un chunk aparte que solo se descarga cuando se pide. Pedirlo apenas corre el módulo adelanta la descarga a antes de la hidratación.',
          },
          {
            term: 'degradación progresiva',
            detail:
              'Ante poco hardware, apagar primero lo más caro (más iframes vivos, desenfoques, trabajo en cada frame) y dejar el resto, en vez de un todo o nada.',
          },
          {
            term: 'frames largos',
            detail:
              'Un frame de más de 50 ms (menos de 20 fps) es un tirón visible. Medir qué proporción de frames son largos distingue una compu lenta de una pantalla limitada a 30 fps.',
          },
        ],
        usage: [
          'En pantallas de 1024px o más, `PcnOs` reemplaza el layout clásico. Cada programa del dock abre una ventana `OsWindow` con un iframe de la URL real; el estado vive en un `useReducer` (abrir, enfocar, minimizar, maximizar, mover, redimensionar) y el orden de apilado es un array de ids. Cada ventana guarda `src` (con la que se creó el iframe, fija para no recargarlo) y `path` (dónde está ahora). Se mueven desde la barra de título y se redimensionan desde cualquier borde o esquina con pointer events: mientras se arrastra, la ventana se actualiza directo en el DOM una vez por frame (`translate` al mover) y recién al soltar pasa al reducer, así el escritorio no se re-renderiza en cada movimiento. Siempre quedan dentro del escritorio y con un tamaño mínimo. La sesión (ventanas abiertas, su página, posición, tamaño, estado y orden) se guarda en `sessionStorage` (`os-session.ts`): al recargar vuelven todas donde estaban, escaladas si cambió la pantalla, y la de la URL queda al frente.',
          '`OsBridge` corre dentro de cada ventana: avisa a dónde navegó y cuándo la tocaron, y en fase de captura intercepta los links que deben abrir otra ventana (perfiles, detalle de eventos) antes de que `<Link>` navegue. El cursor hacker se dibuja una sola vez en el escritorio: las ventanas le reportan el puntero.',
          'El variant de Tailwind `os:` combina el media query con los atributos de `<html>`; el servidor manda el escritorio (`hidden os:block`) y el layout clásico (`os:hidden`) y el CSS elige. Después de hidratar, `OsGate` desmonta el árbol que no se ve.',
          'El escritorio carga en dos partes: el fondo, la barra de menú y el estado se renderizan en el servidor y nunca se desmontan; el dock, las ventanas, los widgets, el launcher y el reproductor (con framer-motion) viven en `os-desktop-parts.ts` y se importan solo en un escritorio. Celulares, tablets y las páginas dentro de ventanas no los descargan. Como el primer paint no cambia, no hay parpadeo.',
          'Hay tres modos: completo, liviano y clásico. El script del `<head>` elige antes del paint: la elección guardada, o liviano si la compu tiene 4 núcleos o menos, 4 GB o menos, o ahorro de datos. Si nadie eligió, el escritorio además mide sus frames unos segundos: si traba pasa a liviano, y si en liviano sigue trabando sugiere el clásico. Cuando el liviano fue automático, un aviso explica que no se está viendo la experiencia completa por los recursos de la compu. El modo se cambia desde el menú PCN_OS, y las ventanas abiertas lo siguen por el evento `storage`.',
          'El modo liviano apaga, en orden de costo: deja solo 3 ventanas con su página cargada (las demás quedan en pausa y se recargan donde estaban al volver), quita `backdrop-filter` y el brillo desenfocado del fondo, los widgets y el cursor hacker, la magnificación del dock y las animaciones de ventanas. El clásico no tiene escritorio ni iframes. La documentación completa está en `docs/pcn-os-y-rendimiento.md`.',
        ],
        examples: [
          {
            file: 'src/components/os/pcn-os.tsx',
            lang: 'ts',
            caption:
              'La parte pesada del escritorio es un chunk aparte. En un escritorio la descarga arranca apenas corre el módulo; en el resto nunca se pide.',
            code: `let desktopParts: Promise<OsDesktopParts> | null = null;
const loadDesktopParts = () => (desktopParts ??= import('./os-desktop-parts'));

// On a desktop host, start downloading right away, while the page is still hydrating, so the
// dock and the first window show up as early as before. Elsewhere it is never requested.
if (typeof window !== 'undefined' && isOsHost()) void loadDesktopParts();

/** The heavy desktop components, once the desktop is active and they have loaded. */
const useDesktopParts = (enabled: boolean) => {
  const [parts, setParts] = useState<OsDesktopParts | null>(null);
  useEffect(() => {
    if (!enabled || parts) return;
    let cancelled = false;
    void loadDesktopParts().then((loaded) => {
      if (!cancelled) setParts(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, parts]);
  return parts;
};`,
          },
          {
            file: 'src/components/os/pcn-os.tsx',
            lang: 'ts',
            caption:
              'El escritorio solo acepta mensajes de su propio origen y de sus propias ventanas.',
            code: `const onMessage = (event: MessageEvent) => {
  if (event.origin !== window.location.origin || !isOsMessage(event.data)) return;
  const id = [...iframes.current].find(([, f]) => f.contentWindow === event.source)?.[0];
  if (!id) return;
  if (event.data.type === 'focus') dispatch({ type: 'focus', id });
  if (event.data.type === 'location')
    dispatch({ type: 'location', id, path: event.data.path, title: event.data.title });
  if (event.data.type === 'open' && viewport)
    dispatch({ type: 'openPath', path: event.data.path, viewport });
  // …
};`,
          },
          {
            file: 'src/components/os/pcn-os.tsx',
            lang: 'ts',
            caption: 'En liviano, solo las ventanas visibles más recientes mantienen su página.',
            code: `const liveWindowIds = new Set(
  state.order
    .filter((id) => !state.windows.find((win) => win.id === id)?.minimized)
    .slice(-LITE_LIVE_WINDOWS),
);`,
          },
          {
            file: 'src/components/os/os-window.tsx',
            lang: 'tsx',
            caption:
              'Una ventana en pausa se recarga en la página donde estaba, no en la que se abrió.',
            code: `const [src, setSrc] = useState(win.src);
const [prevSuspended, setPrevSuspended] = useState(suspended);
if (suspended !== prevSuspended) {
  setPrevSuspended(suspended);
  if (suspended) {
    setSrc(win.path);
    setLoaded(false);
  }
}`,
          },
          {
            file: 'src/components/os/os-performance-notice.tsx',
            lang: 'ts',
            caption:
              'La medición cuenta frames largos durante 5 segundos; más del 20% es una compu que traba.',
            code: `const tick = (time: number) => {
  if (!start) {
    start = last = time;
  } else {
    frames += 1;
    if (time - last > LONG_FRAME_MS) longFrames += 1;
    last = time;
  }
  if (time - start < SAMPLE_MS) {
    frame = requestAnimationFrame(tick);
    return;
  }
  if (!aborted && frames > 0 && longFrames / frames > SLOW_SHARE) onSlow();
};`,
          },
        ],
        docsUrl: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage',
        sourcePath: 'src/components/os',
      },
      {
        id: 'rendimiento-home',
        name: 'Rendimiento · primer paint de la home',
        tagline: 'que se vea antes de que cargue el JavaScript',
        what: 'El primer paint útil (y el LCP, el elemento más grande en pantalla) depende de lo que el HTML del servidor ya muestra. Todo lo que espera a que el JavaScript hidrate llega tarde: un contenido que arranca invisible para animar su entrada, un número que se llena en el cliente, una sección estática mandada como componente de cliente. La receta es renderizar en el servidor todo lo que no es interactivo, animar con CSS en vez de JavaScript, y dejar que el navegador saltee el trabajo de lo que está fuera de pantalla.',
        concepts: [
          {
            term: 'LCP',
            detail:
              'Largest Contentful Paint: cuándo aparece el elemento más grande de la pantalla. Un elemento con `opacity: 0` no cuenta hasta que se ve, así que una entrada animada en JS retrasa el LCP lo que tarde el bundle.',
          },
          {
            term: 'server vs client component',
            detail:
              "Un server component se manda como HTML y no suma JavaScript; un `'use client'` arrastra al bundle todo lo que importa. Las secciones estáticas no necesitan ser de cliente.",
          },
          {
            term: 'animaciones CSS',
            detail:
              'Corren en el primer paint, sin esperar al JavaScript, y el navegador las puede componer fuera del hilo principal.',
          },
          {
            term: 'scroll-driven animations',
            detail:
              '`animation-timeline: view()` ata el progreso de una animación CSS a cuánto entró el elemento en la pantalla. Reemplaza al `IntersectionObserver` para apariciones al scrollear.',
          },
          {
            term: '@property',
            detail:
              'Registra una custom property con un tipo (por ejemplo `<integer>`) para que se pueda interpolar en una animación. Con un contador de CSS se imprime un número que sube, ya presente en el HTML del servidor. Ojo: una custom property se anima en el hilo principal, así que si arranca mientras la página hidrata no pinta ningún frame y salta del 0 al final; conviene largarla cuando el hilo queda libre.',
          },
          {
            term: 'content-visibility',
            detail:
              '`content-visibility: auto` saltea el layout y el pintado de lo que está lejos de la pantalla; `contain-intrinsic-size` reserva su alto para que el scroll no salte.',
          },
        ],
        usage: [
          'La home (`page.tsx`) solo espera la sesión, que el layout ya leyó; cada sección con datos llega por streaming detrás de un skeleton. El envoltorio de las secciones, `home-sections.tsx`, es un server component: las secciones estáticas (bento, logros, preguntas, footer…) llegan como HTML y solo hidratan las hojas interactivas, como los reproductores o el botón de instalar la app.',
          'El hero y las apariciones al scrollear usaban framer-motion con `opacity: 0` inicial, así que la página aparecía recién después de hidratar. Ahora el hero usa las clases de `tailwindcss-animate` (el título solo se desliza, sin fade, porque es lo más grande de la pantalla) y `Reveal` es un `div` con una animación CSS ligada al scroll; donde no hay soporte, el contenido simplemente está.',
          'Los números del hero (500+ miembros…) se renderizaban vacíos en el servidor porque los escribía `NumberTicker` en el cliente. Ahora `CountUp` los anima solo con CSS y el valor real va además en un `sr-only` para lectores de pantalla.',
          'La foto de fondo del hero es de 3024px y 2.7 MB y se ve al 22% de opacidad bajo dos gradientes, así que se sirve con `quality={40}`. Next 16 solo acepta las calidades declaradas en `images.qualities`; sin declararla, la home tiraba un error de React que encontramos bisecando los cambios.',
          "Dos trampas de los server components: una constante exportada desde un archivo `'use client'` llega a un server component como referencia de cliente y no como valor (por eso `WHATSAPP_GROUP_URL` vive en `src/data/whatsapp-group.ts`), y lo mismo pasa con el script inline que elige el modo de PCN OS, que vive en un archivo sin la directiva.",
        ],
        examples: [
          {
            file: 'src/app/globals.css',
            lang: 'css',
            caption:
              'Aparición al scrollear sin JavaScript, y sin layout ni pintado hasta que la sección se acerca.',
            code: `.reveal {
  content-visibility: auto;
  contain-intrinsic-size: auto 600px;
}
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .reveal {
      animation: reveal-in linear both;
      animation-timeline: view();
      animation-range: entry 0% entry 35%;
    }
  }
}`,
          },
          {
            file: 'src/app/globals.css',
            lang: 'css',
            caption:
              'Un entero registrado que se anima de 0 al valor y se imprime con un contador.',
            code: `@property --count {
  syntax: '<integer>';
  initial-value: 0;
  inherits: false;
}
.count-up {
  --count: var(--count-to);
  counter-reset: count var(--count);
  animation: count-up 1.8s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.count-up:not([data-counting]) {
  animation-play-state: paused;
}
.count-up::after {
  content: counter(count);
}
@keyframes count-up {
  from {
    --count: 0;
  }
}`,
          },
          {
            file: 'src/components/home/count-up.tsx',
            lang: 'tsx',
            caption:
              'La cuenta arranca recién cuando la hidratación terminó y el hilo principal está libre.',
            code: `useEffect(() => {
  const id = requestIdleCallback(
    () => ref.current?.setAttribute('data-counting', ''),
    { timeout: 1000 },
  );
  return () => cancelIdleCallback(id);
}, []);`,
          },
          {
            file: 'next.config.mjs',
            lang: 'js',
            code: `images: {
  // 75 is the default; 40 is for the home hero backdrop, shown faded under gradients.
  qualities: [40, 75],
  // …
},`,
          },
        ],
        docsUrl: 'https://web.dev/articles/lcp',
        sourcePath: 'src/components/home',
      },
      {
        id: 'cursor-hacker',
        name: 'Cursor hacker',
        tagline: 'un puntero propio que sigue al mouse sin trabar',
        what: 'Un cursor personalizado esconde el nativo (`cursor: none`) y dibuja uno propio con elementos posicionados en `fixed` que se mueven con cada `pointermove`. El riesgo es que se sienta lento o trabe: hay que moverlo solo con `transform` (lo resuelve la GPU, sin recalcular el layout), agrupar las actualizaciones en un `requestAnimationFrame` y dejar de animar cuando no hay nada que mover. Las animaciones con inercia ("lerp": recorrer una fracción de la distancia que falta en cada frame) tienen que depender del tiempo y no de la cantidad de frames, o en una pantalla de 120 Hz van el doble de rápido que en una de 60 Hz.',
        concepts: [
          {
            term: 'pointer events',
            detail:
              '`pointermove`, `pointerdown` y `pointerup` unifican mouse, touch y lápiz; `pointerType` dice cuál es, y el cursor solo reacciona a `mouse`.',
          },
          {
            term: 'lerp por tiempo',
            detail:
              'Si en un frame de 60 Hz se recorre la fracción `r`, en `n` frames se recorre `1 - (1 - r)^n`. Con `n` medido desde el último frame, la inercia se siente igual en cualquier pantalla.',
          },
          {
            term: 'loop que se detiene',
            detail:
              'El `requestAnimationFrame` se pide solo cuando algo se mueve y deja de pedirse cuando los corchetes llegaron: con el mouse quieto el cursor no gasta nada.',
          },
          {
            term: 'mix-blend-mode: difference',
            detail:
              'Resta el color del elemento al del fondo: el verde sobre negro sigue verde y sobre un fondo verde da casi negro, así el cursor se ve sobre cualquier cosa.',
          },
          {
            term: 'postMessage',
            detail:
              'La forma de que una página le hable a otra ventana o iframe del mismo origen. Es asíncrono: el mensaje llega en una tarea posterior.',
          },
        ],
        usage: [
          '`HackerCursor` está montado en el layout raíz y solo se activa con `(hover: hover) and (pointer: fine)`, sin `prefers-reduced-motion` y en el modo completo de PCN OS (en liviano y clásico queda el nativo). Recién cuando se activa agrega la clase `pcn-cursor` a `<html>`, que es la que esconde el cursor nativo: si el JS no corre, la página nunca queda sin puntero. Los campos de texto conservan el I-beam.',
          'El cuadrado sigue al mouse exacto y los corchetes lo persiguen con inercia (`RING_FOLLOW`, la fracción por frame de 60 Hz, escalada al tiempo real del frame). Sobre algo clickeable los corchetes crecen y una etiqueta dice qué hace el click: `cd` para links internos, `open ↗` para externos, `exec` para botones, o el texto de un atributo `data-cursor`. Al soltar el click sale una ráfaga de caracteres hex que se borran solos al terminar su animación.',
          'En PCN OS cada ventana es un iframe y el iframe se queda con los eventos del mouse. Para no tener dos cursores (o uno congelado en el borde), dentro de una ventana el componente no dibuja nada: esconde el nativo y le manda al escritorio cada movimiento por `postMessage`, con qué hay debajo. El escritorio busca de qué iframe vino el mensaje y le suma su `getBoundingClientRect()` para pasar las coordenadas a las suyas. Solo la última ventana que reportó puede esconder el cursor, porque un `blur` puede llegar tarde.',
        ],
        examples: [
          {
            file: 'src/components/ui/hacker-cursor.tsx',
            lang: 'ts',
            caption: 'La inercia de los corchetes, escalada al tiempo real de cada frame.',
            code: `const render = (now: number) => {
  frame = 0;
  // Frames elapsed at 60 Hz since the last render; capped so a stalled tab doesn't teleport.
  const frames = lastFrame ? Math.min((now - lastFrame) / (1000 / 60), 4) : 1;
  lastFrame = now;
  // Ease the brackets towards the pointer; snap once they're close enough to stop the loop.
  const follow = ease(RING_FOLLOW, frames);
  ringPos.x += (target.x - ringPos.x) * follow;
  ringPos.y += (target.y - ringPos.y) * follow;
  // …
  if (settled) lastFrame = 0;
  else frame = requestAnimationFrame(render);
};`,
          },
          {
            file: 'src/components/ui/hacker-cursor.tsx',
            lang: 'ts',
            caption:
              'El escritorio pasa el puntero que reporta una ventana a sus propias coordenadas.',
            code: `const frameElement = [...document.querySelectorAll('iframe')].find(
  (iframe) => iframe.contentWindow === event.source,
);
if (!frameElement) return;
// Window coordinates are relative to its page; shift them onto the desktop.
const rect = frameElement.getBoundingClientRect();
const x = rect.left + event.data.x;
const y = rect.top + event.data.y;
moveTo(x, y, event.data);`,
          },
        ],
        docsUrl: 'https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events',
        sourcePath: 'src/components/ui/hacker-cursor.tsx',
      },
      {
        id: 'pull-to-refresh',
        name: 'PWA · pull to refresh',
        tagline: 'el gesto de recargar que la app instalada no trae',
        what: 'Una PWA instalada corre sin la interfaz del navegador, y con ella pierde el gesto de tirar hacia abajo para recargar. Reimplementarlo es escuchar los toques, decidir cuándo un arrastre es un "pull" (desde arriba de todo, claramente vertical, sin un diálogo ni un scroll interno de por medio), mostrar un indicador con resistencia y, al soltar, volver a pedir los datos sin recargar la página entera.',
        concepts: [
          {
            term: 'display-mode: standalone',
            detail:
              'Media query que es verdadero cuando la app corre instalada. En iOS, además, `navigator.standalone`.',
          },
          {
            term: 'listeners no pasivos',
            detail:
              'Para cancelar el rebote nativo de iOS hace falta `preventDefault` en `touchmove`, que solo funciona si el listener se registró con `passive: false`.',
          },
          {
            term: 'router.refresh()',
            detail:
              'Vuelve a renderizar los server components de la ruta actual y mezcla el resultado sin perder el scroll ni el estado de los componentes de cliente.',
          },
          {
            term: 'transiciones async',
            detail:
              '`startTransition` con una función async mantiene `isPending` en verdadero hasta que termina, ideal para sostener un spinner mientras llegan los datos.',
          },
        ],
        usage: [
          '`PullToRefresh` está montado en el layout de `(platform)` y solo se activa instalada y con puntero táctil; en el navegador queda el gesto nativo. Las páginas con contenido que vive en el repo (cursos, videos, podcast…) están en una lista de excepciones: las páginas nuevas tienen pull to refresh por defecto.',
          'Al soltar pasado el umbral se llama a `router.refresh()` para los server components y a `invalidateQueries()` para lo que usa React Query, todo dentro de `startTransition`, y el indicador gira hasta que `isPending` vuelve a falso (con un mínimo de 600 ms para que se lea como "se actualizó").',
        ],
        examples: [
          {
            file: 'src/components/pull-to-refresh.tsx',
            lang: 'ts',
            code: `if (pullRef.current >= THRESHOLD) {
  setDistance(THRESHOLD);
  if (navigator.vibrate) navigator.vibrate(10);
  startTransition(async () => {
    router.refresh();
    await Promise.all([
      queryClient.invalidateQueries(),
      new Promise((resolve) => window.setTimeout(resolve, MIN_SPIN_MS)),
    ]);
  });
} else {
  setDistance(0);
}`,
          },
        ],
        docsUrl: 'https://nextjs.org/docs/app/api-reference/functions/use-router',
        sourcePath: 'src/components/pull-to-refresh.tsx',
      },
      {
        id: 'notificaciones-push',
        name: 'Notificaciones push',
        tagline: 'avisos en el celular con el sitio cerrado',
        what: 'Web Push permite que un sitio mande notificaciones aunque nadie lo tenga abierto. El navegador se suscribe a su servicio de push (el de Google en Chrome, el de Mozilla en Firefox, el de Apple en Safari) y le da al sitio una URL única, el endpoint. Para avisar, el servidor le hace un POST cifrado a ese endpoint; el servicio lo entrega al dispositivo, donde el service worker se despierta y muestra la notificación.',
        concepts: [
          {
            term: 'VAPID',
            detail:
              'Un par de claves que identifica al sitio ante los servicios de push. El navegador se suscribe con la pública y el servidor firma cada envío con la privada. Si se cambian, las suscripciones existentes dejan de recibir.',
          },
          {
            term: 'suscripción',
            detail:
              'Un endpoint más dos claves (`p256dh` y `auth`) con las que el servidor cifra el mensaje: el servicio de push lo transporta pero no lo puede leer.',
          },
          {
            term: 'service worker',
            detail:
              'El script que el navegador corre aparte de la página. Recibe el evento `push`, muestra la notificación y, al tocarla, abre la página que corresponde.',
          },
          {
            term: '404 / 410',
            detail:
              'Lo que responde el servicio de push cuando una suscripción ya no existe (se revocó el permiso o se borró el sitio). Ahí la borramos de la base.',
          },
        ],
        usage: [
          'Cada miembro las activa por dispositivo desde `/perfil`. En iPhone y iPad, Safari solo las ofrece con el sitio agregado a la pantalla de inicio, y la pantalla lo explica. Llegan push por eventos nuevos, cambios y anuncios de eventos a los que te anotaste, respuestas en el foro y ofertas de empleo nuevas. El resto de las notificaciones (likes, por ejemplo) quedan solo dentro del sitio.',
          '`notifyUsers` crea la notificación en la base y, si lleva `push: true`, llama a `sendPush`, que nunca tira error: una push que falla no rompe la acción que la disparó. Como el servidor hace un POST a una URL que manda el navegador, solo acepta endpoints de los servicios de push conocidos; cualquier otra sería un SSRF. Al cerrar sesión se desactivan las push de ese navegador, para que un dispositivo compartido no siga recibiendo las de otra persona.',
          'Las claves VAPID son secrets del repo (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT`). Sin ellas la opción no aparece y no se envía nada; en local se generan con `pnpm exec web-push generate-vapid-keys`.',
        ],
        examples: [
          {
            file: 'src/lib/push-endpoints.ts',
            lang: 'ts',
            caption: 'Solo los servicios de push de los navegadores, por HTTPS.',
            code: `export const isPushServiceEndpoint = (endpoint: string) => {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.port || url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  return EXACT_HOSTS.has(host) || HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
};`,
          },
          {
            file: 'public/sw.js',
            lang: 'js',
            code: `self.addEventListener('push', (event) => {
  // …
  event.waitUntil(
    self.registration.showNotification(payload.title || 'programaConNosotros', {
      body: payload.body || '',
      tag: payload.tag,
      icon: '/pwa-icon-192.png',
      badge: '/pwa-icon-192.png',
      lang: 'es',
      data: { url: payload.url || '/notificaciones' },
    }),
  );
});`,
          },
        ],
        docsUrl: 'https://developer.mozilla.org/en-US/docs/Web/API/Push_API',
        sourcePath: 'src/lib/web-push.ts',
      },
    ],
  },
];
