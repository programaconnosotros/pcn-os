'use client';

import { useState, type FormEvent } from 'react';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { approveAuthorization } from '@/actions/oauth/approve-authorization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { actionErrorMessage } from '@/lib/rate-limit-messages';

type ConsentFormProps = {
  /** The authorization request's query, sent back to the server action to validate again. */
  query: Record<string, string>;
  /** Where "cancelar" sends the client: its redirect URI with `error=access_denied`. */
  denyUrl: string;
};

export const ConsentForm = ({ query, denyUrl }: ConsentFormProps) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const approve = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await approveAuthorization({ query, code });
      if (!result.ok) {
        toast.error(result.error);
        setCode('');
        setLoading(false);
        return;
      }
      window.location.assign(result.redirectTo);
    } catch (error) {
      toast.error(actionErrorMessage(error, 'No se pudo autorizar la conexión.'));
      setLoading(false);
    }
  };

  return (
    <form onSubmit={approve} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="mcp-2fa-code" className="text-sm font-medium">
          Código de tu app de autenticación
        </label>
        <Input
          id="mcp-2fa-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          autoComplete="one-time-code"
          inputMode="numeric"
          placeholder="123456"
          maxLength={20}
          className="font-mono tracking-widest"
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={loading}
          onClick={() => window.location.assign(denyUrl)}
        >
          cancelar
          <X className="ml-2 h-4 w-4" />
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={!code.trim()}
          loading={loading}
          loadingText="autorizando..."
        >
          permitir();
          <Check className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
};
