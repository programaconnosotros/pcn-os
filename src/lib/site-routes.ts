// Las páginas del sitio, como las ve el navegador: sin route groups `(...)`, slots `@...` ni rutas
// interceptadas. `trackPageVisit` solo cuenta visitas a estas rutas, así nadie puede meter en
// /metricas una ruta inventada como `/estafa-reclama-tu-premio`. Lo mantiene al día
// site-routes.test.ts: una página nueva hace fallar el test hasta que se agrega acá.
export const SITE_ROUTES = [
  '/',
  '/[shortcut]',
  '/admin',
  '/admin/recomendaciones',
  '/admin/sponsors',
  '/admin/moderacion',
  '/admin/feed',
  '/admin/conexiones-mcp',
  '/agents',
  '/analiticas',
  '/anuncios',
  '/iniciar-sesion',
  '/recuperar-clave',
  '/crear-cuenta',
  '/verificar-email',
  '/bienvenida',
  '/changelog',
  '/charlas',
  '/code-warfare',
  '/consejos',
  '/consejos/[id]',
  '/conversaciones',
  '/conversaciones/opiniones',
  '/cursos',
  '/cursos/[courseId]',
  '/desarrollo',
  '/desarrollo/calidad',
  '/desarrollo/diseno',
  '/entrevistas',
  '/entrevistas/guias',
  '/entrevistas/guias/[guia]',
  '/entrevistas/live-coding',
  '/especialidades',
  '/eventos',
  '/eventos/[id]',
  '/eventos/[id]/charlas',
  '/eventos/[id]/editar',
  '/eventos/[id]/inscripcion',
  '/eventos/[id]/inscripciones',
  '/eventos/[id]/organizadores',
  '/eventos/[id]/proponer-charla',
  '/eventos/[id]/propuestas-de-charlas',
  '/eventos/nuevo',
  '/estadisticas',
  '/feed',
  '/foro',
  '/foro/categoria/[slug]',
  '/foro/nuevo',
  '/foro/tema/[id]',
  '/foro/tema/[id]/editar',
  '/galeria',
  '/galeria/[id]',
  '/galeria/[id]/editar',
  '/galeria/pendientes',
  '/galeria/subir',
  '/herramientas',
  '/historia',
  '/influencers',
  '/lectura',
  '/logros',
  '/lugares',
  '/empleos',
  '/metricas',
  '/miembros',
  '/monitoreo',
  '/motivacion',
  '/music',
  '/notificaciones',
  '/oauth/autorizar',
  '/offline',
  '/partners',
  '/perfil',
  '/perfil/[id]',
  '/podcast',
  '/preguntas-frecuentes',
  '/proyectos',
  '/proyectos/[id]',
  '/proyectos/[id]/subir',
  '/series-y-peliculas',
  '/setups',
  '/setups/[id]',
  '/software-recomendado',
  '/testimonios',
  '/testimonios/[id]',
  '/usuarios',
  '/videos',
  '/vinculos',
  '/visitas',
] as const;

/** Un segmento dinámico de la ruta: `route` es el patrón hasta él (`/eventos/[id]`). */
export type RouteParam = { route: string; value: string };

const segmentsOf = (path: string) => (path === '/' ? [] : path.slice(1).split('/'));
const isDynamic = (segment: string) => segment.startsWith('[') && segment.endsWith(']');

const ROUTES = SITE_ROUTES.map((route) => ({ route, segments: segmentsOf(route) }));

/**
 * La página de `path` y sus segmentos dinámicos, o `null` si no es una página del sitio. Una
 * ruta fija gana sobre una dinámica (`/eventos/nuevo` no es el evento `nuevo`), como en Next.
 */
export const matchSiteRoute = (path: string) => {
  const segments = segmentsOf(path);
  if (segments.includes('')) return null; // `/eventos/` o `/eventos//abc`
  const matches = ROUTES.filter(
    (route) =>
      route.segments.length === segments.length &&
      route.segments.every((segment, index) => isDynamic(segment) || segment === segments[index]),
  );
  const fixedCount = (route: (typeof ROUTES)[number]) =>
    route.segments.filter((segment) => !isDynamic(segment)).length;
  const best = matches.sort((a, b) => fixedCount(b) - fixedCount(a))[0];
  if (!best) return null;

  const params: RouteParam[] = best.segments.flatMap((segment, index) =>
    isDynamic(segment)
      ? [{ route: `/${best.segments.slice(0, index + 1).join('/')}`, value: segments[index] }]
      : [],
  );
  return { route: best.route, params };
};
