import type { Metadata } from 'next';
import { ResidentTraining } from '@/features/shelter';

export const metadata: Metadata = { title: 'Before you start selling' };

/** B-5: the starter course that gates a resident's first pickup. */
export default function ResidentTrainingPage() {
  return <ResidentTraining />;
}
