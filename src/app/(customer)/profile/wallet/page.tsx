import type { Metadata } from 'next';
import { Wallet } from '@/features/settings';

export const metadata: Metadata = { title: 'Wallet' };

export default function WalletPage() {
  return <Wallet />;
}
