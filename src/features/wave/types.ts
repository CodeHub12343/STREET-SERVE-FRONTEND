/**
 * Wave-down contracts (docs/13 C-18/C-19, SCREEN_TO_API_MAPPING.md §3). All timers are derived from
 * a SERVER deadline (slaDeadline) — never a client-started interval (FR-2.2).
 */
export type WaveStatus = 'waiting' | 'accepted' | 'declined' | 'expired' | 'arrived';

export interface WaveDown {
  id: string;
  businessId: string;
  businessName: string;
  status: WaveStatus;
  /** ISO-8601 UTC — the SLA countdown deadline. */
  slaDeadline: string;
  etaSeconds?: number;
  /** Discount % that locks in if accepted (FR-3.3). */
  discountPercent?: number;
  /** Reason if declined. */
  reason?: string;
  /**
   * §32.4 — every charge this request carries, itemised. Two fees with different payees: the
   * vendor's travel fee is theirs, the request fee is the platform's. Named separately because
   * "$5.99 of fees" tells a customer nothing about who they are paying or what for.
   */
  feeLines?: { label: string; amountCents: number }[];
  totalFeeCents?: number;
}

export interface CreateWaveInput {
  businessId: string;
  businessName: string;
  note?: string;
}
