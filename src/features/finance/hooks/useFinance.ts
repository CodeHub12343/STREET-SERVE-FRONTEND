'use client';

/**
 * Finance data layer (Phase 1 ledger). Read-only: the ledger is written only by backend services
 * posting balanced entry sets, never by a client.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import type {
  FundsAvailability,
  LedgerAccount,
  LedgerEntry,
  ReconciliationReport,
  TrustBenefits,
} from '../types';

const DEMO_ACCOUNTS: LedgerAccount[] = [
  { id: 'a1', ownerType: 'platform', ownerId: null, accountType: 'cash', currency: 'USD', balanceCents: 0 },
  { id: 'a2', ownerType: 'platform', ownerId: null, accountType: 'fee_revenue', currency: 'USD', balanceCents: 9030 },
  { id: 'a3', ownerType: 'user', ownerId: 'seller_1', accountType: 'receivable', currency: 'USD', balanceCents: 37475 },
  { id: 'a4', ownerType: 'business', ownerId: 'hub_1', accountType: 'payable', currency: 'USD', balanceCents: 28445 },
];

/**
 * Demo fixture for A-2 — deliberately the MESSY case (a Bronze hold plus uncollected cash) rather
 * than a clean one, because the whole point of the screen is explaining why money is stuck.
 */
const DEMO_FUNDS: FundsAvailability = {
  tier: 'bronze',
  holdDays: 3,
  connected: true,
  payoutsEnabled: true,
  detailsSubmitted: true,
  frozen: false,
  buckets: [
    {
      key: 'on_the_way',
      label: 'On the way to your bank',
      amountCents: 12_450,
      blocked: false,
      reason:
        'Held 3 days before it reaches your bank. This is your bronze verification level, not a delay on our side.',
      remedy: 'Finish verifying your identity to shorten or remove this hold.',
    },
    {
      key: 'cash_sales',
      label: 'Earned from cash sales',
      amountCents: 8_200,
      blocked: true,
      reason:
        'The customer paid you in cash, so this money never came through StreetServe — we can’t pay out what we never collected.',
      remedy: 'Take card payments in-app and your share is paid out automatically.',
    },
  ],
  totals: { movingCents: 12_450, blockedCents: 8_200 },
  nextStep: {
    action: 'verify_identity',
    label: 'Verify your identity to shorten the hold',
    detail: "You're at bronze — payouts are held 3 days. Verified sellers wait less.",
  },
};

const DEMO_TRUST: TrustBenefits = {
  score: 72,
  computedAt: new Date().toISOString(),
  formulaVersion: 'v2',
  band: {
    key: 'trusted',
    label: 'Trusted',
    minScore: 65,
    inventoryMultiplier: 1.5,
    feeDiscountBps: 1000,
    premiumEligible: true,
  },
  nextBand: {
    key: 'elite',
    label: 'Elite',
    minScore: 85,
    pointsAway: 13,
    unlocks: { inventoryMultiplier: 2, feeDiscountBps: 2500, premiumEligible: false },
  },
  howToImprove: [
    'Return unsold stock before the return window closes',
    'Keep customer reviews above 3 stars',
    'Complete more consignments — a new account starts low until it has a record',
    'Resolve disputes before they are upheld against you',
  ],
};

export function useLedgerAccounts(filter: { ownerType?: string; accountType?: string } = {}) {
  return useQuery<LedgerAccount[]>({
    queryKey: keys.financeAccounts(filter.ownerType ?? 'all', filter.accountType ?? 'all'),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(DEMO_ACCOUNTS)
        : api.get<LedgerAccount[]>(endpoints.financeAccounts, {
            query: { ownerType: filter.ownerType, accountType: filter.accountType },
          }),
    staleTime: 30_000,
  });
}

export function useLedgerEntries(filter: { accountId?: string; refType?: string; refId?: string } = {}) {
  return useQuery<{ items: LedgerEntry[]; nextCursor: string | null }>({
    queryKey: keys.financeEntries(filter.accountId ?? filter.refId ?? 'all'),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve({ items: [], nextCursor: null })
        : api.get<{ items: LedgerEntry[]; nextCursor: string | null }>(endpoints.financeEntries, {
            query: { ...filter, limit: 50 },
          }),
    staleTime: 15_000,
  });
}

/**
 * The operational early-warning system. If this is ever unhealthy, feature work stops until it's
 * green again — a marketplace that can't prove its books can't be audited, financed, or sold.
 */
export function useReconciliation() {
  return useQuery<ReconciliationReport>({
    queryKey: keys.financeReconciliation,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve({
            accountsChecked: 27,
            drifted: [],
            unbalancedTransactions: [],
            repaired: 0,
            healthy: true,
          })
        : api.get<ReconciliationReport>(endpoints.financeReconciliation),
    // Never cached: this is a live integrity check, not a display value.
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

/**
 * A-2. Why money is held. Read this instead of inferring a reason from earnings totals: the server
 * knows about the tier hold, the dispute freeze and the Connect account state, and the client would
 * have to guess at all three.
 */
export function useFundsAvailability() {
  return useQuery<FundsAvailability>({
    queryKey: keys.fundsAvailability,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(DEMO_FUNDS)
        : api.get<FundsAvailability>(endpoints.fundsAvailability),
    staleTime: isMapDemo ? Infinity : 30_000,
  });
}

/**
 * A-3. The caller's Trust band and what it earns them. Served rather than computed client-side so
 * the screen can never promise a benefit the enforcement path doesn't grant.
 */
export function useTrustBenefits() {
  return useQuery<TrustBenefits>({
    queryKey: keys.myTrustBenefits,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(DEMO_TRUST)
        : api.get<TrustBenefits>(endpoints.myTrustBenefits),
    staleTime: isMapDemo ? Infinity : 60_000,
  });
}
