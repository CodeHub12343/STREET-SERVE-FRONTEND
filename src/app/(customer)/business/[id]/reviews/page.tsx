import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Reviews } from '@/features/business';

export const metadata: Metadata = { title: 'Reviews' };

export default function ReviewsPage({ params }: { params: { id: string } }) {
  // Reviews reads useSearchParams (transactionId) — needs a Suspense boundary for `next build`.
  return (
    <Suspense>
      <Reviews businessId={params.id} />
    </Suspense>
  );
}
