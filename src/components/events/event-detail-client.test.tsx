import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { registerEvent } from '@/actions/events/register-event';
import { cancelRegistration } from '@/actions/events/cancel-registration';
import { mockRouter, setLocation } from '@/test/dom';
import { EventDetailClient } from './event-detail-client';

jest.mock('@/actions/events/register-event', () => ({ registerEvent: jest.fn() }));
jest.mock('@/actions/events/cancel-registration', () => ({ cancelRegistration: jest.fn() }));
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    promise: jest.fn((promise: Promise<unknown>) => promise),
  },
}));

const base = {
  eventId: 'e1',
  eventName: 'Meetup',
  isAuthenticated: true,
  isRegistered: false,
  registrationId: null,
  capacityAvailable: true,
  capacityInfo: null,
};

// User-event flows through Radix portals: give them room on a busy machine
jest.setTimeout(20_000);

describe('EventDetailClient', () => {
  beforeEach(() => {
    setLocation('/eventos/e1');
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('shows remaining places and registers, then shows the success dialog', async () => {
    jest.mocked(registerEvent).mockResolvedValue({ status: 'registered' } as never);
    render(
      <EventDetailClient {...base} capacityInfo={{ current: 8, capacity: 10, available: true }} />,
    );

    expect(screen.getByText('Quedan 2 lugares disponibles.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'inscribirme();' }));

    expect(await screen.findByRole('dialog')).toHaveTextContent('Ya estás registrado en Meetup');
    expect(screen.getByText('Ya estás registrado')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'entendido();' }));
    expect(mockRouter.refresh).toHaveBeenCalled();
  });

  it('joins the waitlist when full and can leave it', async () => {
    jest.mocked(registerEvent).mockResolvedValue({ status: 'waitlisted', position: 2 } as never);
    jest.mocked(cancelRegistration).mockResolvedValue(undefined as never);
    render(<EventDetailClient {...base} isFull capacityAvailable={false} waitlistCount={3} />);

    expect(screen.getByText('Cupo completo')).toBeInTheDocument();
    expect(screen.getByText(/3 personas esperan un lugar/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'unirmeAListaDeEspera();' }));

    expect(await screen.findByRole('dialog')).toHaveTextContent('tu lugar en la fila es el #2');
    await userEvent.click(screen.getByRole('button', { name: 'entendido();' }));
    expect(screen.getByText('Estás en la lista de espera · lugar #2')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'salirDeLaListaDeEspera();' }));
    expect(
      await screen.findByRole('button', { name: 'unirmeAListaDeEspera();' }),
    ).toBeInTheDocument();
  });

  it('uses singular copy for a single person waiting', () => {
    render(<EventDetailClient {...base} isFull waitlistCount={1} />);

    expect(screen.getByText(/1 persona espera un lugar/)).toBeInTheDocument();
  });

  it('lets a registered member cancel and register again', async () => {
    jest.mocked(cancelRegistration).mockResolvedValue(undefined as never);
    render(<EventDetailClient {...base} isRegistered registrationId="r1" />);

    await userEvent.click(screen.getByRole('button', { name: 'cancelarInscripcion();' }));

    expect(cancelRegistration).toHaveBeenCalledWith({ registrationId: 'r1', eventId: 'e1' });
    // The server props still say registered until the refresh lands
    await waitFor(() => expect(mockRouter.refresh).toHaveBeenCalled());
  });

  it('only shows the external registration link when the event uses one', () => {
    render(
      <EventDetailClient {...base} externalRegistrationUrl="https://lu.ma/x" isFull isRegistered />,
    );

    expect(screen.getByRole('button', { name: 'unirmeAListaDeEspera();' })).toBeInTheDocument();
    expect(screen.queryByText('Ya estás registrado')).not.toBeInTheDocument();
  });

  it('shows the discount button next to the external registration', () => {
    render(
      <EventDetailClient
        {...base}
        externalRegistrationUrl="https://lu.ma/x"
        discount={{ code: 'PCN20' }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Ver código de descuento' })).toBeInTheDocument();
  });

  it('opens the success dialog when arriving with ?registered=true', async () => {
    setLocation('/eventos/e1', 'registered=true');
    render(<EventDetailClient {...base} />);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(mockRouter.replace).toHaveBeenCalledWith('/eventos/e1', { scroll: false });
  });

  it('auto-registers once after logging in', async () => {
    setLocation('/eventos/e1', 'autoRegister=true');
    jest.mocked(registerEvent).mockResolvedValue({ status: 'registered' } as never);
    render(<EventDetailClient {...base} />);

    expect(await screen.findByRole('dialog')).toHaveTextContent('Ya estás registrado en Meetup');
    expect(registerEvent).toHaveBeenCalledTimes(1);
    expect(registerEvent).toHaveBeenCalledWith('e1', { skipRedirect: true });
    expect(mockRouter.replace).toHaveBeenCalledWith('/eventos/e1', { scroll: false });
  });

  it('toasts when the auto-registration fails', async () => {
    setLocation('/eventos/e1', 'autoRegister=true');
    jest.mocked(registerEvent).mockRejectedValue(new Error('Evento finalizado'));
    render(<EventDetailClient {...base} />);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Evento finalizado'));
    expect(mockRouter.replace).toHaveBeenCalledWith('/eventos/e1', { scroll: false });
    expect(await screen.findByRole('button', { name: 'inscribirme();' })).toBeEnabled();
  });

  it('just cleans the URL when an anonymous visitor arrives with autoRegister', () => {
    setLocation('/eventos/e1', 'autoRegister=true');
    render(<EventDetailClient {...base} isAuthenticated={false} />);

    expect(registerEvent).not.toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith('/eventos/e1', { scroll: false });
  });

  it('shows the waitlist position given by the server', () => {
    render(<EventDetailClient {...base} waitlistPosition={5} />);

    expect(screen.getByText('Estás en la lista de espera · lugar #5')).toBeInTheDocument();
  });
});
