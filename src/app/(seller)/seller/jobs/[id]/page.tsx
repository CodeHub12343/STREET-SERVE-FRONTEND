import type { Metadata } from 'next';
import { JobDetail } from '@/features/jobs';

export const metadata: Metadata = { title: 'Gig' };

export default function JobDetailPage({ params }: { params: { id: string } }) {
  return <JobDetail id={params.id} />;
}
