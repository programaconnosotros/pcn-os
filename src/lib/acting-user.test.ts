import type { SessionWithUser } from '@/lib/session';
import { actingSession, runAsUser } from './acting-user';

const session = { id: 'mcp:t1', userId: 'u1', user: { id: 'u1' } } as unknown as SessionWithUser;

describe('runAsUser', () => {
  it('sets the session only while the call runs', async () => {
    expect(actingSession()).toBeNull();
    await runAsUser(session, async () => {
      await Promise.resolve();
      expect(actingSession()).toBe(session);
    });
    expect(actingSession()).toBeNull();
  });

  it('does not leak into work that outlives the call', async () => {
    let pending: Promise<SessionWithUser | null> | undefined;
    await runAsUser(session, async () => {
      // A timer created during the call keeps its async context after the call returns.
      pending = new Promise((resolve) => setTimeout(() => resolve(actingSession()), 20));
    });
    expect(await pending).toBeNull();
  });

  it('clears the session when the call throws', async () => {
    await expect(
      runAsUser(session, async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(actingSession()).toBeNull();
  });

  it('keeps concurrent calls apart', async () => {
    const other = { ...session, id: 'mcp:t2' } as SessionWithUser;
    const seen = await Promise.all([
      runAsUser(session, async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return actingSession()?.id;
      }),
      runAsUser(other, async () => actingSession()?.id),
    ]);
    expect(seen).toEqual(['mcp:t1', 'mcp:t2']);
  });
});
