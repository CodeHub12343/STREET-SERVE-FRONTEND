import { describe, expect, it } from 'vitest';
import { toVendorOrder } from './hooks/useVendorData';

/**
 * The vendor order board grouped by status pending/preparing/ready, but the server's lifecycle is
 * pending → accepted → ready. An accepted ticket therefore matched NO column and vanished the
 * moment the board refetched. The mapping below is the fix; these pin it.
 */
const raw = (over: Partial<Parameters<typeof toVendorOrder>[0]> = {}) => ({
  id: 'o1',
  customerName: 'Ada',
  status: 'pending',
  items: [{ name: 'Taco', quantity: 2 }],
  totalCents: 800,
  createdAt: '2026-07-18T10:00:00Z',
  ...over,
});

describe('vendor order board mapping', () => {
  it("maps the server's 'accepted' onto the board's 'preparing' column", () => {
    // Without this, an accepted order shows in no column and disappears.
    expect(toVendorOrder(raw({ status: 'accepted' })).status).toBe('preparing');
  });

  it('passes the other statuses through unchanged', () => {
    expect(toVendorOrder(raw({ status: 'pending' })).status).toBe('pending');
    expect(toVendorOrder(raw({ status: 'ready' })).status).toBe('ready');
    expect(toVendorOrder(raw({ status: 'completed' })).status).toBe('completed');
  });

  it('maps line-item quantity → qty (the card reads qty)', () => {
    expect(toVendorOrder(raw()).items).toEqual([{ name: 'Taco', qty: 2 }]);
  });

  it('carries the customer name, with a safe fallback', () => {
    expect(toVendorOrder(raw({ customerName: 'Ada' })).customerName).toBe('Ada');
    expect(toVendorOrder(raw({ customerName: undefined })).customerName).toBe('A customer');
  });

  it('defaults a missing quantity to 1 rather than rendering "undefined×"', () => {
    expect(toVendorOrder(raw({ items: [{ name: 'Cola', quantity: null }] })).items).toEqual([
      { name: 'Cola', qty: 1 },
    ]);
  });
});
