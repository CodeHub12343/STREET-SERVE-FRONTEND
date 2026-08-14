import type { Metadata } from 'next';
import { JobsList } from '@/features/jobs';

export const metadata: Metadata = { title: 'Jobs' };

export default function JobsPage() {
  return <JobsList />;
}
