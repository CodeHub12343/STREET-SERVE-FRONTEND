'use client';

/**
 * The wallet's remaining data sources (C-35). There is no consolidated wallet endpoint (GAP-5), so
 * the screen composes these client-side — as the spec intended — rather than displaying invented
 * figures.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isAuthConfigured } from '@/lib/env';
import { useAuthCompat } from '@/lib/auth/useAuthCompat';
import type { Cents } from '@/types';

export interface SpotMeObligation {
  id: string;
  counterpartyType: 'vendor' | 'peer';
  counterpartyId: string;
  amountCents: Cents;
  repayBy: string;
  status: 'pending' | 'accepted' | 'declined' | 'repaid' | 'defaulted';
  outstanding: boolean;
}

export interface WalletTransaction {
  id: string;
  amountCents: Cents;
  tipCents: Cents;
  status: 'pending' | 'completed' | 'refunded' | 'failed';
  createdAt: string;
}

/** Raw wire row — the API returns snake_case mongo docs, so map at this edge. */
interface RawTransaction {
  _id?: string;
  id?: string;
  amount_cents?: number;
  tip_cents?: number;
  status?: WalletTransaction['status'];
  created_at?: string;
}

function useAuthed() {
  const { isSignedIn } = useAuthCompat();
  return isAuthConfigured && Boolean(isSignedIn);
}

export function useSpotMeObligations() {
  const enabled = useAuthed();
  return useQuery<SpotMeObligation[]>({
    queryKey: keys.spotMe,
    enabled,
    queryFn: async () => {
      const rows = await api.get<SpotMeObligation[]>(endpoints.spotMeMine);
      return Array.isArray(rows) ? rows : [];
    },
    staleTime: 60_000,
  });
}

export function useMyTransactions() {
  const enabled = useAuthed();
  return useQuery<WalletTransaction[]>({
    queryKey: keys.transactionsMine,
    enabled,
    queryFn: async () => {
      const rows = await api.get<RawTransaction[]>(endpoints.transactionsMine);
      return (Array.isArray(rows) ? rows : []).map((r) => ({
        id: String(r.id ?? r._id ?? ''),
        amountCents: r.amount_cents ?? 0,
        tipCents: r.tip_cents ?? 0,
        status: r.status ?? 'completed',
        createdAt: r.created_at ?? '',
      }));
    },
    staleTime: 60_000,
  });
}
