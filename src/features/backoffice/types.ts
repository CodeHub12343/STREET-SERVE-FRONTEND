/**
 * Phase 7 vendor-side shapes: flash sales, scheduled pickup, mileage, corridors, festivals, and the
 * back office.
 *
 * Naming follows ADR-002 throughout: a crew member has a `defaultRateCents`, never a wage, and
 * nothing here is called an employee. Those words are read as claims about a legal relationship,
 * and the platform must not make them on a sole trader's behalf.
 */

// ─── 7.6 flash sales ───────────────────────────────────────────────────────────────────────
export interface FlashSale {
  id: string;
  businessId: string;
  /** Null = the whole business is on sale. Otherwise one menu item. */
  menuItemId: string | null;
  percent: number;
  label: string;
  startsAt: string;
  endsAt: string;
  cancelled: boolean;
  live: boolean;
}

// ─── 7.5 scheduled pickup ──────────────────────────────────────────────────────────────────
export interface PickupSlots {
  enabled: boolean;
  minLeadMinutes: number;
  maxDaysAhead: number;
  slotMinutes: number;
  /** ISO timestamps, generated from the vendor's settings — never stored. */
  slots: string[];
}

/** The discount actually applied to a quote, and what else was in the running (7.6). */
export interface QuoteDiscount {
  percent: number;
  label: string | null;
  source: 'queue_position' | 'flash_sale' | 'business_promo' | null;
  /** Discounts that were in force and lost the contest — shown so nothing looks taken away. */
  alsoAvailable: { source: string; percent: number; label: string }[];
}

// ─── 7.7 mileage ───────────────────────────────────────────────────────────────────────────
export interface MileageDay {
  date: string;
  meters: number;
  miles: number;
  sessions: number;
}

export interface MileageSummary {
  actorType: string;
  actorId: string;
  from: string;
  days: MileageDay[];
  totalMeters: number;
  totalMiles: number;
  /** GPS fixes discarded as implausible. Shown, because it explains a lower-than-expected total. */
  discardedJumps: number;
  /** The estimate caveat, from the server. Must be rendered — someone may file this figure. */
  disclosure: string;
  truncated?: boolean;
  truncationNotice?: string;
}

// ─── 7.8 corridors ─────────────────────────────────────────────────────────────────────────
export interface Corridor {
  id: string;
  label: string;
  path: [number, number][];
  radiusM: number;
  categories: string[];
  active: boolean;
}

// ─── 7.9 festivals ─────────────────────────────────────────────────────────────────────────
export interface FestivalEvent {
  id: string;
  name: string;
  venue: string | null;
  startsAt: string;
  endsAt: string | null;
  category: string | null;
  /** Null when genuinely unknown. Never render a guess — someone plans a two-hour drive on this. */
  expectedAttendance: number | null;
  url: string | null;
  verified: boolean;
}

export interface FestivalDirectory {
  radiusM: number;
  withinDays: number;
  dates: { date: string; events: FestivalEvent[] }[];
  total: number;
}

// ─── 7.10 back office ──────────────────────────────────────────────────────────────────────
export type CrewStatus = 'invited' | 'active' | 'declined' | 'removed';

export interface CrewMember {
  id: string;
  businessId: string;
  userId: string;
  note: string | null;
  /** A rate for work offered. Never a wage — ADR-002. */
  defaultRateCents: number | null;
  status: CrewStatus;
}

export type ExpenseCategory =
  | 'inventory'
  | 'fuel'
  | 'vehicle'
  | 'supplies'
  | 'permits'
  | 'pitch_fees'
  | 'equipment'
  | 'marketing'
  | 'other';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amountCents: number;
  incurredOn: string;
  description: string | null;
  receiptUrl: string | null;
  vendorName: string | null;
}

export interface ExpenseSummary {
  from: string;
  to: string;
  byCategory: Record<string, number>;
  totalCents: number;
  count: number;
  withReceipt: number;
  /** States what the summary is NOT. Must be rendered alongside the total. */
  disclosure: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'void';

export interface Invoice {
  id: string;
  number: string;
  customerName: string;
  customerEmail: string | null;
  lineItems: { description: string; quantity: number; unitPriceCents: number }[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  status: InvoiceStatus;
  issuedOn: string | null;
  dueOn: string | null;
  paidAt: string | null;
  notes: string | null;
  /** "StreetServe did not process this payment." Rendered on every invoice. */
  disclosure: string;
}
