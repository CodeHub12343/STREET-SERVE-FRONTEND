/**
 * `/brand/[brandId]/members` — invite + manage brand members.
 *
 * Owner / manager only. The backend endpoints behind this page enforce the role check — this
 * route is reachable by typing the URL, so a visitor without permission sees the standard
 * "Couldn't load" error state rather than a leak of brand data.
 */
import type { Metadata } from 'next';
import { BrandMembers } from '@/features/brand/BrandMembers';

export const metadata: Metadata = { title: 'Members & invites' };

export default function BrandMembersPage({ params }: { params: { brandId: string } }) {
  return <BrandMembers brandId={params.brandId} />;
}
