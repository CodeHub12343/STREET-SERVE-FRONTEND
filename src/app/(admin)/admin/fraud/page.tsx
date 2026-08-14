import type { Metadata } from 'next';
import { FraudFlags } from '@/features/admin';

export const metadata: Metadata = { title: 'Fraud flags' };

export default function FraudPage() {
  return <FraudFlags />;
}
