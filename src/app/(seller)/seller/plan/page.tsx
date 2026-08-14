import type { Metadata } from 'next';
import { IncomeCoach } from '@/features/ai';

export const metadata: Metadata = { title: 'Plan my day' };

/**
 * E-9 — the Income Coach. Its own route because it is a planning MODE, entered deliberately, not a
 * panel on a browse screen.
 */
export default function PlanPage() {
  return <IncomeCoach />;
}
