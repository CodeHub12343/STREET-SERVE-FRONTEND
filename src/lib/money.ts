/**
 * Money helpers. State always holds integer cents; formatting happens only at render
 * (FOLDER_STRUCTURE.md §4). Never do float arithmetic on money.
 */
import type { Cents } from '@/types';

export function formatCents(cents: Cents, currency = 'USD', locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
}

/** Sum a list of integer-cent values safely (integer math only). */
export function sumCents(values: Cents[]): Cents {
  return values.reduce((acc, v) => acc + Math.round(v), 0);
}

/** Round-up-to-next-dollar tip amount in cents (FR-6.4). */
export function roundUpCents(subtotal: Cents): Cents {
  const remainder = subtotal % 100;
  return remainder === 0 ? 0 : 100 - remainder;
}
