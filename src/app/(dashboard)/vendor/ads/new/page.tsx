'use client';

import { useSearchParams } from 'next/navigation';
import { PromoteFlow, type PromoteSubject } from '@/features/ads';
import { useRequireAnyRole } from '@/lib/auth/guards';

/**
 * Buy a promotion. Defaults to an ad campaign; `?kind=featured_product&subjectId=…` promotes a
 * specific product or hub, which is how the "Promote" action on a listing arrives here.
 */
export default function NewPromotionPage() {
  useRequireAnyRole('vendor', 'hub');
  const params = useSearchParams();
  const kind = params.get('kind');
  const subjectId = params.get('subjectId');
  const name = params.get('name') ?? 'this listing';
  const businessId = params.get('businessId') ?? undefined;

  const subject: PromoteSubject =
    (kind === 'featured_product' || kind === 'featured_hub') && subjectId
      ? { kind, subjectId, name }
      : { kind: 'ad', businessId };

  return <PromoteFlow subject={subject} />;
}
