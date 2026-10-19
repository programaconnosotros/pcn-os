import { AsyncLocalStorage } from 'node:async_hooks';
import type { SessionWithUser } from '@/lib/session';

// The session of whoever is acting outside a browser request: an admin calling a tool of the MCP
// server (src/lib/mcp) with an OAuth token instead of a cookie. `getCurrentSession()` and the
// rate limits read it first, so a tool can call the same server actions the UI calls and they
// check permissions, validate and notify exactly as they do for the site.
const acting = new AsyncLocalStorage<SessionWithUser>();

/** Runs `fn` with `session` as the current session of every server action it calls. */
export const runAsUser = <T>(session: SessionWithUser, fn: () => Promise<T>) =>
  acting.run(session, fn);

/** The session set by `runAsUser`, or null in a normal request. */
export const actingSession = () => acting.getStore() ?? null;
