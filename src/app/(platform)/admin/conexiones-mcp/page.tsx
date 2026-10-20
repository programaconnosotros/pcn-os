import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { EmptyState } from '@/components/empty-state';
import { PageTitle } from '@/components/ui/page-title';
import { RuledGrid, ruledCellClassName } from '@/components/ui/ruled-grid';
import { StickyHeader } from '@/components/ui/sticky-header';
import { requireAdminPage } from '@/lib/admin';
import { listMcpConnections } from '@/lib/oauth/connections';
import { displayName } from '@/lib/people-names';
import { tabTitle } from '@/lib/tab-title';
import { cn } from '@/lib/utils';
import { RevokeButton } from './revoke-button';

export const metadata: Metadata = {
  title: tabTitle.sudo('admin/conexiones-mcp'),
  robots: { index: false, follow: false },
};

const dateFormat = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Argentina/Buenos_Aires',
});

// Who connected Claude (or another MCP client) to the site's MCP server, and the button to cut
// any of those connections. Each one acts as the admin who approved it.
export default async function McpConnectionsPage() {
  await requireAdminPage();
  await connection();
  const connections = await listMcpConnections();

  return (
    <div className="flex flex-1 flex-col p-4 pt-0">
      <div className="mt-4 mb-14 max-w-3xl">
        <StickyHeader>
          <PageTitle
            path={[{ label: 'admin', href: '/admin' }, { label: 'conexiones-mcp' }]}
            meta={
              connections.length === 1
                ? '1 conexión activa'
                : `${connections.length} conexiones activas`
            }
          />
        </StickyHeader>

        <p className="mb-4 text-sm text-muted-foreground">
          Apps conectadas al{' '}
          <Link href="/desarrollo#mcp" className="underline hover:text-pcnGreen">
            servidor MCP
          </Link>
          : cada una actúa como el admin que la autorizó, con acceso a todos los datos. Revocá la
          que no reconozcas.
        </p>

        {connections.length === 0 ? (
          <EmptyState
            command="ls ~/admin/mcp/conexiones"
            output="(vacío)"
            title="No hay conexiones"
            description="Cuando un admin conecte Claude al servidor MCP (desde claude.ai o Claude Code), la conexión aparece acá."
          />
        ) : (
          <>
            <div className="mb-2 flex justify-end">
              <RevokeButton label="Revocar todas las conexiones" />
            </div>
            <RuledGrid className="grid-cols-1">
              {connections.map((item) => (
                <div
                  key={item.familyId}
                  className={cn(ruledCellClassName, 'flex items-start justify-between gap-3 p-3')}
                >
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold break-words">
                      {item.clientName}{' '}
                      <span className="font-normal text-pcnGreen">
                        {item.redirectHosts.join(', ')}
                      </span>
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                      <Link href={`/perfil/${item.user.id}`} className="hover:text-pcnGreen">
                        {displayName(item.user.name)}
                      </Link>{' '}
                      · conectada el {dateFormat.format(item.connectedAt)} ·{' '}
                      {item.lastUsedAt
                        ? `último uso ${dateFormat.format(item.lastUsedAt)}`
                        : 'sin usar todavía'}
                    </p>
                  </div>
                  <RevokeButton
                    familyId={item.familyId}
                    label={`Revocar la conexión de ${item.clientName}`}
                  />
                </div>
              ))}
            </RuledGrid>
          </>
        )}
      </div>
    </div>
  );
}
