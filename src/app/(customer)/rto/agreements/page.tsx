import type { Metadata } from 'next';
import { RtoAgreementsList } from '@/features/rto';

export const metadata: Metadata = { title: 'Your rent-to-own' };

/** 2.10 — the list that made an existing agreement reachable without keeping its URL. */
export default function RtoAgreementsPage() {
  return <RtoAgreementsList />;
}
