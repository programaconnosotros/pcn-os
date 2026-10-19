'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { approveAuthorization } from '@/actions/oauth/approve-authorization';
import { Button } from '@/components/ui/button';
import { actionErrorMessage } from '@/lib/rate-limit-messages';

type ConsentFormProps = {
  /** The authorization request's query, sent back to the server action to validate again. */
  query: Record<string, string>;
  /** Where "Cancelar" sends the client: its redirect URI with `error=access_denied`. */
  denyUrl: string;
};

export const ConsentForm = ({ query, denyUrl }: ConsentFormProps) => {
  const [loading, setLoading] = useState(false);

  const approve = async () => {
    setLoading(true);
    try {
      const result = await approveAuthorization(query);
      if (!result.ok) {
        toast.error(result.error);
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
        type="button"
        size="lg"
        loading={loading}
        loadingText="autorizando..."
        onClick={approve}
      >
        permitir();
        <Check className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
};
