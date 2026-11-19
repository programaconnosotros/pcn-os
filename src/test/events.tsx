// Fixtures for the event component tests.
import type { Event } from '@/generated/prisma/browser';

// Queries leave out discountCode unless they ask for it (src/lib/prisma.ts).
export type EventWithCounts = Omit<Event, 'discountCode'> & {
  _count: { registrations: number; talks: number; galleryItems: number };
};

export const buildEvent = (overrides: Partial<EventWithCounts> = {}): EventWithCounts => ({
  id: 'e1',
  date: new Date('2030-05-10T22:00:00.000Z'),
  endDate: null,
  name: 'Meetup PCN',
  description: 'Una juntada para programar',
  city: 'Córdoba',
  address: 'Av. Siempre Viva 742',
  placeName: 'Bar XYZ',
  flyerImages: [],
  googleMapsUrl: null,
  capacity: null,
  externalRegistrationUrl: null,
  markedAsFull: false,
  callForSpeakersEnabled: false,
  isOnline: false,
  streamingUrl: null,
  shortcut: null,
  coverPhotoId: null,
  coverFocusX: 50,
  coverFocusY: 50,
  coverZoom: 100,
  deletedAt: null,
  createdById: null,
  createdAt: new Date('2030-01-01T00:00:00.000Z'),
  updatedAt: new Date('2030-01-01T00:00:00.000Z'),
  _count: { registrations: 0, talks: 0, galleryItems: 0 },
  ...overrides,
});
