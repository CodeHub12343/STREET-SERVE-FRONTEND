import { describe, expect, it } from 'vitest';
import { computeBreakdown, mapServerBreakdown, type ServerBreakdown } from './breakdown';

describe('receipt breakdown (money-path math)', () => {
  it('applies the locked discount, then round-up tip, in integer cents', () => {
    // $18.50 subtotal, 20% off → $14.80 discounted → round-up tip 20c → $15.00 total.
    const b = computeBreakdown(1850, 20, 'roundup', 0);
    expect(b.discountCents).toBe(370);
    expect(b.tipCents).toBe(20);
    expect(b.totalCents).toBe(1500);
  });

  it('no discount, no tip → total equals subtotal', () => {
    const b = computeBreakdown(1200, 0, 'none', 0);
    expect(b.discountCents).toBe(0);
    expect(b.tipCents).toBe(0);
    expect(b.totalCents).toBe(1200);
  });

  it('custom tip is added on top of the discounted subtotal', () => {
    const b = computeBreakdown(1000, 10, 'custom', 300);
    expect(b.discountCents).toBe(100); // 10% of 1000
    expect(b.tipCents).toBe(300);
    expect(b.totalCents).toBe(1200); // 900 + 300
  });

  it('never produces fractional cents', () => {
    const b = computeBreakdown(999, 15, 'roundup', 0);
    for (const v of [b.discountCents, b.tipCents, b.platformFeeCents, b.totalCents]) {
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('carries the mandated fee lines as $0 in the pickup MVP', () => {
    const b = computeBreakdown(1000, 0, 'none', 0);
    expect(b.taxCents).toBe(0);
    expect(b.deliveryCents).toBe(0);
    expect(b.serviceFeeCents).toBe(0);
    expect(b.processingFeeCents).toBe(0);
  });
});

describe('mapServerBreakdown (R9: adopt server values verbatim)', () => {
  it('renders the server total/lines without re-deriving them client-side', () => {
    const server: ServerBreakdown = {
      subtotalCents: 1000,
      discountPercent: 10,
      discountCents: 100,
      taxCents: 0,
      deliveryCents: 0,
      serviceFeeCents: 0,
      processingFeeCents: 0,
      tipCents: 50,
      roundUpCents: 0,
      totalCents: 950, // server-authoritative — client must not recompute it
      platformFeeCents: 90,
    };
    const b = mapServerBreakdown(server);
    expect(b.totalCents).toBe(950);
    expect(b.discountPercent).toBe(10);
    expect(b.discountCents).toBe(100);
    expect(b.tipCents).toBe(50);
    expect(b.platformFeeCents).toBe(90);
  });
});
