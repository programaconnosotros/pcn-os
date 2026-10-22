import { z } from 'zod';
import { RateLimitError } from '@/lib/rate-limit';
import { ToolInputError, redactSecrets, toolErrorFrom, toolJson } from './output';

describe('redactSecrets', () => {
  it('drops credential fields at any depth and keeps the rest', () => {
    const value = {
      id: 'u1',
      password: 'hash',
      user: { name: 'Ana', twoFactorSecret: 'x', nested: [{ p256dh: 'k', ok: true }] },
      when: new Date('2026-01-01T00:00:00.000Z'),
    };
    expect(redactSecrets(value)).toEqual({
      id: 'u1',
      user: { name: 'Ana', nested: [{ ok: true }] },
      when: '2026-01-01T00:00:00.000Z',
    });
  });

  it('stops at a safe depth', () => {
    let deep: Record<string, unknown> = { leaf: true };
    for (let i = 0; i < 20; i++) deep = { deep };
    expect(JSON.stringify(redactSecrets(deep))).toContain('[…]');
  });
});

describe('toolJson', () => {
  it('cuts a big list by items and keeps it valid JSON', () => {
    const items = Array.from({ length: 50 }, (_, i) => ({ i, text: 'x'.repeat(10_000) }));
    const text = toolJson({ total: 50, offset: 0, count: 50, hasMore: false, items }).content[0]
      .text;
    expect(text.length).toBeLessThanOrEqual(200_000);
    const parsed = JSON.parse(text);
    expect(parsed).toMatchObject({ total: 50, hasMore: true });
    expect(parsed.items.length).toBeLessThan(50);
    expect(parsed.truncated).toContain('limit');
  });

  it('refuses anything else that is too big', () => {
    const result = toolJson({ big: 'x'.repeat(300_000) });
    expect(result.isError).toBe(true);
  });
});

describe('toolErrorFrom', () => {
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));

  it('shows the messages written for people', () => {
    expect(toolErrorFrom(new Error('Evento no encontrado'), 't').content[0].text).toBe(
      'Evento no encontrado',
    );
    expect(toolErrorFrom(new ToolInputError('Falta el título'), 't').content[0].text).toBe(
      'Falta el título',
    );
  });

  it('lists validation issues', () => {
    const error = z.object({ name: z.string() }).safeParse({}).error!;
    expect(toolErrorFrom(error, 't').content[0].text).toMatch(/^Datos inválidos\. name:/);
  });

  it('explains rate limits', () => {
    const text = toolErrorFrom(new RateLimitError('createContent', 60), 't').content[0].text;
    expect(text).toContain('1 minuto');
  });

  it.each([
    new Error('Invalid `prisma.event.create()` invocation:\n\nUnique constraint failed'),
    new Error('SELECT * FROM "User" failed'),
    new TypeError('Cannot read properties of undefined'),
    'a string',
  ])('hides internals of %s', (error) => {
    const result = toolErrorFrom(error, 't');
    expect(result).toEqual({
      content: [
        { type: 'text', text: 'Error interno del servidor. Quedó registrado en los logs.' },
      ],
      isError: true,
    });
  });
});
