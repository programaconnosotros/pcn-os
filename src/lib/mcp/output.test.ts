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
  it('cuts results that are too big', () => {
    const text = toolJson({ big: 'x'.repeat(300_000) }).content[0].text;
    expect(text.length).toBeLessThan(201_000);
    expect(text).toContain('resultado cortado');
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
