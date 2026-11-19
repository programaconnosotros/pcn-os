import { eventSchema } from './event-schema';

const baseEvent = {
  name: 'Café Virtual',
  description: 'Charla sobre tecnología.',
  date: '2026-10-02T20:00:00.000Z',
  isOnline: true,
  streamingUrl: 'https://meet.google.com/jmg-uaxv-vmt',
};

describe('eventSchema shortcut', () => {
  it('accepts the already-parsed client output when no shortcut was entered', () => {
    const clientOutput = eventSchema.parse({ ...baseEvent, shortcut: '' });

    expect(clientOutput.shortcut).toBeUndefined();
    expect(() => eventSchema.parse(clientOutput)).not.toThrow();
  });

  it('normalizes a provided shortcut', () => {
    expect(eventSchema.parse({ ...baseEvent, shortcut: ' CoWork ' }).shortcut).toBe('cowork');
  });
});

const inPerson = {
  name: 'PCN Meetup',
  description: 'Un meetup presencial de la comunidad.',
  date: '2026-10-02T20:00:00.000Z',
  city: 'Tucumán',
  placeName: 'Cowork',
  address: 'Av. Siempre Viva 742',
};

const messages = (input: unknown) =>
  eventSchema.safeParse(input).error?.issues.map((issue) => issue.message) ?? [];

describe('eventSchema', () => {
  it('accepts an in-person event and fills the defaults', () => {
    const event = eventSchema.parse(inPerson);
    expect(event).toMatchObject({
      isOnline: false,
      markedAsFull: false,
      callForSpeakersEnabled: false,
      flyerImages: [],
      sponsors: [],
    });
    expect(event.capacity).toBeUndefined();
    expect(event.endDate).toBeUndefined();
  });

  it('requires city, place and address for an in-person event', () => {
    expect(messages({ ...inPerson, city: '', placeName: 'A', address: 'Av' })).toEqual([
      'La ciudad debe tener al menos 2 caracteres',
      'El nombre del lugar debe tener al menos 2 caracteres',
      'La dirección debe tener al menos 5 caracteres',
    ]);
  });

  it('does not require a place for an online event', () => {
    expect(eventSchema.safeParse(baseEvent).success).toBe(true);
  });

  it('rejects a short name, a short description and a missing date', () => {
    expect(messages({ ...inPerson, name: 'ab', description: 'corta', date: '' })).toEqual([
      'El nombre debe tener al menos 3 caracteres',
      'La descripción debe tener al menos 10 caracteres',
      'La fecha es requerida',
    ]);
  });

  it('accepts flyers that are site paths or URLs only', () => {
    expect(
      eventSchema.parse({ ...inPerson, flyerImages: ['/f.jpg', 'https://x.com/f.jpg'] })
        .flyerImages,
    ).toHaveLength(2);
    expect(messages({ ...inPerson, flyerImages: ['f.jpg'] })).toEqual([
      'La imagen del flyer no es válida',
    ]);
  });

  it('accepts sponsor logos from the site or https only', () => {
    const logo = (value: string) =>
      eventSchema.safeParse({ ...inPerson, sponsors: [{ name: 'ACME', logo: value }] }).success;
    expect(logo('/dizenz-logo.webp')).toBe(true);
    expect(logo('https://cdn.acme.dev/logo.png')).toBe(true);
    expect(logo('javascript:alert(1)')).toBe(false);
    expect(logo('http://acme.dev/logo.png')).toBe(false);
  });

  it('validates sponsors and drops an empty website', () => {
    expect(
      eventSchema.parse({ ...inPerson, sponsors: [{ name: 'ACME', website: '' }] }).sponsors,
    ).toEqual([{ name: 'ACME', website: undefined }]);
    expect(messages({ ...inPerson, sponsors: [{ name: '', website: 'nope' }] })).toEqual([
      'El nombre del sponsor es requerido',
      'Debe ser una URL válida',
    ]);
  });

  it('validates the registration and streaming URLs, treating empty as none', () => {
    const event = eventSchema.parse({ ...inPerson, externalRegistrationUrl: '', streamingUrl: '' });
    expect(event.externalRegistrationUrl).toBeUndefined();
    expect(event.streamingUrl).toBeUndefined();
    expect(messages({ ...inPerson, externalRegistrationUrl: 'x', streamingUrl: 'y' })).toEqual([
      'Debe ser una URL válida',
      'Debe ser una URL válida',
    ]);
  });

  it('trims the discount code and treats empty as none', () => {
    expect(eventSchema.parse({ ...inPerson, discountCode: '  PCN20 ' }).discountCode).toBe('PCN20');
    expect(eventSchema.parse({ ...inPerson, discountCode: '   ' }).discountCode).toBeUndefined();
    expect(messages({ ...inPerson, discountCode: 'x'.repeat(101) })).toEqual([
      'El código no puede exceder 100 caracteres',
    ]);
  });

  it('accepts Google Maps links only', () => {
    expect(
      eventSchema.parse({ ...inPerson, googleMapsUrl: ' https://maps.app.goo.gl/abc ' })
        .googleMapsUrl,
    ).toBe('https://maps.app.goo.gl/abc');
    expect(eventSchema.parse({ ...inPerson, googleMapsUrl: '  ' }).googleMapsUrl).toBeUndefined();
    expect(messages({ ...inPerson, googleMapsUrl: 'https://example.com' })).toEqual([
      'Pegá un link de Google Maps (google.com/maps o maps.app.goo.gl)',
    ]);
  });

  it('parses the capacity from a string or a number', () => {
    expect(eventSchema.parse({ ...inPerson, capacity: '30' }).capacity).toBe(30);
    expect(eventSchema.parse({ ...inPerson, capacity: 15 }).capacity).toBe(15);
    expect(eventSchema.parse({ ...inPerson, capacity: null }).capacity).toBeUndefined();
    expect(eventSchema.parse({ ...inPerson, capacity: '' }).capacity).toBeUndefined();
  });

  it.each([['0'], ['-3'], ['abc'], [0]])('rejects the capacity %p', (capacity) => {
    expect(messages({ ...inPerson, capacity })).toEqual(['El cupo debe ser un número mayor a 0']);
  });

  it('rejects a shortcut with spaces or symbols', () => {
    expect(messages({ ...inPerson, shortcut: 'mi evento!' })).toEqual([
      'Solo minúsculas, números y guiones (sin espacios)',
    ]);
  });

  it('keeps the end date and treats null flags as false', () => {
    const event = eventSchema.parse({
      ...inPerson,
      endDate: '2026-10-02T23:00:00.000Z',
      isOnline: null,
      markedAsFull: true,
      callForSpeakersEnabled: null,
    });
    expect(event).toMatchObject({
      endDate: '2026-10-02T23:00:00.000Z',
      isOnline: false,
      markedAsFull: true,
      callForSpeakersEnabled: false,
    });
  });
});

describe('eventSchema dates', () => {
  it.each([
    ['before', '2026-05-01T18:00'],
    ['equal to', '2026-05-01T19:00'],
  ])('rejects an end date %s the start, on the endDate field', (_case, endDate) => {
    const result = eventSchema.safeParse({ ...baseEvent, date: '2026-05-01T19:00', endDate });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toContainEqual(
      expect.objectContaining({
        path: ['endDate'],
        message: 'La fecha de finalización debe ser posterior a la fecha de inicio',
      }),
    );
  });

  it('accepts an end date after the start, or none', () => {
    expect(
      eventSchema.safeParse({ ...baseEvent, date: '2026-05-01T19:00', endDate: '2026-05-01T22:00' })
        .success,
    ).toBe(true);
    expect(
      eventSchema.safeParse({ ...baseEvent, date: '2026-05-01T19:00', endDate: '' }).success,
    ).toBe(true);
  });
});
