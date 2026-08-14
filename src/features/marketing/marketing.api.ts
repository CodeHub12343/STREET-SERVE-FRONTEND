/**
 * Marketing-surface API calls — public, unauthenticated, and always failure-tolerant: the
 * landing page must render perfectly with the backend down (honesty rule: sections hide
 * rather than show broken/fake numbers).
 */
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';

/** GET /preregistrations/count → waitlist size, or null when unavailable. */
export async function fetchPreregistrationCount(): Promise<number | null> {
  try {
    const res = await api.get<{ count: number }>(endpoints.preregistrationsCount);
    return typeof res.count === 'number' && res.count >= 0 ? res.count : null;
  } catch {
    return null;
  }
}
