import prisma from '@/lib/prisma';
import { createEvent } from '@/actions/events/create-event';
import { updateEvent } from '@/actions/events/update-event';
import { deleteEvent } from '@/actions/events/delete-event';
import { fetchEvent } from '@/actions/events/fetch-event';
import { fetchEvents } from '@/actions/events/fetch-events';
import { fetchEventForEdit } from '@/actions/events/fetch-event-for-edit';
import { fetchUpcomingEvents } from '@/actions/events/fetch-upcoming-events';
import { fetchHomeEvents } from '@/actions/events/fetch-home-events';
import { addEventOrganizer, removeEventOrganizer } from '@/actions/events/organizer-actions';
import { getEventRegistrations } from '@/actions/events/get-event-registrations';
import { canManageEventById, canManageSomeEvent, getEventManager } from '@/lib/event-access';
import type { EventFormData } from '@/schemas/event-schema';
import { actAs } from '@/test/db/fixtures';
import {
  createAdmin,
  createAmbassador,
  createOrganizer,
  createTestEvent,
  createUser,
  daysFromNow,
  uniqueId,
} from '@/test/db/content-fixtures';

// Alta, edición, baja lógica y permisos de eventos contra Postgres real.

const form = (overrides: Partial<EventFormData> = {}): EventFormData => ({
  name: `Meetup ${uniqueId()}`,
  description: 'Una juntada para programar con la comunidad',
  date: daysFromNow(20).toISOString(),
  city: 'Ciudad',
  address: 'Calle Falsa 123',
  placeName: 'Un bar',
  ...overrides,
});

/** createEvent termina con un redirect al evento: devuelve el id de esa URL. */
const createdEventId = async (data: EventFormData) => {
  const error = await createEvent(data).then(
    () => null,
    (e: Error) => e,
  );
  const match = error?.message.match(/^NEXT_REDIRECT:\/eventos\/(\w+)$/);
  if (!match) throw error ?? new Error('createEvent no redirigió');
  return match[1];
};

describe('createEvent', () => {
  it('lets an ambassador create an event, as its creator and first organizer', async () => {
    const ambassador = await createAmbassador();
    await actAs(ambassador.id);

    const id = await createdEventId(
      form({
        capacity: '25',
        sponsors: [
          { name: 'Sponsor', website: 'https://sponsor.test' },
          { name: '   ', website: '' },
        ],
      }),
    );

    const event = await prisma.event.findUniqueOrThrow({
      where: { id },
      include: { organizers: true, sponsors: true },
    });
    expect(event).toMatchObject({ createdById: ambassador.id, capacity: 25, endDate: null });
    expect(event.organizers.map((o) => o.userId)).toEqual([ambassador.id]);
    expect(event.sponsors.map((s) => [s.name, s.website])).toEqual([
      ['Sponsor', 'https://sponsor.test'],
    ]);
  });

  it('lets admins create online events without a place', async () => {
    const admin = await createAdmin();
    await actAs(admin.id);

    const id = await createdEventId(
      form({
        isOnline: true,
        city: '',
        address: '',
        placeName: '',
        streamingUrl: 'https://yt.test/x',
      }),
    );

    expect(await prisma.event.findUniqueOrThrow({ where: { id } })).toMatchObject({
      isOnline: true,
      city: null,
      capacity: null,
    });
  });

  it('rejects regular users and anonymous visitors without creating anything', async () => {
    const user = await createUser();
    const name = `No debería existir ${uniqueId()}`;

    await actAs(user.id);
    await expect(createEvent(form({ name }))).rejects.toThrow('No tienes permisos');
    await actAs();
    await expect(createEvent(form({ name }))).rejects.toThrow('Usuario no autenticado');

    expect(await prisma.event.count({ where: { name } })).toBe(0);
  });

  it('rejects invalid data and an end date before the start', async () => {
    const admin = await createAdmin();
    await actAs(admin.id);
    const name = `Inválido ${uniqueId()}`;

    await expect(createEvent(form({ name, description: 'corta' }))).rejects.toThrow();
    await expect(createEvent(form({ name, capacity: '0' }))).rejects.toThrow();
    await expect(createEvent(form({ name, address: '' }))).rejects.toThrow();
    await expect(
      createEvent(
        form({ name, date: daysFromNow(5).toISOString(), endDate: daysFromNow(4).toISOString() }),
      ),
    ).rejects.toThrow('posterior a la fecha de inicio');

    expect(await prisma.event.count({ where: { name } })).toBe(0);
  });
});

describe('updateEvent', () => {
  it('lets an organizer edit the event and replaces its sponsors', async () => {
    const event = await createTestEvent();
    await prisma.sponsor.create({ data: { eventId: event.id, name: 'Viejo' } });
    const organizer = await createOrganizer(event.id);
    await actAs(organizer.id);

    await expect(
      updateEvent(
        event.id,
        form({
          name: 'Nombre nuevo',
          sponsors: [{ name: 'Nuevo', website: '' }],
          markedAsFull: true,
        }),
      ),
    ).rejects.toThrow(`NEXT_REDIRECT:/eventos/${event.id}`);

    const updated = await prisma.event.findUniqueOrThrow({
      where: { id: event.id },
      include: { sponsors: true },
    });
    expect(updated).toMatchObject({ name: 'Nombre nuevo', markedAsFull: true });
    expect(updated.sponsors.map((s) => [s.name, s.website])).toEqual([['Nuevo', null]]);
  });

  it('rejects users who do not manage the event, leaving it untouched', async () => {
    const event = await createTestEvent();
    const other = await createTestEvent();
    const [regular, foreignAmbassador, otherOrganizer] = [
      await createUser(),
      await createAmbassador(),
      await createOrganizer(other.id),
    ];

    for (const user of [regular, foreignAmbassador, otherOrganizer]) {
      await actAs(user.id);
      await expect(updateEvent(event.id, form({ name: 'Hackeado' }))).rejects.toThrow(
        'No tienes permisos',
      );
    }
    expect((await prisma.event.findUniqueOrThrow({ where: { id: event.id } })).name).toBe(
      event.name,
    );
  });

  it('does not let an organizer edit a soft-deleted event', async () => {
    const event = await createTestEvent({ deletedAt: new Date() });
    const organizer = await createOrganizer(event.id);
    await actAs(organizer.id);

    await expect(updateEvent(event.id, form())).rejects.toThrow('No tienes permisos');
  });

  it('reports a missing event', async () => {
    const admin = await createAdmin();
    await actAs(admin.id);
    await expect(updateEvent('no-existe', form())).rejects.toThrow('Evento no encontrado');
  });
});

describe('deleteEvent (soft delete)', () => {
  it('lets the ambassador who created it delete it, which hides it everywhere', async () => {
    const ambassador = await createAmbassador();
    const event = await createTestEvent({ createdById: ambassador.id });
    await actAs(ambassador.id);

    await expect(deleteEvent(event.id)).rejects.toThrow('NEXT_REDIRECT:/eventos');

    const row = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
    expect(row.deletedAt).not.toBeNull();
    expect(await fetchEvent(event.id)).toBeNull();
    expect((await fetchEvents()).map((e) => e.id)).not.toContain(event.id);
    expect((await fetchUpcomingEvents(1000)).map((e) => e.id)).not.toContain(event.id);
  });

  it('does not let a plain organizer or another ambassador delete it', async () => {
    const creator = await createAmbassador();
    const event = await createTestEvent({ createdById: creator.id });
    const organizer = await createOrganizer(event.id);
    const otherAmbassador = await createAmbassador();

    for (const user of [organizer, otherAmbassador]) {
      await actAs(user.id);
      await expect(deleteEvent(event.id)).rejects.toThrow('Solo puedes eliminar');
    }
    expect(
      (await prisma.event.findUniqueOrThrow({ where: { id: event.id } })).deletedAt,
    ).toBeNull();
  });

  it('lets admins delete any event, and rejects anonymous visitors', async () => {
    const event = await createTestEvent();
    await actAs();
    await expect(deleteEvent(event.id)).rejects.toThrow('Usuario no autenticado');

    const admin = await createAdmin();
    await actAs(admin.id);
    await expect(deleteEvent(event.id)).rejects.toThrow('NEXT_REDIRECT');
    expect(
      (await prisma.event.findUniqueOrThrow({ where: { id: event.id } })).deletedAt,
    ).not.toBeNull();
    await expect(deleteEvent('no-existe')).rejects.toThrow('Evento no encontrado');
  });
});

describe('reading events', () => {
  it('fetchEvent returns the event with its organizers and sponsors', async () => {
    const event = await createTestEvent();
    const organizer = await createOrganizer(event.id);
    await prisma.sponsor.create({ data: { eventId: event.id, name: 'Sponsor' } });

    const found = await fetchEvent(event.id);

    expect(found?.organizers.map((o) => o.user.id)).toEqual([organizer.id]);
    expect(found?.sponsors.map((s) => s.name)).toEqual(['Sponsor']);
    expect(found?.organizers[0].user).not.toHaveProperty('email');
  });

  it('fetchEvents counts only active registrations', async () => {
    const event = await createTestEvent();
    const [a, b] = [await createUser(), await createUser()];
    await prisma.eventRegistration.createMany({
      data: [
        { eventId: event.id, userId: a.id },
        { eventId: event.id, userId: b.id, cancelledAt: new Date() },
      ],
    });

    const listed = (await fetchEvents()).find((e) => e.id === event.id);
    expect(listed?._count.registrations).toBe(1);
  });

  it('fetchUpcomingEvents keeps future and still-running events, soonest first', async () => {
    const running = await createTestEvent({ date: daysFromNow(-1), endDate: daysFromNow(1) });
    const past = await createTestEvent({ date: daysFromNow(-3) });
    const soon = await createTestEvent({ date: daysFromNow(0.5) });

    const ids = (await fetchUpcomingEvents(1000)).map((e) => e.id);

    expect(ids).toEqual(expect.arrayContaining([running.id, soon.id]));
    expect(ids).not.toContain(past.id);
    expect(ids.indexOf(running.id)).toBeLessThan(ids.indexOf(soon.id));
  });

  it('fetchHomeEvents never shows deleted events', async () => {
    const deleted = await createTestEvent({ date: daysFromNow(0.01), deletedAt: new Date() });
    const { upcoming, past } = await fetchHomeEvents(50);
    expect([...upcoming, ...past].map((e) => e.id)).not.toContain(deleted.id);
  });

  it('fetchEventForEdit: admins see deleted events, organizers only live ones', async () => {
    const event = await createTestEvent({ deletedAt: new Date() });
    const organizer = await createOrganizer(event.id);
    const admin = await createAdmin();
    const regular = await createUser();

    await actAs(admin.id);
    expect((await fetchEventForEdit(event.id))?.id).toBe(event.id);
    await actAs(organizer.id);
    await expect(fetchEventForEdit(event.id)).rejects.toThrow('No autorizado');

    const live = await createTestEvent();
    await prisma.eventOrganizer.create({ data: { eventId: live.id, userId: organizer.id } });
    expect((await fetchEventForEdit(live.id))?.id).toBe(live.id);
    await actAs(regular.id);
    await expect(fetchEventForEdit(live.id)).rejects.toThrow('No autorizado');
    await actAs();
    await expect(fetchEventForEdit(live.id)).rejects.toThrow('No autorizado');
  });
  it('keeps the discount code out of public reads; only whoever edits the event sees it', async () => {
    const admin = await createAdmin();
    await actAs(admin.id);
    const id = await createdEventId(
      form({ externalRegistrationUrl: 'https://lu.ma/pcn', discountCode: 'PCN20' }),
    );

    expect(await fetchEvent(id)).not.toHaveProperty('discountCode');
    const listed = (await fetchEvents()).find((e) => e.id === id);
    expect(listed).toBeDefined();
    expect(listed).not.toHaveProperty('discountCode');
    expect((await fetchEventForEdit(id))?.discountCode).toBe('PCN20');
  });
});

describe('event organizers', () => {
  it('the creator adds an organizer, who can then manage the event, and removes them', async () => {
    const creator = await createAmbassador();
    const event = await createTestEvent({ createdById: creator.id });
    const helper = await createUser();

    await actAs(creator.id);
    await expect(addEventOrganizer(event.id, helper.id)).resolves.toEqual({ success: true });
    // Sumarlo dos veces no duplica la fila
    await addEventOrganizer(event.id, helper.id);
    expect(
      await prisma.eventOrganizer.count({ where: { eventId: event.id, userId: helper.id } }),
    ).toBe(1);

    await actAs(helper.id);
    await expect(getEventRegistrations(event.id)).resolves.toEqual([]);

    await actAs(creator.id);
    await removeEventOrganizer(event.id, helper.id);
    await actAs(helper.id);
    await expect(getEventRegistrations(event.id)).rejects.toThrow('No autorizado');
  });

  it('organizers that did not create the event cannot add or remove organizers', async () => {
    const creator = await createAmbassador();
    const event = await createTestEvent({ createdById: creator.id });
    const organizer = await createOrganizer(event.id);
    const outsider = await createUser();

    await actAs(organizer.id);
    await expect(addEventOrganizer(event.id, outsider.id)).rejects.toThrow('No autorizado');
    await expect(removeEventOrganizer(event.id, organizer.id)).rejects.toThrow('No autorizado');
    await actAs(outsider.id);
    await expect(addEventOrganizer(event.id, outsider.id)).rejects.toThrow('No autorizado');

    expect(await prisma.eventOrganizer.count({ where: { eventId: event.id } })).toBe(1);
  });

  it('reports missing events and users', async () => {
    const admin = await createAdmin();
    const event = await createTestEvent();
    await actAs(admin.id);

    await expect(addEventOrganizer('no-existe', admin.id)).rejects.toThrow('Evento no encontrado');
    await expect(addEventOrganizer(event.id, 'no-existe')).rejects.toThrow('Usuario no encontrado');
  });
});

describe('event-access', () => {
  it('canManageSomeEvent: admins, ambassadors and organizers of at least one event', async () => {
    const event = await createTestEvent();
    const [admin, ambassador, organizer, regular] = [
      await createAdmin(),
      await createAmbassador(),
      await createOrganizer(event.id),
      await createUser(),
    ];

    expect(await canManageSomeEvent(admin)).toBe(true);
    expect(await canManageSomeEvent(ambassador)).toBe(true);
    expect(await canManageSomeEvent(organizer)).toBe(true);
    expect(await canManageSomeEvent(regular)).toBe(false);
    expect(await canManageSomeEvent(null)).toBe(false);
  });

  it('canManageEventById follows creator, organizers and soft deletion', async () => {
    const ambassador = await createAmbassador();
    const event = await createTestEvent({ createdById: ambassador.id });
    const organizer = await createOrganizer(event.id);
    const admin = await createAdmin();

    expect(await canManageEventById(ambassador, event.id)).toBe(true);
    expect(await canManageEventById(organizer, event.id)).toBe(true);
    expect(await canManageEventById(organizer, null)).toBe(false);
    expect(await canManageEventById(admin, null)).toBe(true);
    expect(await canManageEventById(organizer, 'no-existe')).toBe(false);

    await prisma.event.update({ where: { id: event.id }, data: { deletedAt: new Date() } });
    expect(await canManageEventById(ambassador, event.id)).toBe(false);
    expect(await canManageEventById(organizer, event.id)).toBe(false);
    expect(await canManageEventById(admin, event.id)).toBe(true);
  });

  it('getEventManager returns the logged-in manager or null', async () => {
    const event = await createTestEvent();
    const organizer = await createOrganizer(event.id);
    const regular = await createUser();

    await actAs(organizer.id);
    expect((await getEventManager(event.id))?.id).toBe(organizer.id);
    await actAs(regular.id);
    expect(await getEventManager(event.id)).toBeNull();
    await actAs();
    expect(await getEventManager(event.id)).toBeNull();
  });
});
