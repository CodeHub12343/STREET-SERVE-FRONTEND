import type { Cents } from '@/types';

/**
 * Boost My Marketing (ADR-006). Customers — and other vendors — chip in toward one business's
 * direct-mail campaign. If the goal is missed, everybody is refunded automatically and in full.
 *
 * Every number here is the server's. `raisedCents` in particular is summed from contribution rows
 * server-side and must never be re-derived or optimistically bumped on the client: a progress bar
 * that runs ahead of the money is a promise the campaign cannot keep.
 */

export type BoostStatus = 'open' | 'funded' | 'expired' | 'cancelled';

/**
 * The print pipeline. **There is no `delivered`** — most saturation-mail vendors confirm handover to
 * the postal service and nothing after it, and the platform does not report what it cannot observe.
 */
export type MailingStatus = 'preparing' | 'printing' | 'mailed' | null;

/** What a contributor wants to happen if the campaign misses its goal. Refund is the default. */
export type OnUnmet = 'refund' | 'roll_forward';

export interface BoostCampaign {
  id: string;
  businessId: string;
  title: string;
  goalCents: Cents;
  raisedCents: Cents;
  remainingCents: Cents;
  percentFunded: number;
  deadlineAt: string;
  status: BoostStatus;
  fundedAt: string | null;
  /**
   * Taken from the raised total once funded — never from a contribution (ADR-006 §6).
   * **Zero until the campaign funds**, so it cannot carry the disclosure on its own.
   */
  serviceFeeCents: Cents;
  /**
   * The service-fee RATE in basis points. Exposed so the campaign page can disclose the fee
   * *before* funding, which is when a contributor is deciding — `serviceFeeCents` is still 0 then.
   */
  serviceFeeBps: number;
  mailDate: string | null;
  mailingStatus: MailingStatus;
}

export interface BoostContribution {
  id: string;
  amountCents: Cents;
  /** Null when given anonymously, which is the default. Never a user id. */
  givenBy: string | null;
  createdAt: string;
}

export interface BoostContributeInput {
  amountCents: Cents;
  anonymous?: boolean;
  displayName?: string;
  /**
   * ADR-006 §5 — chosen BEFORE paying, and defaulting to a refund. Rolling money into a campaign
   * somebody did not choose to fund is deciding what to do with their money for them.
   */
  onUnmet?: OnUnmet;
}

export interface BoostContributeResult {
  contributionId: string;
  campaignId: string;
  amountCents: Cents;
  /** Unchanged until the charge settles — the goal never looks closer than the money is. */
  raisedCents: Cents;
  clientSecret: string | null;
}

export interface CreateCampaignInput {
  title: string;
  goalCents: Cents;
  /** Hard ceiling of 60 server-side. There is no "no deadline" option. */
  deadlineDays: number;
}

/**
 * MB-4 — how many postcards a sum buys.
 *
 * The rate now comes from the contracted print vendor, so `postcards` is a real number. It is
 * **still null** whenever the rate cannot be established (a vendor outage, say), and the UI must
 * keep showing nothing in that case rather than a fabricated figure.
 *
 * `postcards` is computed from `mailableCents`, i.e. **after** the disclosed campaign service fee —
 * dividing the gross would overstate the count by the fee's percentage.
 */
export interface PostcardEstimate {
  amountCents: Cents;
  postcards: number | null;
  unitCostCents: Cents;
  /** ADR-006 §6 — taken from the raised total once the campaign funds, never from a contribution. */
  serviceFeeCents: Cents;
  /** What is left to mail with after the service fee. The basis for `postcards`. */
  mailableCents: Cents;
  isEstimate: true;
}
