import type { Metadata } from 'next';
import { RewardsHub } from '@/features/rewards';

export const metadata: Metadata = { title: 'Rewards' };

/**
 * 7.2 / 7.3 / 7.4 — stamp cards, earned rewards, wish list, and referrals in one place.
 * One screen because from the customer's side they are one idea: things the app is holding for me.
 */
export default function RewardsPage() {
  return <RewardsHub />;
}
