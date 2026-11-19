import { render, screen } from '@testing-library/react';
import { getCurrentSession } from '@/actions/auth/get-current-session';
import { fetchEventForEdit } from '@/actions/events/fetch-event-for-edit';
import { EditEventForm } from '@/components/events/edit-event-form';
import { buildEvent } from '@/test/events';
import { buildSession, renderInPlatform } from '@/test/platform';
import EditEventPage, { metadata } from './page';
import Loading from './loading';

jest.mock('@/actions/auth/get-current-session', () => ({ getCurrentSession: jest.fn() }));
jest.mock('@/actions/events/fetch-event-for-edit', () => ({ fetchEventForEdit: jest.fn() }));
jest.mock('@/components/events/edit-event-form', () => ({
  EditEventForm: jest.fn(() => <form aria-label="editar evento" />),
}));
jest.mock('@/components/events/delete-event-button', () => ({
  DeleteEventButton: ({ eventName }: { eventName: string }) => (
    <button type="button">eliminar {eventName}</button>
  ),
}));

const params = { params: Promise.resolve({ id: 'e1' }) };
type EditEvent = NonNullable<Awaited<ReturnType<typeof fetchEventForEdit>>>;

const sessionAs = (id: string, role: 'USER' | 'ADMIN' = 'USER') => {
  const session = buildSession({ id, role });
  Object.assign(session.user, { isAmbassador: false });
  jest.mocked(getCurrentSession).mockResolvedValue(session);
};

const formProps = () => jest.mocked(EditEventForm).mock.calls.at(-1)![0];

describe('EditEventPage', () => {
  it('sends anonymous visitors back to the event', async () => {
    jest.mocked(getCurrentSession).mockResolvedValue(null);
    await expect(EditEventPage(params)).rejects.toThrow('NEXT_REDIRECT:/eventos/e1');
    expect(fetchEventForEdit).not.toHaveBeenCalled();
  });

  it('sends members who cannot edit it back to the event', async () => {
    sessionAs('user-1');
    jest.mocked(fetchEventForEdit).mockRejectedValue(new Error('No autorizado'));
    await expect(EditEventPage(params)).rejects.toThrow('NEXT_REDIRECT:/eventos/e1');
  });

  it('sends people to the events list when the event is gone', async () => {
    sessionAs('user-1', 'ADMIN');
    jest.mocked(fetchEventForEdit).mockResolvedValue(null as never);
    await expect(EditEventPage(params)).rejects.toThrow(/^NEXT_REDIRECT:\/eventos$/);
  });

  it('fills the form with the event and lets an admin delete it', async () => {
    sessionAs('user-1', 'ADMIN');
    jest.mocked(fetchEventForEdit).mockResolvedValue({
      ...buildEvent({
        endDate: new Date('2030-05-11T01:00:00.000Z'),
        capacity: 40,
        googleMapsUrl: 'https://maps.test',
        shortcut: 'meetup',
      }),
      discountCode: 'PCN20',
      organizers: [],
      sponsors: [
        { id: 's1', name: 'Acme', website: 'https://acme.test' },
        { id: 's2', name: 'Otro', website: null },
      ],
    } as unknown as EditEvent);
    renderInPlatform(await EditEventPage(params));

    expect(screen.getByRole('button', { name: 'eliminar Meetup PCN' })).toBeInTheDocument();
    expect(formProps()).toEqual({
      eventId: 'e1',
      defaultValues: {
        name: 'Meetup PCN',
        description: 'Una juntada para programar',
        date: '2030-05-10T22:00:00.000Z',
        endDate: '2030-05-11T01:00:00.000Z',
        city: 'Córdoba',
        address: 'Av. Siempre Viva 742',
        placeName: 'Bar XYZ',
        flyerImages: [],
        googleMapsUrl: 'https://maps.test',
        capacity: '40',
        externalRegistrationUrl: '',
        discountCode: 'PCN20',
        shortcut: 'meetup',
        isOnline: false,
        streamingUrl: '',
        markedAsFull: false,
        callForSpeakersEnabled: false,
        sponsors: [
          { name: 'Acme', website: 'https://acme.test' },
          { name: 'Otro', website: '' },
        ],
      },
      flyerAgent: true,
    });
  });

  it('lets an organizer edit but not delete, with empty fields as blanks', async () => {
    sessionAs('org-1');
    jest.mocked(fetchEventForEdit).mockResolvedValue({
      ...buildEvent({ city: null, address: null, placeName: null }),
      organizers: [{ userId: 'org-1' }],
    } as unknown as EditEvent);
    renderInPlatform(await EditEventPage(params));

    expect(screen.queryByRole('button', { name: /eliminar/ })).not.toBeInTheDocument();
    expect(formProps().flyerAgent).toBe(false);
    expect(formProps().defaultValues).toMatchObject({
      endDate: '',
      city: '',
      address: '',
      placeName: '',
      capacity: '',
      googleMapsUrl: '',
      shortcut: '',
      sponsors: [],
    });
  });

  it('has a tab title and a loading placeholder', () => {
    expect(metadata.title).toMatch(/editar/);
    const { container } = render(<Loading />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    expect(container).toHaveTextContent('');
  });
});
