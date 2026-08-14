import type { Metadata } from 'next';
import { QrCheckout } from '@/features/consignment';

export const metadata: Metadata = { title: 'Checkout' };

export default function CheckoutPage({ searchParams }: { searchParams: { productId?: string; qty?: string } }) {
  const productId = searchParams.productId ?? '';
  const quantity = Math.max(1, parseInt(searchParams.qty ?? '1', 10) || 1);
  return <QrCheckout productId={productId} quantity={quantity} />;
}
