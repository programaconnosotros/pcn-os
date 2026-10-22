import { corsPreflight } from './responses';

describe('corsPreflight', () => {
  it('is never cached, like every other OAuth response', () => {
    const response = corsPreflight();
    expect(response.status).toBe(204);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
  });
});
