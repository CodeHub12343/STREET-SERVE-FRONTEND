import type { Metadata } from 'next';
import { MyInventory } from '@/features/consignment';

export const metadata: Metadata = { title: 'My inventory' };

export default function InventoryPage() {
  return <MyInventory />;
}
