'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { registerEvent, type RegistrationResult } from '@/actions/events/register-event';
import { RegistrationSuccessDialog } from './registration-success-dialog';
import { RegisterEventButton, signInUrl } from './register-event-button';
import { CancelRegistrationButton } from './cancel-registration-button';
import { DiscountCodeButton } from './discount-code-button';
import { toast } from 'sonner';
import { actionErrorMessage } from '@/lib/rate-limit-messages';
import { isAuthRequiredError } from '@/lib/auth-required';

type Props = {
  eventId: string;
  eventName: string;
  isAuthenticated: boolean;
  isRegistered: boolean;
  registrationId: string | null;
  capacityAvailable: boolean;
  capacityInfo: {
    current: number;
    capacity: number;
    available: boolean;
  } | null;
  externalRegistrationUrl?: string | null;
  // Descuento de la inscripción externa: null si no hay; `code` solo llega con sesión iniciada.
  discount?: { code: string | null } | null;
  isFull?: boolean;
  // Posición en la lista de espera si la persona está esperando un lugar
  waitlistPosition?: number | null;
  waitlistCount?: number;
};

export function EventDetailClient({
  eventId,
  eventName,
  isAuthenticated,
  isRegistered: initialIsRegistered,
  registrationId,
  capacityAvailable,
  capacityInfo,
  externalRegistrationUrl,
  discount = null,
  isFull = false,
  waitlistPosition: initialWaitlistPosition = null,
  waitlistCount = 0,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [hasAutoRegistered, setHasAutoRegistered] = useState(false);
  const [isAutoRegistering, setIsAutoRegistering] = useState(false);
  // Estado local para saber si ya se registró en esta sesión
  const [justRegisteredLocally, setJustRegisteredLocally] = useState(false);
  // Posición en la lista de espera si se sumó en esta sesión
  const [localWaitlistPosition, setLocalWaitlistPosition] = useState<number | null>(null);
  const [leftWaitlistLocally, setLeftWaitlistLocally] = useState(false);

  const autoRegister = searchParams.get('autoRegister') === 'true';
  const justRegistered = searchParams.get('registered') === 'true';

  // El usuario está registrado si viene del server O si se registró localmente
  const isRegistered = initialIsRegistered || justRegisteredLocally;
  const waitlistPosition = leftWaitlistLocally
    ? null
    : (localWaitlistPosition ?? initialWaitlistPosition);
  const isWaitlisted = !isRegistered && waitlistPosition !== null;

  // Mostrar dialog si viene con registered=true
  useEffect(() => {
    if (justRegistered) {
      setShowSuccessDialog(true);
      setJustRegisteredLocally(true);
      // Limpiar URL sin recargar
      router.replace(`/eventos/${eventId}`, { scroll: false });
    }
  }, [justRegistered, eventId, router]);

  // Auto-registrar si viene de login/registro
  useEffect(() => {
    if (
      autoRegister &&
      isAuthenticated &&
      !isRegistered &&
      !isWaitlisted &&
      !hasAutoRegistered &&
      !externalRegistrationUrl
    ) {
      const performAutoRegister = async () => {
        setHasAutoRegistered(true);
        setIsAutoRegistering(true);

        try {
          // Sin cupo, el servidor la suma a la lista de espera
          const result = await registerEvent(eventId, { skipRedirect: true });

          // Limpiar URL y mostrar dialog
          router.replace(`/eventos/${eventId}`, { scroll: false });
          handleRegistrationSuccess(result);
        } catch (error: any) {
          if (isAuthRequiredError(error)) {
            toast.info('Tu sesión se cerró. Iniciá sesión para inscribirte.');
            router.replace(signInUrl(eventId));
            return;
          }
          toast.error(actionErrorMessage(error, 'Error al inscribirse automáticamente', true));
          router.replace(`/eventos/${eventId}`, { scroll: false });
        } finally {
          setIsAutoRegistering(false);
        }
      };

      performAutoRegister();
    } else if (autoRegister && !isAuthenticated) {
      // Limpiar URL si no está autenticado
      router.replace(`/eventos/${eventId}`, { scroll: false });
    }
  }, [
    autoRegister,
    isAuthenticated,
    isRegistered,
    isWaitlisted,
    hasAutoRegistered,
    eventId,
    externalRegistrationUrl,
    router,
  ]);

  function handleRegistrationSuccess(result: RegistrationResult) {
    if (result.status === 'waitlisted') {
      setLocalWaitlistPosition(result.position);
      setLeftWaitlistLocally(false);
    } else {
      setJustRegisteredLocally(true);
    }
    setShowSuccessDialog(true);
  }

  const handleDialogClose = () => {
    setShowSuccessDialog(false);
    // Hacer refresh para actualizar la UI del servidor
    router.refresh();
  };

  const handleCancellation = () => {
    // Resetear el estado local para mostrar el botón de inscripción
    setJustRegisteredLocally(false);
  };

  const handleLeaveWaitlist = () => {
    setLocalWaitlistPosition(null);
    setLeftWaitlistLocally(true);
  };

  // Renderizar según el estado
  if (externalRegistrationUrl) {
    return (
      <div className="space-y-3">
        <RegisterEventButton
          eventId={eventId}
          isAuthenticated={isAuthenticated}
          capacityAvailable={true}
          externalUrl={externalRegistrationUrl}
          label={isFull ? 'unirmeAListaDeEspera();' : undefined}
        />
        {discount && (
          <DiscountCodeButton eventId={eventId} eventName={eventName} code={discount.code} />
        )}
      </div>
    );
  }

  if (isRegistered) {
    return (
      <>
        <div className="space-y-3">
          <div className="space-y-2">
            <p className="text-center text-sm font-medium">Ya estás registrado</p>
            <p className="text-center text-xs text-muted-foreground">Te esperamos en el evento</p>
          </div>
          <CancelRegistrationButton
            eventId={eventId}
            registrationId={registrationId || undefined}
            onCancel={handleCancellation}
          />
        </div>

        <RegistrationSuccessDialog
          open={showSuccessDialog}
          onClose={handleDialogClose}
          eventName={eventName}
        />
      </>
    );
  }

  if (isWaitlisted) {
    return (
      <>
        <div className="space-y-3">
          <div className="space-y-2">
            <p className="text-center text-sm font-medium">
              Estás en la lista de espera · lugar #{waitlistPosition}
            </p>
            <p className="text-center text-xs text-muted-foreground">
              Si se libera un lugar, te inscribimos automáticamente y te avisamos por email.
            </p>
          </div>
          <CancelRegistrationButton
            eventId={eventId}
            mode="waitlist"
            onCancel={handleLeaveWaitlist}
          />
        </div>

        <RegistrationSuccessDialog
          open={showSuccessDialog}
          onClose={handleDialogClose}
          eventName={eventName}
          waitlistPosition={waitlistPosition}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {isFull && (
          <p className="text-center text-sm font-medium text-destructive">Cupo completo</p>
        )}
        <RegisterEventButton
          eventId={eventId}
          isAuthenticated={isAuthenticated}
          capacityAvailable={capacityAvailable && !isFull}
          onSuccess={handleRegistrationSuccess}
          isLoading={isAutoRegistering}
        />
        {isFull ? (
          <p className="text-center text-xs text-muted-foreground">
            {waitlistCount > 0
              ? `${waitlistCount} ${waitlistCount === 1 ? 'persona espera' : 'personas esperan'} un lugar. `
              : ''}
            Si se libera uno, se inscribe automáticamente a quien sigue en la lista.
          </p>
        ) : (
          capacityInfo && (
            <p className="text-center text-xs text-muted-foreground">
              Quedan {capacityInfo.capacity - capacityInfo.current} lugares disponibles.
            </p>
          )
        )}
      </div>

      <RegistrationSuccessDialog
        open={showSuccessDialog}
        onClose={handleDialogClose}
        eventName={eventName}
      />
    </>
  );
}
