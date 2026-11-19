import type { ReactElement } from 'react';
import { render, screen, within } from '@testing-library/react';
import { fetchEvent } from '@/actions/events/fetch-event';
import { getEventAnnouncements } from '@/actions/announcements/get-event-announcements';
import { EventDetailClient } from '@/components/events/event-detail-client';
import { EventPhotos } from '@/components/events/event-photos';
import { PastEventMemory } from '@/components/events/memory/past-event-memory';
import { getEventCounts } from '@/lib/event-index';
import { getWaitlistPosition } from '@/lib/event-waitlist';
import prisma from '@/lib/prisma';
import { findSession } from '@/lib/session';
import { MISSING_TAB_TITLE } from '@/lib/tab-title';
import { mockCookies } from '@/test/cookies';
import { buildEvent } from '@/test/events';
import { buildSession, renderInPlatform } from '@/test/platform';
import EventDetailPage, { generateMetadata } from './page';
import Loading from './loading';

jest.mock('next/headers', () => ({ cookies: jest.fn() }));
jest.mock('@/actions/events/fetch-event', () => ({ fetchEvent: jest.fn() }));
jest.mock('@/actions/announcements/get-event-announcements', () => ({
  getEventAnnouncements: jest.fn(),
}));
jest.mock('@/lib/session', () => ({ findSession: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    eventRegistration: { findFirst: jest.fn(), findMany: jest.fn() },
    event: { findUnique: jest.fn() },
  },
}));
jest.mock('@/lib/event-index', () => ({ getEventCounts: jest.fn() }));
jest.mock('@/lib/event-waitlist', () => ({ getWaitlistPosition: jest.fn() }));
jest.mock('@/lib/gallery-signing', () => ({
  signGallerySrc: (src: string) => ({ url: `https://signed.test/${src}` }),
  signGalleryItem: <T,>(item: T) => item,
}));
jest.mock('@/components/events/event-flyer-carousel', () => ({
  EventFlyerCarousel: () => <div data-testid="flyer" />,
}));
jest.mock('@/components/events/event-photos', () => ({
  EventPhotos: jest.fn(() => <div data-testid="photos" />),
}));
jest.mock('@/components/events/event-detail-client', () => ({
  EventDetailClient: jest.fn(() => <div data-testid="registration" />),
}));
jest.mock('@/components/announcements/event-announcements', () => ({
  EventAnnouncements: ({ announcements }: { announcements: { title: string }[] }) => (
    <ul aria-label="anuncios">
      {announcements.map((a) => (
        <li key={a.title}>{a.title}</li>
      ))}
    </ul>
  ),
}));
jest.mock('@/components/events/memory/past-event-memory', () => ({
  PastEventMemory: jest.fn(() => <div data-testid="memory" />),
}));

type DetailEvent = NonNullable<Awaited<ReturnType<typeof fetchEvent>>>;

const organizer = { userId: 'org-1', user: { id: 'org-1', name: 'Olga', image: null } };

const buildDetail = (overrides: Partial<DetailEvent> = {}) =>
  ({
    ...buildEvent({ _count: { registrations: 0, talks: 0, galleryItems: 0 } }),
    galleryItems: [],
    sponsors: [],
    flyerDesigners: [],
    organizers: [],
    ...overrides,
  }) as DetailEvent;

const params = (id = 'e1') => ({ params: Promise.resolve({ id }) });

const signIn = (user: { id?: string; role?: 'USER' | 'ADMIN' } = {}) => {
  mockCookies({ sessionId: 'token' });
  const session = buildSession(user);
  Object.assign(session, { userId: session.user.id });
  Object.assign(session.user, { isAmbassador: false });
  jest.mocked(findSession).mockResolvedValue(session as never);
};

const renderPage = async (event: DetailEvent | null) => {
  jest.mocked(fetchEvent).mockResolvedValue(event);
  return renderInPlatform((await EventDetailPage(params())) as ReactElement);
};

const registrationProps = () => jest.mocked(EventDetailClient).mock.calls.at(-1)![0];

beforeEach(() => {
  mockCookies();
  jest.mocked(findSession).mockResolvedValue(null as never);
  jest.mocked(getEventAnnouncements).mockResolvedValue([]);
  jest.mocked(getEventCounts).mockResolvedValue({ activeRegistrations: 0, waitlist: 0 } as never);
  jest.mocked(prisma.eventRegistration.findFirst).mockResolvedValue(null);
  jest.mocked(prisma.eventRegistration.findMany).mockResolvedValue([]);
  jest.mocked(prisma.event.findUnique).mockResolvedValue(null);
  jest.mocked(getWaitlistPosition).mockResolvedValue(null as never);
});

describe('generateMetadata', () => {
  it('says the event does not exist when it is missing', async () => {
    jest.mocked(fetchEvent).mockResolvedValue(null);
    const metadata = await generateMetadata(params('nope'));
    expect(metadata.title).toEqual({ absolute: MISSING_TAB_TITLE });
    expect(metadata.description).toMatch(/no existe/);
  });

  it('strips HTML, truncates the description and uses the optimized first flyer', async () => {
    jest.mocked(fetchEvent).mockResolvedValue(
      buildDetail({
        description: `<p>Hola</p>\n\n${'palabra '.repeat(40)}`,
        flyerImages: ['https://cdn.test/flyer.png'],
      }),
    );
    const metadata = await generateMetadata(params());

    expect(metadata.title).toBe('cat ~/eventos/meetup-pcn');
    expect(metadata.description).toMatch(/^Hola palabra/);
    expect(metadata.description).toHaveLength(158);
    expect(metadata.description).toMatch(/…$/);
    expect(metadata.openGraph).toMatchObject({
      title: { absolute: 'Meetup PCN' },
      url: '/eventos/e1',
      images: [
        {
          url: expect.stringContaining('/_next/image?url=https%3A%2F%2Fcdn.test%2Fflyer.png'),
          alt: 'Flyer de Meetup PCN',
        },
      ],
    });
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image' });
  });

  it('falls back to a signed gallery photo, then to the generated card', async () => {
    jest.mocked(fetchEvent).mockResolvedValue(
      buildDetail({
        galleryItems: [{ id: 'g1', src: 'foto.jpg' }] as DetailEvent['galleryItems'],
      }),
    );
    const withPhoto = await generateMetadata(params());
    expect(withPhoto.description).toBe('Una juntada para programar');
    expect(JSON.stringify(withPhoto.openGraph)).toContain(
      encodeURIComponent('https://signed.test/foto.jpg'),
    );

    jest.mocked(fetchEvent).mockResolvedValue(buildDetail());
    const bare = await generateMetadata(params());
    expect(bare.openGraph).toMatchObject({ images: [{ url: '/eventos/e1/og-image' }] });
  });
});

describe('EventDetailPage', () => {
  it('tells the visitor when the event does not exist', async () => {
    await renderPage(null);
    expect(screen.getByText('No encontramos este evento')).toBeInTheDocument();
  });

  it('shows an event that already ended as its memory', async () => {
    signIn({ role: 'ADMIN' });
    await renderPage(buildDetail({ date: new Date('2020-01-01T20:00:00Z') }));

    expect(screen.getByTestId('memory')).toBeInTheDocument();
    expect(jest.mocked(PastEventMemory).mock.calls[0][0]).toMatchObject({
      canEdit: true,
      isAdmin: true,
    });
    expect(screen.queryByTestId('registration')).not.toBeInTheDocument();
  });

  it('shows an anonymous visitor the info, sponsors, map and how to propose a talk', async () => {
    jest.mocked(getEventAnnouncements).mockResolvedValue([{ title: 'Cambio de sala' }] as never);
    await renderPage(
      buildDetail({
        callForSpeakersEnabled: true,
        googleMapsUrl: 'https://maps.app.goo.gl/abc',
        organizers: [organizer],
        sponsors: [
          { id: 's1', name: 'Acme', website: 'https://acme.test' },
          { id: 's2', name: 'Sin web', website: null },
        ] as DetailEvent['sponsors'],
      }),
    );

    expect(screen.queryByRole('link', { name: /editarEvento/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId('photos')).not.toBeInTheDocument();
    expect(findSession).not.toHaveBeenCalled();
    expect(registrationProps()).toMatchObject({
      eventId: 'e1',
      isAuthenticated: false,
      isRegistered: false,
      capacityInfo: null,
      capacityAvailable: true,
      isFull: false,
      waitlistPosition: null,
    });
    expect(
      screen.getByText('Bar XYZ · Av. Siempre Viva 742 · Córdoba, Argentina'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /abrir en Google Maps/ })).toHaveAttribute(
      'href',
      'https://maps.app.goo.gl/abc',
    );
    expect(screen.getByTitle('Ubicación del evento')).toHaveAttribute(
      'src',
      expect.stringContaining('output=embed'),
    );
    expect(screen.getByRole('link', { name: /descargar \.ics/ })).toHaveAttribute(
      'href',
      '/eventos/e1/calendario.ics',
    );
    expect(screen.getByRole('link', { name: /google calendar/ })).toHaveAttribute(
      'href',
      expect.stringContaining('calendar.google.com'),
    );
    expect(screen.getByRole('link', { name: /proponer/ })).toHaveAttribute(
      'href',
      '/iniciar-sesion?redirect=/eventos/e1/proponer-charla',
    );
    expect(screen.getByRole('link', { name: 'Acme' })).toHaveAttribute('href', 'https://acme.test');
    expect(screen.getByText('Sin web')).toBeInTheDocument();
    expect(screen.getByText('Olga')).toBeInTheDocument();
    expect(screen.queryByText(/gestionar organizadores/)).not.toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'anuncios' })).getByText('Cambio de sala'));
  });

  it('tells a registered member they are in and reports a full capacity', async () => {
    signIn();
    jest.mocked(prisma.eventRegistration.findFirst).mockResolvedValue({ id: 'r1' } as never);
    jest
      .mocked(getEventCounts)
      .mockResolvedValue({ activeRegistrations: 10, waitlist: 2 } as never);
    await renderPage(buildDetail({ capacity: 10, callForSpeakersEnabled: true }));

    expect(prisma.eventRegistration.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { eventId: 'e1', userId: 'user-1', cancelledAt: null } }),
    );
    expect(registrationProps()).toMatchObject({
      isAuthenticated: true,
      isRegistered: true,
      registrationId: 'r1',
      capacityInfo: { current: 10, capacity: 10, available: false },
      capacityAvailable: false,
      isFull: true,
      waitlistCount: 2,
      waitlistPosition: null,
    });
    expect(getWaitlistPosition).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: /proponer/ })).toHaveAttribute(
      'href',
      '/eventos/e1/proponer-charla',
    );
    expect(screen.queryByText(/ver propuestas/)).not.toBeInTheDocument();
    expect(prisma.eventRegistration.findMany).not.toHaveBeenCalled();
  });

  it('tells a member waiting for a spot their place in the waitlist', async () => {
    signIn();
    jest.mocked(getEventCounts).mockResolvedValue({ activeRegistrations: 3, waitlist: 4 } as never);
    jest.mocked(getWaitlistPosition).mockResolvedValue(2 as never);
    await renderPage(buildDetail({ capacity: 5, markedAsFull: true }));

    expect(getWaitlistPosition).toHaveBeenCalledWith('e1', 'user-1');
    expect(registrationProps()).toMatchObject({
      capacityInfo: { current: 3, capacity: 5, available: true },
      isFull: true,
      waitlistPosition: 2,
    });
  });

  it('gives admins the management links, photo upload and a registrations summary', async () => {
    signIn({ role: 'ADMIN' });
    jest.mocked(getEventCounts).mockResolvedValue({ activeRegistrations: 1, waitlist: 3 } as never);
    jest
      .mocked(prisma.eventRegistration.findMany)
      .mockResolvedValue([{ cancelledAt: null }, { cancelledAt: new Date() }] as never);
    await renderPage(buildDetail({ callForSpeakersEnabled: true }));

    expect(screen.getByRole('link', { name: /editarEvento/ })).toHaveAttribute(
      'href',
      '/eventos/e1/editar',
    );
    expect(jest.mocked(EventPhotos).mock.calls[0][0]).toMatchObject({
      eventId: 'e1',
      photos: [],
      canUpload: true,
    });
    expect(screen.getByRole('link', { name: /ver propuestas/ })).toHaveAttribute(
      'href',
      '/eventos/e1/propuestas-de-charlas',
    );
    expect(screen.getByRole('link', { name: /gestionar →/ })).toHaveAttribute(
      'href',
      '/eventos/e1/charlas',
    );
    expect(screen.getByRole('link', { name: /gestionar organizadores/ })).toHaveAttribute(
      'href',
      '/eventos/e1/organizadores',
    );
    expect(screen.getByRole('link', { name: /ver todas/ })).toHaveTextContent(
      '1 activas · 2 total · 3 en espera',
    );
  });

  it('lets an organizer manage the event without uploading photos', async () => {
    signIn({ id: 'org-1' });
    await renderPage(
      buildDetail({
        organizers: [organizer],
        galleryItems: [{ id: 'g1', src: 'a.jpg', thumbSrc: 'a-t.jpg' }] as never,
        _count: { registrations: 0, talks: 0, galleryItems: 30 } as never,
      }),
    );

    expect(screen.getByRole('link', { name: /editarEvento/ })).toBeInTheDocument();
    expect(jest.mocked(EventPhotos).mock.calls[0][0]).toMatchObject({
      total: 30,
      canUpload: false,
    });
    expect(screen.getByRole('link', { name: /ver todas/ })).toHaveTextContent(
      '0 activas · 0 total',
    );
    expect(screen.queryByText(/ver propuestas/)).not.toBeInTheDocument();
  });

  it('skips registration lookups for an event with external registration', async () => {
    signIn({ role: 'ADMIN' });
    await renderPage(buildDetail({ externalRegistrationUrl: 'https://tickets.test' }));

    expect(prisma.eventRegistration.findFirst).not.toHaveBeenCalled();
    expect(prisma.eventRegistration.findMany).not.toHaveBeenCalled();
    expect(getEventCounts).not.toHaveBeenCalled();
    expect(registrationProps()).toMatchObject({
      externalRegistrationUrl: 'https://tickets.test',
    });
    expect(screen.queryByRole('link', { name: /ver todas/ })).not.toBeInTheDocument();
  });

  it('passes the discount code only to someone signed in', async () => {
    jest.mocked(prisma.event.findUnique).mockResolvedValue({ discountCode: 'PCN20' } as never);
    const external = buildDetail({ externalRegistrationUrl: 'https://tickets.test' });

    await renderPage(external);
    expect(registrationProps().discount).toEqual({ code: null });

    signIn();
    await renderPage(external);
    expect(registrationProps().discount).toEqual({ code: 'PCN20' });
  });

  it('shows no discount when the event has no code or uses its own registration', async () => {
    signIn();
    await renderPage(buildDetail({ externalRegistrationUrl: 'https://tickets.test' }));
    expect(registrationProps().discount).toBeNull();

    await renderPage(buildDetail());
    expect(prisma.event.findUnique).toHaveBeenCalledTimes(1);
    expect(registrationProps().discount).toBeNull();
  });

  it('shows an online event with its stream and both start and end', async () => {
    await renderPage(
      buildDetail({
        isOnline: true,
        streamingUrl: 'https://youtube.test/live',
        googleMapsUrl: 'https://maps.app.goo.gl/abc',
        endDate: new Date('2030-05-11T01:00:00.000Z'),
      }),
    );

    expect(screen.getByText('online')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver transmisión/ })).toHaveAttribute(
      'href',
      'https://youtube.test/live',
    );
    expect(screen.getByText('inicio')).toBeInTheDocument();
    expect(screen.getByText('fin')).toBeInTheDocument();
    expect(screen.queryByTitle('Ubicación del evento')).not.toBeInTheDocument();
    expect(screen.queryByText('lugar')).not.toBeInTheDocument();
  });

  it('leaves out the place and description when the event has none', async () => {
    await renderPage(buildDetail({ city: null, placeName: null, address: null, description: '' }));

    expect(screen.getByText('fecha')).toBeInTheDocument();
    expect(screen.queryByText('lugar')).not.toBeInTheDocument();
    expect(screen.queryByText('descripción')).not.toBeInTheDocument();
    expect(screen.queryByText('organizadores')).not.toBeInTheDocument();
  });
});

describe('EventDetailPage loading', () => {
  it('renders only placeholders', () => {
    const { container } = render(<Loading />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    expect(container).toHaveTextContent('');
  });
});
