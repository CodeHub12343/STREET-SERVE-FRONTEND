import type { Metadata } from 'next';
import { VerificationCenter } from '@/features/verification';

export const metadata: Metadata = { title: 'Verification' };

export default function VerificationPage() {
  return <VerificationCenter />;
}
