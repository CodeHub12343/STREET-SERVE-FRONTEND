/**
 * Pre-registration API (docs/08 sponsors module, component spec §PreRegistrationWizard).
 * Public endpoints — no auth. Submission errors are mapped to a discriminated result so the
 * wizard can branch UI without inspecting exceptions: duplicate → "already in line",
 * offline/network → retry banner, anything else → generic error.
 */
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { AppApiError } from '@/lib/api/errors';

export type PreregRole = 'customer' | 'seller' | 'vendor' | 'hub';

export interface PreregInput {
  fullName: string;
  email: string;
  phone?: string;
  intendedRole: PreregRole;
  citySlug?: string;
  utmCode?: string;
}

export type PreregResult =
  | { kind: 'created'; id: string }
  | { kind: 'duplicate' }
  | { kind: 'offline' }
  | { kind: 'invalid'; message: string }
  | { kind: 'error' };

export async function submitPreregistration(input: PreregInput): Promise<PreregResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { kind: 'offline' };
  try {
    const data = await api.post<{ id: string }>(endpoints.preregistrations, {
      fullName: input.fullName,
      email: input.email,
      ...(input.phone ? { phone: input.phone } : {}),
      intendedRole: input.intendedRole,
      ...(input.citySlug ? { citySlug: input.citySlug } : {}),
      ...(input.utmCode ? { utmCode: input.utmCode } : {}),
    });
    return { kind: 'created', id: data.id };
  } catch (err) {
    if (err instanceof AppApiError) {
      if (err.status === 409 || err.code === 'DUPLICATE') return { kind: 'duplicate' };
      if (err.status === 400) return { kind: 'invalid', message: err.message };
      return { kind: 'error' };
    }
    // fetch TypeError → network unreachable.
    return { kind: 'offline' };
  }
}

/** Public waitlist size — used for "you're #N in line". Null on any failure (never fake it). */
export async function fetchWaitlistCount(): Promise<number | null> {
  try {
    const data = await api.get<{ count: number }>(endpoints.preregistrationsCount);
    return typeof data.count === 'number' ? data.count : null;
  } catch {
    return null;
  }
}
