/**
 * Display formatters. API timestamps are ISO-8601 UTC; format for display only here.
 */
export function formatDateTime(iso: string, locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

/**
 * Relative age, escalating through units. It previously only ever emitted minutes, so anything
 * older than an hour rendered as arithmetic the reader has to do themselves — "404 min ago" for
 * this morning, "1440 min ago" for yesterday, "10080 min ago" for last week. Past a week it falls
 * back to an absolute date, because "63 days ago" is not how anyone refers to a date.
 *
 * Name kept: it is used in 14 places (reviews, messages, notifications, payouts) and they all want
 * this same behaviour.
 */
export function formatRelativeMinutes(iso: string, now = Date.now()): string {
  const ms = now - new Date(iso).getTime();
  // A clock skew or a server timestamp a moment in the future should read as "just now", not as a
  // negative age.
  if (ms < 0) return 'just now';

  const mins = Math.round(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins === 1) return '1 min ago';
  if (mins < 60) return `${mins} min ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;

  return formatDate(iso);
}

/** Date only — for anything old enough that a relative age stops being useful. */
export function formatDate(iso: string, locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(iso));
}

/** mm:ss countdown from a server-supplied deadline (docs/13 C-19 — server-authoritative). */
export function formatCountdown(deadlineIso: string, now = Date.now()): string {
  const remainingMs = Math.max(0, new Date(deadlineIso).getTime() - now);
  const total = Math.floor(remainingMs / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
