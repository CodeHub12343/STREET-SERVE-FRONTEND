import type { Metadata } from 'next';
import { MyContributions } from '@/features/payforward';

export const metadata: Metadata = { title: 'Your gifts' };

/**
 * A giver's own Pay It Forward gifts. Reachable from the profile, because a contribution returns no
 * order and no receipt — without this page there was nowhere at all to find out whether a gift had
 * actually gone through, or whether it had reached anyone yet.
 */
export default function MyContributionsPage() {
  return <MyContributions />;
}
