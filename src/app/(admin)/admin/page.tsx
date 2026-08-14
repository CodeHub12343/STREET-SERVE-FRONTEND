import type { Metadata } from 'next';
import { OpsOverview } from '@/features/admin';

export const metadata: Metadata = { title: 'Ops Overview' };

export default function AdminOverviewPage() {
  return <OpsOverview />;
}
