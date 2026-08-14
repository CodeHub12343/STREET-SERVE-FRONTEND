import type { Metadata } from 'next';
import { ProductDetail } from '@/features/consignment';

export const metadata: Metadata = { title: 'Product' };

export default function ProductPage({ params }: { params: { id: string } }) {
  return <ProductDetail productId={params.id} />;
}
