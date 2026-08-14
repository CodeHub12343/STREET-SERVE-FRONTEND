import type { Metadata } from 'next';
import { ReconciliationDashboard } from '@/features/finance';

export const metadata: Metadata = { title: 'Reconciliation' };

export default function ReconciliationPage() {
  return <ReconciliationDashboard />;
}
