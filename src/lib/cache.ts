import { AsyncLocalStorage } from 'node:async_hooks';
import { cache } from 'react';
import { revalidateTag, unstable_cache } from 'next/cache';
import type { ModelName } from '@/lib/prisma-models';

// Shared data cache for reads that are the same for everyone (listings, events, profiles), so
// most page views don't touch Postgres. Each entry is tagged with the tables it reads, and
// every Prisma write expires the tags of the tables it touched (see src/lib/prisma.ts), so data
// shows up fresh right after it changes while staying cached for a day otherwise.
//
// The cache lives in the server's memory and in .next/cache: fine with one app container. With
// several, add a shared cacheHandler (e.g. Redis) or each one keeps serving its own copy.

const DAY = 86_400;
// Next drops data cache entries over 2MB (with a warning that doesn't say which read it was).
const MAX_ENTRY_BYTES = 2 * 1024 * 1024;

export const modelTag = (model: ModelName) => `db:${model}`;

/**
 * Tables no cached read uses: tracking, logs, sessions and tokens. Writing to them expires
 * nothing, which matters because expiring a tag from a server action also makes the browser
 * refetch the page (a page view is tracked by one).
 */
const UNCACHED_MODELS = new Set<ModelName>([
  'PageVisit',
  'Session',
  'AppLog',
  'ErrorLog',
  'Notification',
  'PasswordResetToken',
  'EmailVerificationToken',
  // OAuth secrets for the MCP server (hashes, but still credentials): never in a shared cache.
  'OAuthClient',
  'OAuthAuthorizationCode',
  'OAuthToken',
]);

// unstable_cache stores JSON, which turns Dates into strings: tag them on the way in and bring
// them back on the way out, so a cached function returns exactly what the uncached one did.
const DATE_KEY = '$date';

function encode(this: Record<string, unknown>, key: string, value: unknown) {
  const raw = this[key];
  return raw instanceof Date ? { [DATE_KEY]: raw.toISOString() } : value;
}

const decode = (_key: string, value: unknown) =>
  value && typeof value === 'object' && DATE_KEY in value
    ? new Date((value as Record<string, string>)[DATE_KEY])
    : value;

type Tracking = { name: string; models: ReadonlySet<ModelName>; warned: Set<string> };
const tracking = new AsyncLocalStorage<Tracking>();

/**
 * Warns in development when a cached function reads a table it didn't declare: a write to that
 * table wouldn't expire the entry, so the page would keep showing old data.
 */
export const checkCachedRead = (read: Iterable<ModelName>) => {
  const store = tracking.getStore();
  if (!store) return;
  for (const model of read) {
    if (store.models.has(model) || store.warned.has(model)) continue;
    store.warned.add(model);
    console.warn(`[cache] ${store.name} reads ${model} but isn't tagged with it`);
  }
};

type Options = {
  /** Every table the function reads, through includes and relation filters too. */
  models: readonly ModelName[];
  /** Seconds before an entry is recomputed even if nothing was written. Defaults to a day. */
  revalidate?: number;
};

/**
 * Caches an async read across requests, keyed by `name` and its arguments (which must be
 * JSON-serializable). Also deduped within a request, like React's `cache`.
 */
export const cached = <Args extends unknown[], Result>(
  name: string,
  fn: (..._args: Args) => Promise<Result>,
  { models, revalidate = DAY }: Options,
) => {
  const uncached = models.filter((model) => UNCACHED_MODELS.has(model));
  if (uncached.length) throw new Error(`${name} can't cache ${uncached.join(', ')}`);
  const declared = new Set(models);
  const stored = unstable_cache(
    async (...args: Args) => {
      const run = () => fn(...args);
      const result =
        process.env.NODE_ENV === 'production'
          ? await run()
          : await tracking.run({ name, models: declared, warned: new Set() }, run);
      const json = JSON.stringify(result, encode);
      if (json.length > MAX_ENTRY_BYTES)
        console.warn(
          `[cache] ${name} is ${json.length} bytes: Next doesn't cache entries over 2MB`,
        );
      return json;
    },
    [name],
    { tags: models.map(modelTag), revalidate },
  );
  return cache(async (...args: Args): Promise<Result> => JSON.parse(await stored(...args), decode));
};

/**
 * Expires the cached reads of these tables. Called by the Prisma client after every write; a
 * write outside a request (a script, the seed) has no cache to expire, and one made while
 * rendering can't expire tags, which Next reports and we only log.
 */
export const expireModels = (models: Iterable<ModelName>) => {
  for (const model of models) {
    if (UNCACHED_MODELS.has(model)) continue;
    try {
      revalidateTag(modelTag(model), { expire: 0 });
    } catch (error) {
      if (error instanceof Error && error.message.includes('static generation store missing'))
        return;
      console.warn(`[cache] couldn't expire ${model}:`, error);
    }
  }
};
