import { Suspense } from 'react';
import type { Metadata } from 'next';
import { DisputeOpen } from '@/features/disputes';

export const metadata: Metadata = { title: 'Open a dispute' };

export default function DisputeNewPage() {
  // DisputeOpen reads useSearchParams (dispute context) — needs a Suspense boundary for `next build`.
  return (
    <Suspense>
      <DisputeOpen />
    </Suspense>
  );
}
