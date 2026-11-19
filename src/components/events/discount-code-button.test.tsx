import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DiscountCodeButton } from './discount-code-button';

// User-event flows through Radix portals: give them room on a busy machine
jest.setTimeout(20_000);

describe('DiscountCodeButton', () => {
  it('opens a dialog with the code and copies it', async () => {
    const user = userEvent.setup();
    render(<DiscountCodeButton eventId="e1" eventName="Meetup" code="PCN20" />);

    expect(screen.queryByText('PCN20')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver código de descuento' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Código de descuento');
    expect(screen.getByRole('textbox', { name: 'Código de descuento' })).toHaveValue('PCN20');
    expect(dialog).toHaveTextContent('Los canjes son limitados');

    await user.click(screen.getByRole('button', { name: 'Copiar código' }));
    expect(await navigator.clipboard.readText()).toBe('PCN20');
    expect(screen.getByText('[ok] código copiado al portapapeles')).toBeInTheDocument();
  });

  it('invites a visitor without a session to sign in instead of showing the code', () => {
    render(<DiscountCodeButton eventId="e1" eventName="Meetup" code={null} />);

    expect(
      screen.queryByRole('button', { name: 'Ver código de descuento' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Iniciá sesión para verlo' })).toHaveAttribute(
      'href',
      '/iniciar-sesion?redirect=/eventos/e1',
    );
  });
});
