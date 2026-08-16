/**
 * Rent-to-Own contracts (R20–R27). Mirrors the backend rto.service views: a disclosed quote (U8),
 * an agreement summary, and the progress dashboard (U9).
 *
 * These live in types/ rather than features/rto/ because they are a backend API contract, and
 * lib/demo.rto.ts (offline fixtures) has to describe the same shapes. lib/ is cross-cutting
 * plumbing and may not import features/, so a feature-local home made the demo fixtures an
 * architecture violation that only surfaced on a production build, where lint runs.
 */
import type { Cents } from './index';

export type RtoFrequency = 'daily' | 'weekly' | 'biweekly' | 'twice_monthly' | 'monthly' | 'custom';

export type RtoStatus =
  | 'active'
  | 'grace'
  | 'late'
  | 'arrangement'
  | 'paused'
  | 'return_pending'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export interface RtoQuoteInput {
  cashPriceCents: Cents;
  initialPaymentCents: Cents;
  installmentCount: number;
  frequency: RtoFrequency;
  markupBps: number;
  setupFeeCents?: Cents;
  lateFeeCents?: Cents;
}

export interface RtoScheduleRow {
  installmentNumber: number;
  amountCents: Cents;
  ownershipCreditCents: Cents;
  rentalCents: Cents;
  feeCents: Cents;
}

/** §44 per-listing obligations. See the backend's rto.terms.ts for the field-vs-prose boundary. */
export type RtoParty = 'customer' | 'seller' | 'owner' | 'shared';

export interface RtoListingTerms {
  maintenanceResponsibility: RtoParty;
  damageResponsibility: RtoParty;
  returnAllowed: boolean;
  returnTransportResponsibility: RtoParty;
  restockingFeeCents: Cents;
  paymentsRefundableOnReturn: boolean;
  ownershipCreditPreservedOnReturn: boolean;
  reinstatementAllowed: boolean;
  cancellationNoticeDays: number;
  deliveryFeeCents: Cents;
  taxBps: number;
}

export interface RtoDisclosure {
  cashPriceCents: Cents;
  initialPaymentCents: Cents;
  totalToOwnCents: Cents;
  costOverCashCents: Cents;
  installmentAmountCents: Cents;
  installmentCount: number;
  frequency: RtoFrequency;
  graceDays: number;
  setupFeeCents: Cents;
  lateFeeCents: Cents;
  schedule: RtoScheduleRow[];
  /** §47 — "may cost more than buying outright". Rendered prominently, never paraphrased. */
  disclosure: string;
  listingTerms: RtoListingTerms;
  /** Plain-language §44 obligations, authored server-side so every surface says the same thing. */
  obligations: string[];
}

/** A seller's published offer (§42). Every term on an agreement comes from one of these. */
export interface RtoListing {
  id: string;
  sellerId: string;
  productName: string;
  description: string | null;
  photos: string[];
  categoryId: string;
  citySlug: string;
  cashPriceCents: Cents;
  initialPaymentCents: Cents;
  installmentCount: number;
  frequency: RtoFrequency;
  markupBps: number;
  setupFeeCents: Cents;
  lateFeeCents: Cents;
  listingTerms: RtoListingTerms;
  obligations: string[];
  quantityAvailable: number;
  status: 'active' | 'paused' | 'withdrawn';
}

/** GET /rto/listings/:id — the offer plus its full §44 disclosure. */
export interface RtoListingDisclosure extends RtoDisclosure {
  listing: RtoListing;
}

export interface CreateRtoListingInput {
  sellerId: string;
  productName: string;
  description?: string;
  categoryId: string;
  citySlug: string;
  cashPriceCents: Cents;
  initialPaymentCents: Cents;
  installmentCount: number;
  frequency: RtoFrequency;
  markupBps: number;
  setupFeeCents?: Cents;
  lateFeeCents?: Cents;
  listingTerms?: Partial<RtoListingTerms>;
  quantityAvailable: number;
}

export interface RtoAgreement {
  id: string;
  productName: string;
  status: RtoStatus;
  cashPriceCents: Cents;
  totalToOwnCents: Cents;
  installmentAmountCents: Cents;
  installmentCount: number;
  installmentsPaid: number;
  ownershipCreditedCents: Cents;
  proofOfOwnership: string | null;
}

/** Consignment-RTO per-party electronic statements (R19). */
export interface RtoStatements {
  agreementId: string;
  isConsignment: boolean;
  parties: Record<
    string,
    { totalCents: Cents; lines: { installmentNumber: number | null; role: string; amountCents: Cents; at: string }[] }
  >;
  reconciliation: { splitTotalCents: Cents; grossCollectedCents: Cents; clean: boolean };
}

/** §51 — what handing the goods back would actually mean, computed from the agreement's terms. */
export interface RtoReturnQuote {
  allowed: boolean;
  refundCents: Cents;
  restockingFeeCents: Cents;
  creditPreservedCents: Cents;
  transportResponsibility: RtoParty;
  reinstatementAllowed: boolean;
  /** Plain language, authored server-side. Never paraphrased by a client. */
  disclosure: string;
}

/** §52 — a condition report and who has signed it. */
export interface RtoConditionReport {
  photos: string[];
  videoUrl: string | null;
  serial: string | null;
  existingDamage: string | null;
  accessories: string[];
  estimatedValueCents: Cents | null;
  recordedAt: string;
  customerAcknowledged: boolean;
  sellerAcknowledged: boolean;
  /** Both signatures — the point at which this stops being one side's account. */
  agreed: boolean;
}

export interface RtoDashboard extends RtoAgreement {
  // §50/§51/§52 lifecycle state.
  pausedUntil?: string | null;
  arrangement?: { catchUpCents: Cents; dueAt: string | null; note: string | null } | null;
  arrearsPaidCents?: Cents;
  returnRequestedAt?: string | null;
  returnRequestedBy?: 'customer' | 'seller' | null;
  returnDisclosure?: string | null;
  returnRefundCents?: Cents;
  conditionDelivery?: RtoConditionReport | null;
  conditionReturn?: RtoConditionReport | null;
  obligations?: string[];
  isConsignment?: boolean;
  nextDueAt: string | null;
  installmentsRemaining: number;
  ownershipPercent: number;
  payoffCents: Cents;
  schedule?: { dueAt: string; amountCents: Cents; status: string }[];
  /**
   * A scheduled payment the automatic charge could not take, now waiting on the customer. Neither
   * reason is delinquency and neither is their fault, so it is its own state rather than Grace:
   * `authenticate` is the bank asking them to approve it, `no_card` is us having nothing to charge.
   */
  paymentActionRequired?: {
    installmentNumber: number;
    reason: 'authenticate' | 'no_card';
  } | null;
  hasSavedCard?: boolean;
  /** The card the schedule comes off, as a human recognises it. */
  savedCard?: { brand: string | null; last4: string } | null;
  /** The very next payment, as one object so the screen can state it in one sentence. */
  nextInstallment?: {
    installmentNumber: number;
    amountCents: Cents;
    dueAt: string;
    overdue: boolean;
  } | null;
}

/** What resuming a stuck instalment returns — the secret to finish it with. */
export interface RtoResumeResult {
  agreementId: string;
  installmentNumber: number;
  amountCents?: Cents | null;
  clientSecret: string | null;
  /** It cleared on its own in the meantime; there is nothing to pay. */
  alreadyPaid: boolean;
}

/**
 * What accepting an offer returns: the agreement, plus the card payment it is waiting on.
 *
 * Accepting does not move money. The server records the clickwrap, locks the schedule and OPENS a
 * PaymentIntent for everything due today — the initial payment and the set-up fee as one charge —
 * and hands back the secret to confirm it with. No ownership is credited until that intent settles
 * through the webhook, so `ownershipCreditedCents` is 0 on this response by design.
 */
export interface RtoAcceptResult extends RtoDashboard {
  /** Null only when nothing is due today (no initial payment, no set-up fee). */
  clientSecret: string | null;
  paymentIntentRef: string | null;
  amountDueNowCents: Cents;
}

/**
 * What requesting an early payoff returns. `completed` is FALSE here — it means "ownership has
 * transferred", and that happens on the webhook after the card clears, never at the moment the
 * charge is opened.
 */
export interface RtoPayoffResult {
  agreementId: string;
  payoffCents: Cents;
  completed: boolean;
  clientSecret: string | null;
  paymentIntentRef: string | null;
}
