import { z } from 'zod';

/** `limit` and `offset` of every list tool. */
export const page = {
  limit: z.number().int().min(1).max(100).default(25).describe('Cuántos resultados (máximo 100).'),
  offset: z.number().int().min(0).max(10_000).default(0).describe('Cuántos saltear, para paginar.'),
};

export const pageArgs = ({ limit, offset }: { limit: number; offset: number }) => ({
  take: limit,
  skip: offset,
});

/** A list result that says whether there's more to ask for. */
export const listResult = <T>(items: T[], total: number, offset: number) => ({
  total,
  offset,
  count: items.length,
  hasMore: offset + items.length < total,
  items,
});

/** Common text filter: trimmed, bounded. */
export const searchText = z.string().trim().min(1).max(200);

export const idArg = z.string().trim().min(1).max(100);
