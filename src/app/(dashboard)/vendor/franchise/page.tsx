/**
 * `/vendor/franchise` — self-serve "Enable Franchise Mode" for the signed-in business owner.
 *
 * No admin step. Clicking the button converts the business into a brand in a single call and
 * routes the owner to the brand overview.
 */
import type { Metadata } from 'next';
import { VendorFranchiseMode } from '@/features/brand/VendorFranchiseMode';

export const metadata: Metadata = { title: 'Franchise Mode' };

export default function VendorFranchiseModePage() {
  return <VendorFranchiseMode />;
}
