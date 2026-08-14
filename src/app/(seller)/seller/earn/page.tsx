import type { Metadata } from 'next';
import { EarnHub } from '@/features/academy';

export const metadata: Metadata = { title: 'Earn today' };

/**
 * D-1 — every way to earn today in one ranked list. Distinct from /seller/start, which is the
 * first-run pitch; this is the working surface someone returns to.
 */
export default function EarnPage() {
  return <EarnHub />;
}
