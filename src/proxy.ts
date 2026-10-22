import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { buildContentSecurityPolicy, createNonce, NONCE_HEADER } from '@/lib/csp';

/**
 * Le pone a cada página una CSP con un nonce nuevo (ver src/lib/csp.ts). El nonce viaja también
 * en el request: Next lo lee del header CSP para sus scripts y el layout lo lee de `x-nonce` para
 * el script inline del <head>.
 */
export function proxy(request: NextRequest) {
  const nonce = createNonce();
  const sitePolicy = buildContentSecurityPolicy(nonce, {
    dev: process.env.NODE_ENV === 'development',
  });
  // The MCP consent screen grants access to everything: not even PCN OS may frame it, so a click
  // on "Permitir" is always a click on the real page (clickjacking).
  const policy = request.nextUrl.pathname.startsWith('/oauth/')
    ? sitePolicy.replace("frame-ancestors 'self'", "frame-ancestors 'none'")
    : sitePolicy;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(NONCE_HEADER, nonce);
  requestHeaders.set('Content-Security-Policy', policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', policy);
  return response;
}

export const config = {
  matcher: [
    {
      // Páginas, no archivos estáticos, imágenes optimizadas ni endpoints de la API.
      source: '/((?!api|_next/static|_next/image|favicon.ico|sw.js|.*\\.[a-z0-9]+$).*)',
      // Los prefetch de Next no renderizan HTML nuevo
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
