import type { Metadata } from 'next';
import { SellerProfileEditor } from '@/features/academy';

export const metadata: Metadata = { title: 'Your selling profile' };

/** D-2 — the self-declared half of the matching profile. */
export default function SellerProfilePage() {
  return <SellerProfileEditor />;
}
