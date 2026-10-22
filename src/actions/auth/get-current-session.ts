import { cookies } from 'next/headers';
import { actingSession } from '@/lib/acting-user';
import { findSession } from '@/lib/session';

export const getCurrentSession = async () => {
  // A tool of the MCP server running as the admin its OAuth token belongs to (src/lib/mcp).
  const acting = actingSession();
  if (acting) return acting;

  const sessionId = (await cookies()).get('sessionId')?.value;

  if (!sessionId) return null;

  return findSession(sessionId);
};
