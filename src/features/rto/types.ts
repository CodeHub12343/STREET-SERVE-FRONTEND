/**
 * Re-export of the shared Rent-to-Own contracts, which now live in @/types/rto so that lib/ (the
 * offline demo fixtures) can describe the same shapes without importing features/ — lib is
 * cross-cutting plumbing and the layering rule forbids that dependency.
 *
 * Kept as a barrel so this feature's own `../types` imports stay unchanged.
 */
export type * from '@/types/rto';
