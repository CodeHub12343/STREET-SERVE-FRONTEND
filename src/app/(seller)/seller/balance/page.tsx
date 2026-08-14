import type { Metadata } from 'next';
import { MyBalance } from '@/features/debt';

export const metadata: Metadata = { title: 'My balance' };

export default function BalancePage() {
  return <MyBalance />;
}
