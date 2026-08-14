import { describe, expect, it } from 'vitest';
import { toHistoryItem, toWaveHistoryItem, toBookingHistoryItem } from './hooks/useOrders';

/**
 * The Orders tab was a stub returning [] in real mode. It now maps /orders/mine rows; these pin the
 * mapping — a real title (business name), a readable status, and a deeplink that opens the receipt
 * for finished orders but the live tracker for in-progress ones.
 */
const order = (over: Partial<Parameters<typeof toHistoryItem>[0]> = {}) => ({
  id: 'o1',
  businessId: 'b1',
  businessName: 'Taco Loco',
  status: 'completed',
  items: [
    { name: 'Birria Taco', quantity: 2 },
    { name: 'Elote', quantity: 1 },
  ],
  subtotalCents: 1500,
  totalCents: 1500,
  createdAt: '2026-07-18T10:00:00Z',
  ...over,
});

describe('order history mapping', () => {
  it('titles the row with the business name and summarises the items', () => {
    const h = toHistoryItem(order());
    expect(h.title).toBe('Taco Loco');
    expect(h.subtitle).toBe('2× Birria Taco, 1× Elote');
    expect(h.amountCents).toBe(1500);
    expect(h.kind).toBe('order');
  });

  it('a completed order deeplinks to its receipt', () => {
    expect(toHistoryItem(order({ status: 'completed' })).deeplink).toBe('/order/o1/receipt');
    expect(toHistoryItem(order({ status: 'completed' })).status).toBe('Completed');
  });

  it('a live order deeplinks to its tracker', () => {
    expect(toHistoryItem(order({ status: 'accepted' })).deeplink).toBe('/order/o1');
    expect(toHistoryItem(order({ status: 'accepted' })).status).toBe('Preparing');
    expect(toHistoryItem(order({ status: 'ready' })).deeplink).toBe('/order/o1');
  });

  it('falls back gracefully when the name is missing', () => {
    expect(toHistoryItem(order({ businessName: undefined })).title).toBe('Order');
  });
});

describe('wave-down history mapping', () => {
  const wave = (over = {}) => ({
    id: 'w1',
    businessName: 'Santiago Furniture Hub',
    status: 'accepted',
    note: null,
    requestedAt: '2026-07-18T09:00:00Z',
    ...over,
  });

  it('renders a wave-down row with a readable status and a tracker deeplink', () => {
    const h = toWaveHistoryItem(wave());
    expect(h.kind).toBe('wave');
    expect(h.title).toBe('Santiago Furniture Hub');
    expect(h.subtitle).toBe('Wave-down');
    expect(h.status).toBe('Accepted');
    expect(h.deeplink).toBe('/wave/w1');
    expect(h.amountCents).toBe(0); // a wave isn't a payment — the row shows status, not an amount
  });

  it('includes the note when present', () => {
    expect(toWaveHistoryItem(wave({ note: 'by the food court' })).subtitle).toBe('Wave-down · “by the food court”');
  });

  it('maps expired to a friendly "No response"', () => {
    expect(toWaveHistoryItem(wave({ status: 'expired' })).status).toBe('No response');
  });
});

describe('booking history mapping', () => {
  const booking = (over = {}) => ({
    id: 'b1',
    businessName: 'Mobile Barber',
    serviceName: 'Men’s haircut',
    scheduledAt: '2026-07-20T14:00:00Z',
    status: 'booked',
    ...over,
  });

  it('renders a booking row with the service and a booking deeplink', () => {
    const h = toBookingHistoryItem(booking());
    expect(h.kind).toBe('booking');
    expect(h.title).toBe('Mobile Barber');
    expect(h.subtitle).toBe('Men’s haircut');
    expect(h.status).toBe('Booked');
    expect(h.deeplink).toBe('/booking/b1');
  });

  it('maps no_show to "No-show"', () => {
    expect(toBookingHistoryItem(booking({ status: 'no_show' })).status).toBe('No-show');
  });
});
