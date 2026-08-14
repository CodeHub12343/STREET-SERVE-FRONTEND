'use client';

/**
 * Ping-tip earnings for the Wallet (C-35). Derived from GET /pings/mine — the shares this user
 * sent, each carrying the tip it earned and when that tip was awarded. There is no wallet-balance
 * endpoint, so the total is summed here rather than invented.
 *
 * `tipPaidAt` marks the tip as AWARDED (the vendor's ping budget was debited). It does not mean the
 * money has reached the user — no payout path exists for ping tips yet — so the UI must not promise
 * a cash-out.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isAuthConfigured } from '@/lib/env';
import { useAuthCompat } from '@/lib/auth/useAuthCompat';
import type { Cents } from '@/types';

interface RawPing {
  id: string;
  businessId: string;
  isPaid: boolean;
  tipAmountCents: Cents | null;
  tipPaidAt: string | null;
}

export interface PingEarnings {
  /** Tips actually awarded to this user. */
  earnedCents: Cents;
  /** Qualifying shares still in flight — a tip may yet be awarded. */
  pendingCount: number;
}

export function usePingEarnings() {
  const { isSignedIn } = useAuthCompat();
  return useQuery<PingEarnings>({
    queryKey: keys.pingsMine,
    enabled: isAuthConfigured && Boolean(isSignedIn),
    queryFn: async () => {
      const rows = await api.get<RawPing[]>(endpoints.pingsMine);
      const list = Array.isArray(rows) ? rows : [];
      return {
        earnedCents: list.reduce((sum, p) => (p.tipPaidAt ? sum + (p.tipAmountCents ?? 0) : sum), 0),
        pendingCount: list.filter((p) => p.isPaid && !p.tipPaidAt).length,
      };
    },
    staleTime: 60_000,
  });
}
