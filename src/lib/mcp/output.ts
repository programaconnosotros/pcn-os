import { ZodError } from 'zod';
import { RateLimitError } from '@/lib/rate-limit';
import { getRateLimitMessage } from '@/lib/rate-limit-messages';

/**
 * Fields that hold credentials somewhere in the schema. The tools select their fields one by one
 * and never ask for these; this list is the last line of defense, applied to every result, and
 * what the secret-canary test checks (src/lib/mcp/mcp.db.test.ts).
 */
export const SECRET_KEYS = new Set([
  'password',
  'twoFactorSecret',
  'twoFactorRecoveryCodes',
  'twoFactorLastStep',
  'accessTokenHash',
  'refreshTokenHash',
  'codeChallenge',
  'p256dh',
  'storageKeys',
]);

const MAX_DEPTH = 12;

/** A copy of `value` without any `SECRET_KEYS`, at any depth. Dates become ISO strings. */
export const redactSecrets = (value: unknown, depth = 0): unknown => {
  if (depth > MAX_DEPTH) return '[…]';
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => redactSecrets(item, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !SECRET_KEYS.has(key))
        .map(([key, item]) => [key, redactSecrets(item, depth + 1)]),
    );
  }
  return value;
};

/** Results bigger than this are cut: a tool that returns too much should be paginated. */
const MAX_RESULT_CHARS = 200_000;

export type ToolResult = {
  content: { type: 'text'; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

const serialize = (data: unknown) => JSON.stringify(data, null, 2);

/**
 * A tool's result as JSON text, scrubbed of secrets. A list too big to send is cut by items (it
 * stays valid JSON and says so); anything else too big is an error asking for less.
 */
export const toolJson = (data: unknown): ToolResult => {
  const safe = redactSecrets(data);
  let text = serialize(safe);
  if (text.length <= MAX_RESULT_CHARS) return { content: [{ type: 'text', text }] };

  const list = safe as { items?: unknown[] } | null;
  if (list && typeof list === 'object' && Array.isArray(list.items)) {
    let items = list.items;
    while (items.length > 0) {
      items = items.slice(0, Math.floor(items.length / 2));
      text = serialize({
        ...list,
        items,
        count: items.length,
        hasMore: true,
        truncated: 'Resultado recortado por tamaño: pedí menos con limit/offset.',
      });
      if (text.length <= MAX_RESULT_CHARS) return { content: [{ type: 'text', text }] };
    }
  }
  return toolError('El resultado es demasiado grande. Pedí menos resultados (limit) o filtrá más.');
};

export const toolError = (message: string): ToolResult => ({
  content: [{ type: 'text', text: message }],
  isError: true,
});

/** An error a tool can show as it is: written by us for people, with no internals in it. */
export class ToolInputError extends Error {}

// Messages the site's own actions throw for people ("Evento no encontrado", "No tienes permisos
// para…"). Anything else (Prisma, a bug) could carry internals: the caller gets a generic message
// and the details go to the server log.
const looksLikeUserMessage = (message: string) =>
  message.length > 0 &&
  message.length <= 200 &&
  !/[\n{}[\]<>`]|prisma|invocation|SELECT |at \w+ \(/i.test(message);

/** Turns whatever a tool threw into a message that is safe to send to the client. */
export const toolErrorFrom = (error: unknown, toolName: string): ToolResult => {
  if (error instanceof ZodError) {
    const issues = error.issues
      .slice(0, 10)
      .map((issue) => `${issue.path.join('.') || 'entrada'}: ${issue.message}`);
    return toolError(`Datos inválidos. ${issues.join('; ')}`);
  }
  if (error instanceof RateLimitError)
    return toolError(getRateLimitMessage(error) ?? 'Demasiados pedidos seguidos.');
  if (error instanceof ToolInputError) return toolError(error.message);
  if (
    error instanceof Error &&
    error.constructor === Error &&
    looksLikeUserMessage(error.message)
  ) {
    return toolError(error.message);
  }
  console.error(`MCP tool ${toolName} failed:`, error);
  return toolError('Error interno del servidor. Quedó registrado en los logs.');
};
