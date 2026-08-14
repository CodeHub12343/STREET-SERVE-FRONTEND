/**
 * Active cart (STATE_MANAGEMENT.md §5, §7) — ephemeral client state for the order the user is
 * building at one business. Money stays in integer cents; totals are derived, never stored
 * formatted. A single active cart at a time (you order from one business).
 */
import { create } from 'zustand';
import type { Cents } from '@/types';

export interface CartLine {
  itemId: string;
  name: string;
  priceCents: Cents;
  qty: number;
}

export type TipChoice = 'none' | 'roundup' | 'custom';

interface CartState {
  businessId?: string;
  lines: CartLine[];
  tip: TipChoice;
  customTipCents: Cents;
  /** Discount % locked from the queue (0 when ordering ahead). */
  discountPercent: number;
  queuePosition?: number;

  setContext: (businessId: string, discountPercent: number, queuePosition?: number) => void;
  addItem: (line: Omit<CartLine, 'qty'>) => void;
  setQty: (itemId: string, qty: number) => void;
  setTip: (tip: TipChoice, customTipCents?: Cents) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  lines: [],
  tip: 'roundup',
  customTipCents: 0,
  discountPercent: 0,

  setContext: (businessId, discountPercent, queuePosition) =>
    set((s) =>
      s.businessId === businessId
        ? { discountPercent, queuePosition }
        : { businessId, discountPercent, queuePosition, lines: [], tip: 'roundup', customTipCents: 0 },
    ),

  addItem: (line) =>
    set((s) => {
      const existing = s.lines.find((l) => l.itemId === line.itemId);
      if (existing) {
        return { lines: s.lines.map((l) => (l.itemId === line.itemId ? { ...l, qty: l.qty + 1 } : l)) };
      }
      return { lines: [...s.lines, { ...line, qty: 1 }] };
    }),

  setQty: (itemId, qty) =>
    set((s) => ({
      lines: qty <= 0 ? s.lines.filter((l) => l.itemId !== itemId) : s.lines.map((l) => (l.itemId === itemId ? { ...l, qty } : l)),
    })),

  setTip: (tip, customTipCents = 0) => set({ tip, customTipCents }),
  clear: () => set({ businessId: undefined, lines: [], tip: 'roundup', customTipCents: 0, discountPercent: 0, queuePosition: undefined }),
}));

/** Derived selectors (kept out of the store so totals are always computed fresh). */
export function cartSubtotal(lines: CartLine[]): Cents {
  return lines.reduce((sum, l) => sum + l.priceCents * l.qty, 0);
}
