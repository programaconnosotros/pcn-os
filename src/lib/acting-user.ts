import { AsyncLocalStorage } from 'node:async_hooks';
import type { SessionWithUser } from '@/lib/session';

// The session of whoever is acting outside a browser request: an admin calling a tool of the MCP
// server (src/lib/mcp) with an OAuth token instead of a cookie. `getCurrentSession()` and the
// rate limits read it first, so a tool can call the same server actions the UI calls and they
// check permissions, validate and notify exactly as they do for the site.
//
// The store is a holder that `runAsUser` empties when the call ends: anything long-lived created
// during a tool call (a connection, a timer) keeps this async context forever, and must not keep
// acting as the admin after the tool is done.
type Holder = { session: SessionWithUser | null };
const acting = new AsyncLocalStorage<Holder>();

/** Runs `fn` with `session` as the current session of every server action it calls. */
export const runAsUser = async <T>(session: SessionWithUser, fn: () => Promise<T>) => {
  const holder: Holder = { session };
  try {
    return await acting.run(holder, fn);
  } finally {
    holder.session = null;
  }
};

/** The session set by `runAsUser` while its call runs, or null (a normal request). */
export const actingSession = () => acting.getStore()?.session ?? null;
