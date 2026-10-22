// Name, title, area and kind of every MCP tool, without importing the tools themselves (they pull
// in Prisma and the server actions): /desarrollo renders this. `registry.test.ts` fails if it
// drifts from MCP_TOOLS.

export type McpToolSummary = {
  name: string;
  title: string;
  area: string;
  kind: 'read' | 'write';
  destructive?: boolean;
};

export const MCP_TOOL_CATALOG: McpToolSummary[] = [
  { name: 'list_events', title: 'Listar eventos', area: 'eventos', kind: 'read' },
  { name: 'get_event', title: 'Ver un evento', area: 'eventos', kind: 'read' },
  {
    name: 'get_event_registrations',
    title: 'Inscriptos de un evento',
    area: 'eventos',
    kind: 'read',
  },
  { name: 'create_event', title: 'Crear un evento', area: 'eventos', kind: 'write' },
  { name: 'update_event', title: 'Editar un evento', area: 'eventos', kind: 'write' },
  { name: 'list_announcements', title: 'Listar anuncios', area: 'anuncios', kind: 'read' },
  { name: 'create_announcement', title: 'Crear un anuncio', area: 'anuncios', kind: 'write' },
  { name: 'update_announcement', title: 'Editar un anuncio', area: 'anuncios', kind: 'write' },
  {
    name: 'delete_announcement',
    title: 'Borrar un anuncio',
    area: 'anuncios',
    kind: 'write',
    destructive: true,
  },
  {
    name: 'list_recommendations',
    title: 'Listar recomendaciones',
    area: 'recomendaciones',
    kind: 'read',
  },
  { name: 'recommend', title: 'Recomendar', area: 'recomendaciones', kind: 'write' },
  {
    name: 'update_recommendation',
    title: 'Editar una recomendación',
    area: 'recomendaciones',
    kind: 'write',
  },
  {
    name: 'approve_recommendation',
    title: 'Aprobar una recomendación',
    area: 'recomendaciones',
    kind: 'write',
  },
  {
    name: 'reject_recommendation',
    title: 'Rechazar una recomendación',
    area: 'recomendaciones',
    kind: 'write',
    destructive: true,
  },
  { name: 'search_members', title: 'Buscar miembros', area: 'miembros', kind: 'read' },
  { name: 'get_member', title: 'Ver un miembro', area: 'miembros', kind: 'read' },
  { name: 'list_talks', title: 'Listar charlas', area: 'charlas', kind: 'read' },
  {
    name: 'list_talk_proposals',
    title: 'Listar propuestas de charlas',
    area: 'charlas',
    kind: 'read',
  },
  { name: 'list_projects', title: 'Listar proyectos', area: 'proyectos', kind: 'read' },
  { name: 'list_advice', title: 'Listar consejos', area: 'consejos', kind: 'read' },
  { name: 'list_forum_posts', title: 'Listar temas del foro', area: 'foro', kind: 'read' },
  { name: 'get_forum_post', title: 'Ver un tema del foro', area: 'foro', kind: 'read' },
  { name: 'list_job_offers', title: 'Listar ofertas de empleo', area: 'empleos', kind: 'read' },
  {
    name: 'list_work_places',
    title: 'Listar lugares para trabajar',
    area: 'lugares',
    kind: 'read',
  },
  { name: 'list_testimonials', title: 'Listar testimonios', area: 'testimonios', kind: 'read' },
  { name: 'list_setups', title: 'Listar setups', area: 'setups', kind: 'read' },
  {
    name: 'list_gallery',
    title: 'Listar fotos y videos de la galería',
    area: 'galería',
    kind: 'read',
  },
  { name: 'search_site', title: 'Buscar en el sitio', area: 'comunidad', kind: 'read' },
  {
    name: 'search_conversations',
    title: 'Buscar conversaciones del grupo',
    area: 'conversaciones',
    kind: 'read',
  },
  { name: 'get_faqs', title: 'Preguntas frecuentes', area: 'comunidad', kind: 'read' },
  { name: 'get_changelog', title: 'Novedades del sitio', area: 'comunidad', kind: 'read' },
  {
    name: 'get_community_stats',
    title: 'Estadísticas de la comunidad',
    area: 'comunidad',
    kind: 'read',
  },
  { name: 'list_system_alerts', title: 'Alertas del sistema', area: 'admin', kind: 'read' },
  { name: 'list_content_reports', title: 'Reportes de contenido', area: 'admin', kind: 'read' },
  { name: 'list_error_logs', title: 'Errores del sitio', area: 'admin', kind: 'read' },
];
