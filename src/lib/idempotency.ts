/**
 * Idempotency-Key generation for 💳 mutations (PAYMENTS_IMPLEMENTATION.md §3). One key per user
 * intent, reused across every retry of that intent so a repeated submit can't double-charge.
 */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `idem_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
