import { clientIpFrom } from '@/lib/client-ip';
import { RATE_LIMITS, consumeRateLimit, type RateLimitName } from '@/lib/rate-limit';

/**
 * Counts a request against an OAuth/MCP rate limit for the caller's IP. Returns the IP (for the
 * audit log) and how many seconds to wait (0 if allowed).
 */
export const limitByIp = (request: Request, name: RateLimitName) => {
  const ip = clientIpFrom(request.headers);
  const wait = consumeRateLimit(`${name}:ip:${ip ?? 'unknown'}`, RATE_LIMITS[name]);
  return { ip, wait };
};
