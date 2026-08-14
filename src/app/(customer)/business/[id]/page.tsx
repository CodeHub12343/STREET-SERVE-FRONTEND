import type { Metadata } from 'next';
import { MapHome } from '@/features/livemap';

export const metadata: Metadata = { title: 'Business' };

/**
 * C-14 deep link — opens the business profile sheet over the map (SheetStack). Reuses MapHome with
 * the business preselected so the map context is preserved.
 */
export default function BusinessPage({ params }: { params: { id: string } }) {
  return <MapHome initialBusinessId={params.id} />;
}
