import { describe, expect, it } from 'vitest';
import { formatCents, roundUpCents, sumCents } from './money';

describe('money', () => {
  it('formats integer cents as currency', () => {
    expect(formatCents(1800)).toBe('$18.00');
    expect(formatCents(0)).toBe('$0.00');
    expect(formatCents(99)).toBe('$0.99');
  });

  it('sums cents with integer math', () => {
    expect(sumCents([100, 250, 49])).toBe(399);
  });

  it('rounds up to the next dollar', () => {
    expect(roundUpCents(1850)).toBe(50);
    expect(roundUpCents(2000)).toBe(0);
    expect(roundUpCents(1)).toBe(99);
  });
});
