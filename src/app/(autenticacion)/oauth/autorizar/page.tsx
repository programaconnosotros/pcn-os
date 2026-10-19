import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { getCurrentSession } from '@/actions/auth/get-current-session';
import { AuthLinks, AuthShell } from '@/components/auth/auth-shell';
import { clientIpFrom } from '@/lib/client-ip';
import { displayName } from '@/lib/people-names';
import { RATE_LIMITS, consumeRateLimit } from '@/lib/rate-limit';
import { errorRedirect, resolveAuthorizeRequest } from '@/lib/oauth/authorize';
import { OAUTH_TTL, isMcpEnabled, publicOrigin } from '@/lib/oauth/config';
import { canUseMcp, mcpIneligibilityReason } from '@/lib/oauth/eligibility';
import { ConsentForm } from './consent-form';

export const metadata: Metadata = {
  title: 'Conectar Claude',
  robots: { index: false, follow: false },
};

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const GRANTS = [
  'Leer todo lo que guarda el sitio, datos privados incluidos: emails, teléfonos, inscriptos, logs.',
  'Crear y editar eventos y anuncios (con los avisos a los miembros que eso dispara).',
  'Recomendar videos, artículos, libros, cursos, series y referentes, y revisar los pendientes.',
];

const INELIGIBLE = {
  not_admin: {
    title: 'Solo para admins',
    message:
      'El servidor MCP da acceso a todos los datos del sitio, así que solo lo pueden conectar los admins.',
  },
  no_two_factor: {
    title: 'Activá la verificación en dos pasos',
    message:
      'Para conectar Claude tu cuenta tiene que tener la verificación en dos pasos activada: con solo la contraseña no alcanza para dar acceso a todos los datos.',
  },
  inactive: { title: 'Cuenta inactiva', message: 'Tu cuenta no puede conectar apps.' },
} as const;

const ErrorScreen = ({ title, message }: { title: string; message: string }) => (
  <AuthShell command="mcp authorize" title={title} description={message}>
    <AuthLinks
      links={[
        { href: '/perfil', label: 'ir a mi perfil' },
        { href: '/desarrollo#mcp', label: 'qué es el servidor MCP' },
      ]}
    />
  </AuthShell>
);

/**
 * Consent screen of the MCP's OAuth server (docs/mcp.md): an admin decides whether a client
 * (claude.ai, Claude Code) may act as them. Nothing is granted until they click "permitir".
 */
export default async function AuthorizePage({ searchParams }: PageProps) {
  if (!isMcpEnabled()) notFound();
  const query = await searchParams;
  const headerStore = await headers();

  const ip = clientIpFrom(headerStore) ?? 'unknown';
  if (consumeRateLimit(`oauthAuthorize:ip:${ip}`, RATE_LIMITS.oauthAuthorize) > 0) {
    return (
      <ErrorScreen
        title="Demasiados intentos"
        message="Abriste demasiadas autorizaciones seguidas. Probá de nuevo en unos minutos."
      />
    );
  }

  const origin = publicOrigin(headerStore);
  const resolved = await resolveAuthorizeRequest(query, origin);
  if (resolved.kind === 'fatal')
    return <ErrorScreen title="Solicitud inválida" message={resolved.message} />;
  if (resolved.kind === 'redirect') redirect(resolved.url);

  const { request } = resolved;
  const plainQuery = Object.fromEntries(
    Object.entries(query).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );

  const session = await getCurrentSession();
  if (!session) {
    const back = `/oauth/autorizar?${new URLSearchParams(plainQuery).toString()}`;
    redirect(`/iniciar-sesion?redirect=${encodeURIComponent(back)}`);
  }
  if (!canUseMcp(session.user)) {
    const reason = INELIGIBLE[mcpIneligibilityReason(session.user)];
    return <ErrorScreen title={reason.title} message={reason.message} />;
  }

  const denyUrl = errorRedirect(
    request.params.redirect_uri,
    'access_denied',
    origin,
    request.params.state,
  );

  return (
    <AuthShell
      command="mcp authorize"
      title="Conectar Claude"
      description={
        <>
          <span className="font-mono text-foreground">{request.client.name}</span> quiere usar el
          servidor MCP de programaConNosotros como{' '}
          <span className="text-foreground">{displayName(session.user.name)}</span>.
        </>
      }
      wide
    >
      <div className="space-y-6">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-y border-pcnGreen-200 py-3 font-mono text-xs">
          <dt className="text-muted-foreground">vuelve a</dt>
          <dd className="break-all text-pcnGreen">{request.redirectHost}</dd>
          <dt className="text-muted-foreground">dura</dt>
          <dd>
            {OAUTH_TTL.refreshSeconds / 86400} días sin uso; la revocás cuando quieras en{' '}
            <Link href="/admin/conexiones-mcp" className="underline hover:text-pcnGreen">
              /admin/conexiones-mcp
            </Link>
          </dd>
        </dl>

        <div className="space-y-2">
          <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
            podrá
          </p>
          <ul className="space-y-1.5 text-sm text-foreground/85">
            {GRANTS.map((grant) => (
              <li key={grant} className="flex gap-2">
                <span className="text-pcnGreen">›</span>
                {grant}
              </li>
            ))}
          </ul>
        </div>

        <p className="flex gap-2 text-xs leading-relaxed text-amber-300/90">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          Permitilo solo si la conexión la acabás de iniciar vos desde Claude y la dirección de
          arriba es la que esperás (claude.ai, o localhost para Claude Code).
        </p>

        <ConsentForm query={plainQuery} denyUrl={denyUrl} />
      </div>
    </AuthShell>
  );
}
