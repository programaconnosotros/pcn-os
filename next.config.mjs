// Headers de seguridad para todas las respuestas. El sitio se muestra en iframes solo dentro de
// sí mismo (PCN OS abre las páginas en ventanas), así que no se deja embeber desde otros dominios.
const securityHeaders = [
  // includeSubDomains: los subdominios (origin., etc.) también solo por HTTPS.
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Para todo lo que no es una página (API, archivos). Las páginas suman la CSP con nonce que
  // restringe scripts (src/proxy.ts, src/lib/csp.ts); el navegador aplica ambas.
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // La suite e2e compila en su propia carpeta (pnpm test:e2e), así no pisa la de `pnpm dev`.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  turbopack: {
    root: import.meta.dirname,
  },
  experimental: {
    // Reuse a visited page for 5 minutes instead of asking the server again on every visit, so
    // going back to a tab (the phone tab bar, the profile or interview tabs) is instant, like a
    // native app. Pull to refresh (`router.refresh()`) and server actions that revalidate still
    // fetch fresh data right away.
    staleTimes: { dynamic: 300 },
    // Today the domain points straight at the server. If the site moves behind CloudFront, the
    // server is reached as origin.programaconnosotros.com, so the Host that Next compares against
    // the browser's Origin header in its server action CSRF check is not the public domain
    // anymore. The public domain stays a valid origin for server actions either way.
    serverActions: { allowedOrigins: ['programaconnosotros.com'] },
    // Next 16.4, development only: compile a dynamic import() (the PCN OS programs, dialogs,
    // charts) the first time the browser asks for it instead of up front, and let Turbopack drop
    // unreachable work from memory and its disk cache in long `pnpm dev` sessions.
    turbopackLazyDynamicImports: true,
    turbopackGc: true,
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // The MCP OAuth server (docs/mcp.md): consent screen never framed, nothing cached anywhere.
      {
        source: '/oauth/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
      // Images and fonts in public/ have no hash in their name, so Next serves them with
      // max-age=0. Browsers keep them for an hour; s-maxage is for a CDN in front (CloudFront, once
      // the site moves behind it), and each deploy invalidates CloudFront
      // (.github/workflows/deployment.yml), so a replaced file shows up right after it ships.
      {
        source: '/:path*\\.(webp|png|jpg|jpeg|gif|svg|avif|ico|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=604800, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/sponsors', destination: '/partners', permanent: true },
      // Las pantallas de login y registro vivían bajo /autenticacion (links de mails viejos, marcadores)
      { source: '/autenticacion/registro', destination: '/crear-cuenta', permanent: true },
      { source: '/autenticacion/:page', destination: '/:page', permanent: true },
    ];
  },
  images: {
    // 75 is the default; 40 is for the home hero backdrop, shown faded under gradients.
    qualities: [40, 75],
    // Keep src/lib/image-hosts.ts in sync: it tells components which URLs they can optimize.
    remotePatterns: [
      {
        hostname: 'avatars.githubusercontent.com',
        protocol: 'https',
      },
      {
        hostname: 'assets.aceternity.com',
        protocol: 'https',
      },
      {
        hostname: 'images.unsplash.com',
        protocol: 'https',
      },
      // CloudFront CDN for uploaded event flyers / photos
      ...(process.env.AWS_CLOUDFRONT_URL
        ? [{ protocol: 'https', hostname: new URL(process.env.AWS_CLOUDFRONT_URL).hostname }]
        : []),
      // S3 direct fallback (when CLOUDFRONT_URL is not set). Only our bucket: a wildcard over
      // amazonaws.com would let /_next/image proxy and resize images from anyone's bucket.
      ...(process.env.AWS_S3_BUCKET
        ? [
            { protocol: 'https', hostname: `${process.env.AWS_S3_BUCKET}.s3.amazonaws.com` },
            { protocol: 'https', hostname: `${process.env.AWS_S3_BUCKET}.s3.*.amazonaws.com` },
          ]
        : []),
    ],
  },
};

export default nextConfig;
