import type { Metadata } from 'next';
import { ShelterManagement } from '@/features/shelter';

export const metadata: Metadata = { title: 'Shelter partners' };

export default function SheltersPage() {
  return <ShelterManagement />;
}
