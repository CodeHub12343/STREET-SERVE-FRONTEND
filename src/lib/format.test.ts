import { describe, expect, it } from 'vitest';
import { formatDate, formatRelativeMinutes } from './format';

describe('formatRelativeMinutes', () => {
  const now = Date.parse('2026-08-14T12:00:00Z');

  it('reads recent timestamps in plain language', () => {
    expect(formatRelativeMinutes('2026-08-14T11:59:40Z', now)).toBe('just now');
    expect(formatRelativeMinutes('2026-08-14T11:45:00Z', now)).toBe('15 min ago');
    expect(formatRelativeMinutes('2026-08-14T09:00:00Z', now)).toBe('3 hours ago');
    expect(formatRelativeMinutes('2026-08-13T12:00:00Z', now)).toBe('yesterday');
  });

  it('treats a future timestamp as just now rather than a negative age', () => {
    expect(formatRelativeMinutes('2026-08-14T12:05:00Z', now)).toBe('just now');
  });

  /**
   * Posting a review put a row with no `createdAt` into the list (POST /reviews returns only
   * `{id, rating}`). Every comparison against NaN is false, so it fell through the whole ladder to
   * `formatDate`, where Intl throws RangeError: Invalid time value — during render, which replaced
   * the screen with the error boundary moments after the success toast.
   */
  it('returns empty rather than throwing on a missing or unparseable date', () => {
    expect(formatRelativeMinutes(undefined as unknown as string, now)).toBe('');
    expect(formatRelativeMinutes('', now)).toBe('');
    expect(formatRelativeMinutes('not-a-date', now)).toBe('');
  });
});

describe('formatDate', () => {
  it('formats a valid date', () => {
    expect(formatDate('2026-08-14T12:00:00Z')).toMatch(/Aug/);
  });

  // Intl is the one formatter that throws instead of degrading, so it is guarded at the source.
  it('returns empty rather than throwing on an invalid date', () => {
    expect(formatDate(undefined as unknown as string)).toBe('');
    expect(formatDate('nope')).toBe('');
  });
});
