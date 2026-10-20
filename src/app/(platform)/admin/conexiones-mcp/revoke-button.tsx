'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import { revokeAllMcpConnections, revokeMcpConnection } from '@/actions/oauth/mcp-connections';
import { actionErrorMessage } from '@/lib/rate-limit-messages';

/** Disconnects one MCP connection, or all of them without `familyId`. */
export function RevokeButton({ familyId, label }: { familyId?: string; label: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const revoke = () =>
    startTransition(async () => {
      try {
        if (familyId) await revokeMcpConnection(familyId);
        else await revokeAllMcpConnections();
        toast.success(familyId ? 'Conexión revocada' : 'Se revocaron todas las conexiones');
        router.refresh();
      } catch (error) {
        toast.error(actionErrorMessage(error, 'No se pudo revocar'));
      }
    });

  return (
    <button
      type="button"
      onClick={revoke}
      disabled={isPending}
      aria-label={label}
      className="flex shrink-0 items-center gap-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-red-400 disabled:opacity-50"
    >
      {isPending ? (
        <Loader2 className="size-3 animate-spin" aria-hidden />
      ) : (
        <Unplug className="size-3" aria-hidden />
      )}
      {familyId ? 'revocar' : 'revocar todas'}
    </button>
  );
}
