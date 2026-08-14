import type { Metadata } from 'next';
import { OrderReview } from '@/features/orders';

export const metadata: Metadata = { title: 'Your order' };

/** `?from=queue` = at-the-window context (line-up discount applies); otherwise order-ahead. */
export default function OrderReviewPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { from?: string };
}) {
  const context = searchParams.from === 'queue' ? 'window' : 'ahead';
  return <OrderReview businessId={params.id} context={context} />;
}
