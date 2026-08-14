import type { Metadata } from 'next';
import { LedgerExplorer } from '@/features/finance';

export const metadata: Metadata = { title: 'Ledger' };

export default function LedgerPage() {
  return <LedgerExplorer />;
}
