import type { Metadata } from 'next';
import { SellerMembership } from '@/features/subscriptions';

export const metadata: Metadata = { title: 'Membership' };

/** F-2/F-4 — the seller-scoped plans. Everything needed to EARN stays free. */
export default function MembershipPage() {
  return <SellerMembership />;
}
