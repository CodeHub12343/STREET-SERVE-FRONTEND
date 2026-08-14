/**
 * Shelter Partner Program contracts (Phase B, FR-12).
 *
 * Two audiences with deliberately different shapes: a RESIDENT sees their own capabilities and
 * their own money; STAFF see aggregate reporting and a custody ledger. Nothing here carries
 * per-resident transaction detail across that line — FR-12.3 keeps the shelter's view aggregate.
 */
import type { Cents } from '@/types';

// ─── B-2: what a resident may currently do ──────────────────────────────────────────────────
export interface ResidentCapabilities {
  partnerId: string;
  organizationName: string;
  enrollmentId: string;
  /** What the shelter agreed to stand behind — the hard cap on ITS liability (FR-12.4). */
  cosignedAllocationCents: Cents;
  /** Already committed to live stock. The cosign caps CONCURRENT exposure, not a lifetime total. */
  allocationUsedCents: Cents;
  allocationRemainingCents: Cents;
  maxInventoryValueCents: Cents;
  maxCashDebtCents: Cents;
  /** Null when the shelter has no coordinates — the distance guard is simply off. */
  maxHubDistanceM: number | null;
  shelterLocation: [number, number] | null;
  trainingComplete: boolean;
  starterGrantAvailable: boolean;
  custodyEnabled: boolean;
  /** Verbatim instructions for collecting cash, written by the shelter. */
  collectionNote: string | null;
}

export interface ClaimResult {
  enrollmentId: string;
  partnerId: string;
  organizationName: string;
  cosignedAllocationCents: Cents;
  trainingRequired: boolean;
}

// ─── B-5: training ──────────────────────────────────────────────────────────────────────────
export interface TrainingQuestion {
  id: string;
  prompt: string;
  options: string[];
}

export interface TrainingModule {
  slug: string;
  title: string;
  body: string[];
  questions: TrainingQuestion[];
}

export interface TrainingCourse {
  slug: string;
  version: string;
  title: string;
  questionCount: number;
  modules: TrainingModule[];
}

export interface TrainingStatus {
  courseSlug: string;
  courseVersion: string;
  passed: boolean;
  scorePercent: number | null;
  completedAt: string | null;
  passMark: number;
}

export interface TrainingAnswer {
  moduleSlug: string;
  questionId: string;
  answerIndex: number;
}

export interface TrainingResult {
  passed: boolean;
  scorePercent: number;
  correctCount: number;
  totalCount: number;
  passMark: number;
  /** Every question comes back with its explanation — right or wrong. That IS the teaching. */
  results: Array<{
    moduleSlug: string;
    questionId: string;
    correct: boolean;
    explanation: string;
  }>;
}

// ─── B-3: custody ───────────────────────────────────────────────────────────────────────────
export type CustodyStatus = 'held' | 'disbursed';
export type CustodySource = 'consignment_settlement' | 'sale_payment' | 'job_payout';
export type DisbursementMethod = 'cash' | 'in_kind' | 'stored';

/** The resident's own view of money their shelter is holding for them. */
export interface MyCustodyEntry {
  id: string;
  amountCents: Cents;
  status: CustodyStatus;
  sourceType: CustodySource;
  createdAt: string;
  disbursedAt: string | null;
  acknowledged: boolean;
  organizationName: string;
  collectionNote: string | null;
}

export interface MyCustody {
  heldCents: Cents;
  entries: MyCustodyEntry[];
}

/** The staff view: what this org owes at the front desk, and to whom. */
export interface CustodyLedgerEntry {
  id: string;
  residentUserId: string;
  amountCents: Cents;
  sourceType: CustodySource;
  status: CustodyStatus;
  createdAt: string;
  disbursedAt: string | null;
  disbursementMethod: DisbursementMethod | null;
  /** Its ABSENCE is the auditable signal, not its presence. */
  residentAcknowledged: boolean;
}

export interface CustodyLedger {
  partnerId: string;
  heldCents: Cents;
  entries: CustodyLedgerEntry[];
}

// ─── B-1: enrollment ────────────────────────────────────────────────────────────────────────
export interface EnrollResult {
  id: string;
  residentUserId: string | null;
  cosignedAllocationCents: Cents;
  status: 'invited' | 'active';
  /** Returned ONCE, for staff to write down or read aloud. Never retrievable again. */
  claimCode: string | null;
  claimExpiresAt: string | null;
}

/** Aggregate only — FR-12.3 forbids per-resident rows leaving the reporting endpoint. */
export interface ShelterReport {
  partnerId: string;
  organizationName: string;
  residentCount: number;
  invitedCount: number;
  trainedCount: number;
  totalCosignedCents: Cents;
  totalEarnedCents: Cents;
  activeResidentCount: number;
  activeWindowDays: number;
  custodyHeldCents: Cents;
  custodyEnabled: boolean;
}
