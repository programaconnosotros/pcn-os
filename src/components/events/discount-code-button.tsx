'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, Copy, TicketPercent } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
  eventId: string;
  eventName: string;
  // Solo llega con sesión iniciada: sin cuenta, el código no sale del servidor.
  code: string | null;
};

/**
 * The PCN members' discount for an event with external registration. With an account, opens a
 * dialog to copy the code; without one, invites to sign in to see it.
 */
export function DiscountCodeButton({ eventId, eventName, code }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  if (!code) {
    return (
      <p className="text-center text-xs text-muted-foreground">
        Hay un código de descuento para la comunidad.{' '}
        <Link
          href={`/iniciar-sesion?redirect=/eventos/${eventId}`}
          className="text-pcnGreen hover:underline"
        >
          Iniciá sesión para verlo
        </Link>
      </p>
    );
  }

  const handleCopy = async () => {
    inputRef.current?.select();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  return (
    <>
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <TicketPercent className="h-4 w-4" />
        Ver código de descuento
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Código de descuento</DialogTitle>
            <DialogDescription>
              Por ser parte de programaConNosotros, usalo al inscribirte a {eventName}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={code}
                readOnly
                aria-label="Código de descuento"
                className="flex-1 font-mono text-sm tracking-wider text-pcnGreen"
                onClick={() => inputRef.current?.select()}
              />
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="sr-only">{copied ? 'Copiado' : 'Copiar código'}</span>
              </Button>
            </div>
            <p className="border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              [!] Los canjes son limitados: puede que el código ya no funcione. Usalo cuanto antes.
            </p>
            <p aria-live="polite" className="min-h-4 text-xs text-pcnGreen text-glow">
              {copied ? '[ok] código copiado al portapapeles' : ''}
            </p>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              cerrar();
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
