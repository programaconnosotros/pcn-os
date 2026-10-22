import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://programaconnosotros.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/iniciar-sesion',
        '/crear-cuenta',
        '/verificar-email',
        '/recuperar-clave',
        '/perfil',
        '/bienvenida',
        '/analiticas',
        '/visitas',
        '/notificaciones',
        '/monitoreo',
        '/eventos/nuevo',
        '/eventos/*/editar',
        '/eventos/*/inscripciones',
        '/oauth/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
