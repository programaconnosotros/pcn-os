import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prismaMock } from '@/test/prisma';
import { mockCookies } from '@/test/cookies';
import type { EventFormData } from '@/schemas/event-schema';
import { sendEmails } from '@/lib/email';
import { createEvent } from './create-event';

jest.mock('@/lib/email', () => ({ sendEmails: jest.fn(async () => 0) }));
// react-email's render needs ESM dynamic imports, which Jest doesn't run: plain static markup.
jest.mock('@react-email/render', () => ({
  render: async (element: React.ReactElement) =>
    require('react-dom/server').renderToStaticMarkup(element),
}));

// Minimal valid data for an in-person event.
// shortcut must be a string at input time (transforms to undefined when empty).
const validEventData: EventFormData = {
  name: 'Tech Talk Buenos Aires',
  description: 'A great community event about modern software development.',
  date: '2026-08-15T18:00:00.000Z',
  isOnline: false,
  city: 'Buenos Aires',
  placeName: 'GCBA HQ',
  address: 'Diagonal Norte 1234',
  markedAsFull: false,
  callForSpeakersEnabled: false,
  shortcut: '',
};

const adminUser = {
  id: 'user-admin',
  name: 'Admin',
  email: 'admin@pcn.com',
  password: 'hash',
  emailVerified: true,
  role: 'ADMIN' as const,
  phoneNumber: null,
  image: null,
  countryOfOrigin: null,
  province: null,
  xAccountUrl: null,
  linkedinUrl: null,
  gitHubUrl: null,
  slogan: null,
  jobTitle: null,
  enterprise: null,
  career: null,
  studyPlace: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const adminSession = {
  id: 'session-admin',
  userId: 'user-admin',
  expires: new Date('2027-01-01'),
  user: adminUser,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const ambassadorSession = {
  ...adminSession,
  id: 'session-amb',
  userId: 'user-amb',
  user: { ...adminUser, id: 'user-amb', role: 'REGULAR' as const, isAmbassador: true },
};

describe('createEvent', () => {
  it('throws when there is no sessionId cookie', async () => {
    mockCookies(); // no sessionId

    await expect(createEvent(validEventData)).rejects.toThrow('Usuario no autenticado');

    expect(prismaMock.session.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.event.create).not.toHaveBeenCalled();
  });

  it('throws when the session is not found in the database', async () => {
    mockCookies({ sessionId: 'ghost-session' });
    prismaMock.session.findUnique.mockResolvedValue(null);

    await expect(createEvent(validEventData)).rejects.toThrow('Usuario no autenticado');

    expect(prismaMock.event.create).not.toHaveBeenCalled();
  });

  it('throws when the user does not have ADMIN role', async () => {
    mockCookies({ sessionId: 'session-regular' });
    prismaMock.session.findUnique.mockResolvedValue({
      ...adminSession,
      user: { ...adminUser, role: 'REGULAR' as const },
    } as any);

    await expect(createEvent(validEventData)).rejects.toThrow('No tienes permisos');

    expect(prismaMock.event.create).not.toHaveBeenCalled();
  });

  it('creates the event, revalidates the path, and redirects on success', async () => {
    mockCookies({ sessionId: 'session-admin' });
    prismaMock.session.findUnique.mockResolvedValue(adminSession as any);
    prismaMock.event.create.mockResolvedValue({ id: 'event-1' } as any);

    // redirect() throws to interrupt control flow — the action will reject
    await expect(createEvent(validEventData)).rejects.toThrow('NEXT_REDIRECT:/eventos/event-1');

    expect(prismaMock.event.create).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith('/eventos');
    expect(redirect).toHaveBeenCalledWith('/eventos/event-1');
  });

  it('passes the event name and date to prisma.event.create', async () => {
    mockCookies({ sessionId: 'session-admin' });
    prismaMock.session.findUnique.mockResolvedValue(adminSession as any);
    prismaMock.event.create.mockResolvedValue({ id: 'event-2' } as any);

    await expect(createEvent(validEventData)).rejects.toThrow('NEXT_REDIRECT:');

    expect(prismaMock.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Tech Talk Buenos Aires',
          city: 'Buenos Aires',
        }),
      }),
    );
  });

  it('records the creator as the first organizer', async () => {
    mockCookies({ sessionId: 'session-admin' });
    prismaMock.session.findUnique.mockResolvedValue(adminSession as any);
    prismaMock.event.create.mockResolvedValue({ id: 'event-3' } as any);

    await expect(createEvent(validEventData)).rejects.toThrow('NEXT_REDIRECT:');

    expect(prismaMock.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          createdById: 'user-admin',
          organizers: { create: { userId: 'user-admin' } },
        }),
      }),
    );
  });

  it('lets ambassadors create events', async () => {
    mockCookies({ sessionId: 'session-amb' });
    prismaMock.session.findUnique.mockResolvedValue(ambassadorSession as any);
    prismaMock.event.create.mockResolvedValue({ id: 'event-4' } as any);

    await expect(createEvent(validEventData)).rejects.toThrow('NEXT_REDIRECT:/eventos/event-4');

    expect(prismaMock.event.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ createdById: 'user-amb' }) }),
    );
  });
});

describe('createEvent dates and sponsors', () => {
  beforeEach(() => {
    mockCookies({ sessionId: 'session-admin' });
    prismaMock.session.findUnique.mockResolvedValue(adminSession as any);
    prismaMock.event.create.mockResolvedValue({ id: 'event-1' } as any);
  });

  it('rejects an end date that is not after the start date', async () => {
    await expect(createEvent({ ...validEventData, endDate: validEventData.date })).rejects.toThrow(
      'La fecha de finalización debe ser posterior a la fecha de inicio',
    );
    await expect(
      createEvent({ ...validEventData, endDate: '2026-08-15T17:00:00.000Z' }),
    ).rejects.toThrow('La fecha de finalización debe ser posterior');
    expect(prismaMock.event.create).not.toHaveBeenCalled();
  });

  it('credits flyer designers once per event, keeping only real users and only with a flyer', async () => {
    prismaMock.user.findMany.mockResolvedValue([{ id: 'u1' }] as any);
    const flyerDesigners = [
      { userId: 'u1', name: 'Ana' },
      { userId: 'u1', name: 'Ana' },
      { userId: 'ghost', name: 'Fantasma' },
      { name: 'Beto' },
      { name: 'beto' },
    ];
    await expect(
      createEvent({ ...validEventData, flyerImages: ['/a.png', '/b.png'], flyerDesigners }),
    ).rejects.toThrow('NEXT_REDIRECT');
    await expect(
      createEvent({ ...validEventData, flyerImages: [], flyerDesigners }),
    ).rejects.toThrow('NEXT_REDIRECT');

    const [[withFlyer], [withoutFlyer]] = prismaMock.event.create.mock.calls as any;
    expect(withFlyer.data.flyerDesigners.create).toEqual([
      { userId: 'u1', name: 'Ana' },
      { userId: null, name: 'Fantasma' },
      { userId: null, name: 'Beto' },
    ]);
    expect(withoutFlyer.data.flyerDesigners.create).toEqual([]);
  });

  it('stores a later end date, skips blank sponsors and nulls empty sponsor websites', async () => {
    await expect(
      createEvent({
        ...validEventData,
        endDate: '2026-08-15T20:00:00.000Z',
        sponsors: [
          { name: 'Acme', website: 'https://acme.dev', logo: '/acme.webp' },
          { name: 'Sin web', website: '' },
          { name: '   ' },
        ],
      }),
    ).rejects.toThrow('NEXT_REDIRECT');

    const { data } = prismaMock.event.create.mock.calls[0][0] as any;
    expect(data.endDate).toEqual(new Date('2026-08-15T20:00:00.000Z'));
    expect(data.sponsors.create).toEqual([
      { name: 'Acme', website: 'https://acme.dev', logo: '/acme.webp' },
      { name: 'Sin web', website: null, logo: null },
    ]);
    expect(data.googleMapsUrl).toBeNull();
    expect(data.capacity).toBeNull();
  });

  it('notifies every other user about a future event, and nobody about a past one', async () => {
    mockCookies({ sessionId: 'session-admin' });
    prismaMock.session.findUnique.mockResolvedValue(adminSession as any);
    prismaMock.event.create.mockResolvedValue({ id: 'event-5', name: 'Meetup' } as any);
    prismaMock.user.findMany.mockResolvedValue([{ id: adminUser.id }, { id: 'u2' }] as any);
    const date = new Date(Date.now() + 7 * 86_400_000).toISOString();

    await expect(createEvent({ ...validEventData, date })).rejects.toThrow('NEXT_REDIRECT');

    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: { suspendedAt: null, deactivatedAt: null },
      select: { id: true },
    });
    expect(prismaMock.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          type: 'event_created',
          userId: 'u2',
          message: expect.stringContaining('"Meetup"'),
          metadata: JSON.stringify({ eventId: 'event-5', href: '/eventos/event-5' }),
        }),
      ],
    });

    prismaMock.notification.createMany.mockClear();
    await expect(createEvent(validEventData)).rejects.toThrow('NEXT_REDIRECT');
    expect(prismaMock.notification.createMany).not.toHaveBeenCalled();
  });

  it('emails every other verified user about a future event, and nobody about a past one', async () => {
    mockCookies({ sessionId: 'session-admin' });
    prismaMock.session.findUnique.mockResolvedValue(adminSession as any);
    prismaMock.event.create.mockResolvedValue({
      id: 'event-5',
      name: 'Meetup',
      isOnline: false,
      placeName: 'GCBA HQ',
      address: 'Diagonal Norte 1234',
      city: 'Buenos Aires',
    } as any);
    prismaMock.user.findMany.mockResolvedValue([
      { name: 'Ana López', email: 'ana@example.com' },
      { name: 'Beto <b>', email: 'beto@example.com' },
    ] as any);
    const date = new Date(Date.now() + 7 * 86_400_000).toISOString();

    await expect(createEvent({ ...validEventData, date })).rejects.toThrow('NEXT_REDIRECT');

    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: {
        suspendedAt: null,
        deactivatedAt: null,
        emailVerified: true,
        id: { not: adminUser.id },
      },
      select: { name: true, email: true },
    });
    const messages = jest.mocked(sendEmails).mock.calls[0][0];
    expect(messages.map((message) => message.to)).toEqual(['ana@example.com', 'beto@example.com']);
    expect(messages[0].subject).toBe('Nuevo evento: Meetup');
    expect(messages[0].html).toContain('Ana');
    expect(messages[0].html).toContain('GCBA HQ, Diagonal Norte 1234, Buenos Aires');
    expect(messages[1].html).toContain('Beto');
    expect(messages[1].html).not.toContain('<b>');

    jest.mocked(sendEmails).mockClear();
    await expect(createEvent(validEventData)).rejects.toThrow('NEXT_REDIRECT');
    expect(sendEmails).not.toHaveBeenCalled();
  });

  it('still creates the event and notifies in the app when the emails cannot go out', async () => {
    mockCookies({ sessionId: 'session-admin' });
    prismaMock.session.findUnique.mockResolvedValue(adminSession as any);
    prismaMock.event.create.mockResolvedValue({ id: 'event-5', name: 'Meetup' } as any);
    prismaMock.user.findMany.mockResolvedValue([
      { id: 'u2', name: 'Ana', email: 'ana@example.com' },
    ] as any);
    jest.mocked(sendEmails).mockRejectedValueOnce(new Error('Resend: daily_quota_exceeded'));
    const date = new Date(Date.now() + 7 * 86_400_000).toISOString();

    await expect(createEvent({ ...validEventData, date })).rejects.toThrow('NEXT_REDIRECT');

    expect(sendEmails).toHaveBeenCalled();
    expect(prismaMock.notification.createMany).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith('/eventos/event-5');
  });
});
