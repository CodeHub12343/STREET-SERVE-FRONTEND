import type { Metadata } from 'next';
import { AcademyHome } from '@/features/academy';

export const metadata: Metadata = { title: 'Academy' };

/** D-3/D-4 — the course catalog and what the seller has earned. */
export default function AcademyPage() {
  return <AcademyHome />;
}
