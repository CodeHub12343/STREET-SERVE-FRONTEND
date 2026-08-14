import type { Metadata } from 'next';
import { BlockParty } from '@/features/livemap';

export const metadata: Metadata = { title: 'Block Party' };

export default function BlockPartyPage() {
  return <BlockParty />;
}
