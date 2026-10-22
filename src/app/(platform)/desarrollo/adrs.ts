// Architecture Decision Records: las decisiones de diseño que más condicionan el código, con el
// contexto en que se tomaron y lo que implican. Una decisión no se borra cuando cambia: se marca
// como reemplazada y se escribe una nueva que la referencia, así queda la historia.

export type AdrStatus = 'aceptada' | 'reemplazada' | 'propuesta';

export interface Adr {
  /** Número correlativo, nunca se reutiliza. */
  number: number;
  /** Ancla en /desarrollo: `adr-<slug>`. */
  slug: string;
  title: string;
  status: AdrStatus;
  /** Cuándo se tomó (o se revisó por última vez), `YYYY-MM-DD`. */
  date: string;
  /** El problema y las fuerzas en juego. */
  context: string;
  /** Lo que se decidió. */
  decision: string;
  /** Lo que se gana, lo que se paga y lo que queda pendiente. */
  consequences: string[];
  /** Alternativas que se evaluaron y por qué no. */
  alternatives?: string[];
  /** Número del ADR que la reemplaza. */
  supersededBy?: number;
  /** Archivos o documentos para profundizar, rutas desde la raíz del repo. */
  references?: string[];
}

export const adrs: Adr[] = [
  {
    number: 1,
    slug: 'nextjs-app-router-server-actions',
    title: 'Next.js App Router con Server Components y Server Actions, sin API aparte',
    status: 'aceptada',
    date: '2025-03-01',
    context:
      'El sitio lo mantiene una comunidad de voluntarios con distinta experiencia. Separar frontend y backend en dos proyectos duplica el deploy, los tipos y la autenticación, y frena a quien quiere hacer su primer PR de punta a punta.',
    decision:
      'Una sola app Next.js con App Router. Las páginas son Server Components que leen la base directamente (a través de `cached()`), y las escrituras son Server Actions en `src/actions`. Solo hay route handlers donde hace falta una URL pública: búsqueda, feed RSS, imágenes de OpenGraph, notificaciones y embeds.',
    consequences: [
      'Un PR puede tocar la base, la lógica y la UI en el mismo cambio, con los tipos de Prisma de punta a punta.',
      'Cada Server Action es un endpoint público: tiene que chequear sesión o permisos ella misma y validar su entrada con zod. Lo exige `src/lib/server-action-auth.test.ts`.',
      'El sitio queda atado a las convenciones de Next.js: cada versión mayor obliga a revisar caché, params asíncronos y metadata.',
    ],
    alternatives: [
      'SPA + API REST: más piezas para desplegar y versionar, y la API terminaría siendo usada por un solo cliente.',
      'tRPC: buena experiencia de tipos, pero agrega una capa que las Server Actions ya resuelven.',
    ],
    references: ['src/actions', 'docs/seguridad-owasp.md'],
  },
  {
    number: 2,
    slug: 'postgres-ec2-prisma',
    title: 'PostgreSQL propio en EC2, accedido solo con Prisma',
    status: 'aceptada',
    date: '2026-06-01',
    context:
      'La base empezó en Supabase. El plan gratuito pausaba el proyecto, el pooler sumaba latencia y no usábamos nada más de la plataforma (ni auth ni storage). La app ya corría en EC2.',
    decision:
      'PostgreSQL autoadministrado en una instancia EC2. La app habla con la base solo a través de Prisma 7 con `@prisma/adapter-pg` (o `$queryRaw` con template tags), nunca con SQL armado a mano. Las migraciones son SQL versionado en `prisma/migrations` y el deploy aplica las pendientes.',
    consequences: [
      'Control total de la versión, extensiones, backups e índices, y sin latencia de un pooler externo.',
      'Los backups y las actualizaciones de seguridad del servidor son responsabilidad del equipo.',
      'ESLint y `src/lib/sql-safety.test.ts` impiden SQL concatenado (OWASP A03).',
    ],
    alternatives: [
      'Seguir en Supabase: más caro para lo poco que usábamos.',
      'RDS: menos mantenimiento, pero varias veces más caro para el tamaño de la comunidad.',
    ],
    references: ['prisma/schema.prisma', 'docs/migracion-prisma-7.md'],
  },
  {
    number: 3,
    slug: 'deploy-kamal-ec2',
    title: 'Deploy con Kamal en EC2, no en Vercel',
    status: 'aceptada',
    date: '2026-07-01',
    context:
      'Vercel es lo más simple para Next.js, pero factura por uso y por integrante del equipo, y la base y los archivos ya están en AWS. Con pocos ingresos, el costo fijo y previsible pesa más que la comodidad.',
    decision:
      "Cada merge a main construye una imagen Docker (`Dockerfile.prod`) en GitHub Actions y Kamal la despliega en un EC2 sin downtime, detrás de kamal-proxy con certificado de Let's Encrypt. El dominio apunta directo a ese servidor; CloudFront solo sirve los archivos de S3. La app ya está preparada para tener CloudFront delante como CDN (cachear `/_next/static` y las imágenes y llegar a la app como `origin.programaconnosotros.com`), pero ese cambio de DNS no se hizo.",
    consequences: [
      'Costo fijo y bajo; todo en la misma región que la base y S3.',
      'Las funciones de Vercel (previews por PR, edge, ISR distribuido) no están: los previews se reemplazan con screenshots en el PR.',
      'Si la comunidad crece en contribuidores, la decisión se revisa (plan: evaluar Vercel hacia fines de 2026).',
    ],
    references: ['config/deploy.yml', '.github/workflows/deployment.yml'],
  },
  {
    number: 4,
    slug: 'pcn-os-iframes',
    title: 'Las ventanas de PCN OS son iframes de páginas reales (revisada: seguimos con iframes)',
    status: 'aceptada',
    date: '2026-10-07',
    context:
      'PCN OS muestra el sitio como un escritorio con ventanas. Cada ventana es un iframe que carga la URL real, y cada iframe es una copia entera de la app (React, Next.js, providers), lo más caro del escritorio. Se evaluó reemplazarlos por componentes renderizados directamente en el árbol del escritorio para gastar menos memoria y CPU.',
    decision:
      'Seguimos con iframes. Renderizar páginas como componentes no es viable sin reescribir el sitio: el costo se ataca con el modo liviano (máximo 3 ventanas vivas, el resto en pausa), el modo clásico y ventanas minimizadas que dejan de pintarse.',
    consequences: [
      'Cada ventana sigue siendo idéntica a la página en mobile o en el layout clásico, con su propio scroll, diálogos y layout responsive al ancho de la ventana.',
      'El consumo crece con cada ventana abierta: el modo liviano y la medición automática de frames siguen siendo necesarios.',
      'Las ventanas minimizadas quedan con `visibility: hidden` cuando termina la animación: el navegador deja de pintarlas y componerlas.',
    ],
    alternatives: [
      'Componentes en el mismo documento: Next.js renderiza un solo árbol de rutas por documento. Las páginas son Server Components que leen datos por ruta, y no hay forma soportada de renderizar N rutas arbitrarias a la vez (las parallel routes tienen slots fijos). Habría que pasar cada página a un componente cliente con su propio fetch.',
      'El diseño responsive de cada página usa media queries del viewport (`md:`, `lg:`): dentro de una ventana angosta en una pantalla ancha se verían rotas. Habría que migrar todo a container queries.',
      'Diálogos, sheets, scroll lock, sticky headers, atajos de teclado y `usePathname` son globales al documento: varias páginas a la vez se pisarían. Habría que aislar router, portales y scroll por ventana.',
      'Conclusión: es reescribir el sitio entero y perder la paridad con mobile, para ahorrar memoria que el modo liviano ya ahorra.',
    ],
    references: ['docs/pcn-os-y-rendimiento.md', 'src/components/os'],
  },
  {
    number: 5,
    slug: 'cache-invalidacion-automatica',
    title: 'Cache de lecturas con invalidación automática en cada escritura',
    status: 'aceptada',
    date: '2026-09-15',
    context:
      'Casi todo lo que muestra el sitio es igual para todos y cambia poco, pero cada página vista volvía a consultar Postgres. Invalidar a mano en cada Server Action es fácil de olvidar y deja datos viejos.',
    decision:
      'Las lecturas compartidas pasan por `cached()` (`src/lib/cache.ts`), que declara qué tablas lee. Una extensión de Prisma vence esos tags en cada escritura a esas tablas, así nadie invalida a mano. No se cachean URLs firmadas ni lo que depende de la hora actual.',
    consequences: [
      'La mayoría de las páginas se sirven sin tocar la base.',
      'Si una lectura usa una tabla que no declaró, en desarrollo se loguea `[cache] <name> reads <Model>`.',
      'Las escrituras con SQL crudo no invalidan solas: hay que evitarlas o vencer el tag a mano.',
    ],
    references: ['src/lib/cache.ts', 'src/lib/prisma.ts', 'docs/cache-de-datos.md'],
  },
  {
    number: 6,
    slug: 'contenido-en-el-repo',
    title: 'El contenido curado vive en el repo, salvo las recomendaciones',
    status: 'aceptada',
    date: '2025-06-01',
    context:
      'Las conversaciones del grupo, el changelog y otros textos curados los escriben pocas personas y cambian por PR. Guardarlos en la base exige paneles de admin y migraciones de datos.',
    decision:
      'Ese contenido son archivos TypeScript y JSON versionados (`src/data`, `conversaciones`…). La base guarda lo que generan los usuarios y referencia el contenido del repo por id, sin clave foránea (ContentMark). Desde octubre de 2026 las recomendaciones (artículos, libros, cursos y videos) son la excepción: cualquier miembro las propone, así que viven en la tabla Recommendation con revisión de admins en /admin/recomendaciones, y las listas del repo se cargaron con una migración de datos que mantuvo sus ids.',
    consequences: [
      'Agregar una conversación o un cambio del changelog es un PR revisable, con historia en git y sin panel de admin.',
      'Los ids del repo no se pueden reutilizar: la base podría tener marcas que apunten a ellos. Lo mismo vale para el slug de una recomendación.',
      'Cambiar el contenido del repo requiere un deploy; una recomendación aprobada aparece al instante.',
    ],
  },
  {
    number: 7,
    slug: 'imagenes-s3-cloudfront',
    title: 'Fotos en S3 con versión completa y miniatura, servidas por CloudFront firmado',
    status: 'aceptada',
    date: '2026-04-01',
    context:
      'La galería y los setups tienen miles de fotos de celular de varios MB. Servirlas desde la app satura el servidor y algunas no son públicas.',
    decision:
      'El navegador sube el original directo a S3 con un POST prefirmado. El servidor lo optimiza con sharp a WebP en dos tamaños (completo y miniatura), borra el original y guarda ambas URLs. Las grillas usan la miniatura y el detalle la completa; las privadas se sirven con URLs firmadas de CloudFront.',
    consequences: [
      'Las subidas no pasan por el servidor de la app y las grillas pesan una fracción.',
      'Las URLs firmadas vencen: nunca se cachean dentro de `cached()`.',
    ],
    references: ['src/lib/s3.ts', 'src/lib/gallery-signing.ts'],
  },
  {
    number: 8,
    slug: 'tests-locales',
    title: 'Los tests corren en la máquina de quien contribuye, no en CI',
    status: 'aceptada',
    date: '2026-05-01',
    context:
      'Las corridas de CI cuestan minutos de GitHub Actions y la suite completa (unitarios, build, integración con base y e2e) tarda. La mayoría de los PRs son chicos.',
    decision:
      'Husky corre lint, formato, tests y build antes de cada push. `pnpm test:db` corre la integración contra un Postgres local descartable y `pnpm test:e2e` (Playwright) se corre a mano. GitHub Actions solo construye y despliega.',
    consequences: [
      'El feedback llega antes de abrir el PR y CI es barato.',
      'Saltear el hook (`--no-verify`) deja pasar código roto: la revisión del PR lo tiene que notar.',
    ],
    references: ['.husky/pre-push', 'jest.db.config.mjs', 'playwright.config.ts'],
  },
  {
    number: 9,
    slug: 'email-resend',
    title: 'Emails transaccionales con Resend',
    status: 'aceptada',
    date: '2026-08-01',
    context:
      'Los emails salían por SMTP de una casilla de Gmail: límites diarios bajos, caídas en spam y una cuenta que ya no es del equipo.',
    decision:
      'Los emails se mandan con la API de Resend desde un dominio propio verificado. Las plantillas son componentes de React Email con la estética del sitio.',
    consequences: [
      'Mejor entregabilidad y métricas de envío.',
      'Una dependencia externa más con su API key. En desarrollo los emails van por SMTP a MailHog.',
    ],
  },
  {
    number: 10,
    slug: 'busqueda-full-text-postgres',
    title: 'Búsqueda híbrida: tablas chicas en memoria, las que crecen en Postgres',
    status: 'aceptada',
    date: '2026-10-17',
    context:
      'El buscador (⌘K) cargaba en memoria, en cada búsqueda, todo el foro (con tope de 2000 respuestas), los consejos y los miembros, y filtraba en JavaScript. Cada vez costaba más y no toleraba errores de tipeo: "reakt" no encontraba nada.',
    decision:
      'El foro, los consejos y los miembros se buscan en Postgres con full-text search (`tsvector`, por prefijo) y `pg_trgm` para los typos, con índices GIN de expresión sobre `search_text()`, que normaliza como el buscador en memoria. Las tablas chicas (eventos, charlas, proyectos, páginas) siguen en la caché y se filtran en memoria.',
    consequences: [
      'La búsqueda escala con el contenido y tolera typos. Los resultados con un typo aparecen después de los exactos.',
      'Los índices de expresión no existen para Prisma: viven en una migración escrita a mano, y cada consulta tiene que repetir la expresión exacta o Postgres deja de usarlos.',
      'La base necesita las extensiones `unaccent` y `pg_trgm`. Desde Postgres 13 no requieren superusuario.',
    ],
    alternatives: [
      'Un motor aparte (Meilisearch, Algolia): otro servicio para operar o pagar, y sincronizar con la base, para un volumen que Postgres maneja sobrado.',
      '`ILIKE` con Prisma: no tolera typos y, sin índices, recorre la tabla entera.',
    ],
    references: [
      'src/lib/search/full-text.ts',
      'prisma/migrations/20261031120000_full_text_search/migration.sql',
      'docs/cache-de-datos.md',
    ],
  },
  {
    number: 11,
    slug: 'web-push-vapid',
    title: 'Notificaciones push con Web Push y claves VAPID propias',
    status: 'aceptada',
    date: '2026-10-17',
    context:
      'Las notificaciones solo se veían entrando al sitio. Avisos que importan en el momento (un evento nuevo, un cambio de horario, una respuesta en el foro, una oferta de empleo) llegaban tarde o no llegaban.',
    decision:
      'Web Push estándar con la librería `web-push` y un par de claves VAPID propio, sin Firebase ni otro intermediario. El service worker de la PWA muestra lo que llega. Solo mandan push los avisos que importan en el momento (eventos, respuestas en el foro y empleos); el resto queda dentro del sitio.',
    consequences: [
      'Funciona en Chrome, Firefox, Edge y Safari (en iPhone y iPad, con el sitio instalado en la pantalla de inicio) sin cuentas en servicios externos.',
      'El servidor hace POST a endpoints que manda el navegador: solo se aceptan los de los servicios de push conocidos, para no abrir un SSRF.',
      'Las claves VAPID no se pueden rotar sin que los miembros vuelvan a activar las push.',
    ],
    alternatives: [
      'Firebase Cloud Messaging: otra cuenta y otro SDK para algo que el estándar ya resuelve.',
      'Emails: ya existen para lo importante, pero no son inmediatos ni llegan a la pantalla del celular.',
    ],
    references: ['src/lib/web-push.ts', 'src/lib/push-endpoints.ts', 'public/sw.js'],
  },
  {
    number: 12,
    slug: 'servidor-mcp-oauth',
    title: 'Servidor MCP remoto dentro del monolito, con OAuth 2.1 propio',
    status: 'aceptada',
    date: '2026-10-19',
    context:
      'Los admins querían consultar y cargar datos del sitio desde Claude (claude.ai y Claude Code) sin abrir la base ni copiar a mano. claude.ai solo se conecta a servidores MCP remotos y exige OAuth con registro dinámico de clientes. El acceso incluye datos privados (emails, teléfonos, inscriptos), así que un error de diseño expone a toda la comunidad.',
    decision:
      'Un endpoint MCP (Streamable HTTP, sin estado) en /api/mcp de la misma app de Next.js, con un servidor OAuth 2.1 propio en src/lib/oauth: clientes públicos, PKCE S256 obligatorio, redirects en allowlist, tokens hasheados atados al recurso y refresh que rota con detección de reuso. Solo admins con 2FA, chequeado en cada request. Las tools de escritura llaman a las server actions existentes corriendo como el admin del token (AsyncLocalStorage en getCurrentSession), en vez de reimplementar la lógica.',
    consequences: [
      'Funciona igual desde claude.ai, Claude Desktop y Claude Code, sin infraestructura nueva: mismo deploy, misma base, mismos permisos y avisos que la web.',
      'Una tool nueva hereda la validación y los permisos de su server action; el test de canarios impide que una lectura filtre secretos.',
      'Mantenemos código de OAuth propio: cada cambio pasa por los tests de integración del flujo completo (src/lib/oauth/oauth.db.test.ts).',
      'Hoy el sitio llega directo al EC2; si pasa detrás de un CDN, este tiene que reenviar el header Authorization y no cachear /api/mcp ni /oauth/*.',
    ],
    alternatives: [
      'Servidor MCP local por stdio con la DATABASE_URL: no sirve para claude.ai y pone credenciales de producción en cada máquina.',
      'Tokens personales (Bearer) generados en /admin: más simple, pero claude.ai no los soporta y no rotan ni vencen solos.',
      'Un proveedor de identidad externo (Auth0, Clerk): otra cuenta y otro sistema de usuarios para un solo caso, cuando el sitio ya tiene sesiones y 2FA propios.',
    ],
    references: [
      'docs/mcp.md',
      'src/lib/mcp/registry.ts',
      'src/lib/oauth/tokens.ts',
      'src/lib/acting-user.ts',
    ],
  },
];

export const adrAnchor = (adr: Pick<Adr, 'slug'>) => `adr-${adr.slug}`;

export const adrNumber = (adr: Pick<Adr, 'number'>) => `ADR-${String(adr.number).padStart(3, '0')}`;
