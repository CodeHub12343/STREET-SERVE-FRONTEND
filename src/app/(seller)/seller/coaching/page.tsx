import type { Metadata } from 'next';
import { SalesCoaching } from '@/features/ai';

export const metadata: Metadata = { title: 'Sales coaching' };

export default function CoachingPage() {
  return <SalesCoaching />;
}
