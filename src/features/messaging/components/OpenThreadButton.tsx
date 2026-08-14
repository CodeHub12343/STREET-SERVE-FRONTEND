'use client';

/**
 * Opens the conversation between a customer and a business, from wherever the two need to
 * coordinate.
 *
 * ## Why this exists
 *
 * A wave-down and a direct order end in the same physical problem: two people have to find each
 * other on a street. The wave-down flow already offered "Message them"; ordering did not — so a
 * customer who ordered without waving had no channel at all, and the seller had no way to ask
 * "where are you standing?".
 *
 * It is NOT an address field. A direct order is `pickup_now` — collected at the seller's live
 * Parked pin — and `delivery` is gated default-deny per city because ADR-004 requires insurance
 * bound before the first real delivery. Offering an address box would promise a delivery the
 * platform will refuse to perform.
 *
 * ## One thread, not one per order
 *
 * `message_threads` is uniquely indexed on (customer_id, business_id), so the POST is idempotent:
 * it returns the existing conversation rather than creating a parallel one. A regular at a coffee
 * cart keeps a single history instead of a new empty thread per cup.
 */
import { useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { useToast } from '@/components/feedback/ToastProvider';
import { AppApiError } from '@/lib/api/errors';
import { useStartThread } from '../hooks/useMessaging';

export interface OpenThreadButtonProps {
  businessId: string;
  /**
   * Present when the BUSINESS is opening the conversation. Absent means the caller is the customer.
   * Mirrors the server's two entry points rather than guessing from the current role.
   */
  customerId?: string;
  label?: string;
  /** Where thread detail lives for this surface — the dashboard and customer app differ. */
  basePath?: string;
  variant?: 'primary' | 'secondary' | 'tertiary';
  fullWidth?: boolean;
  size?: 'compact';
}

export function OpenThreadButton({
  businessId,
  customerId,
  label = 'Message',
  basePath = '/messages',
  variant = 'secondary',
  fullWidth,
  size,
}: OpenThreadButtonProps) {
  const router = useRouter();
  const { show } = useToast();
  const start = useStartThread();

  const open = () =>
    start.mutate(
      { businessId, ...(customerId ? { customerId } : {}) },
      {
        onSuccess: (thread) => router.push(`${basePath}/${thread.id}`),
        onError: (e) =>
          show(
            e instanceof AppApiError ? e.message : 'Could not open the conversation',
            'danger',
          ),
      },
    );

  return (
    <Button
      variant={variant}
      fullWidth={fullWidth}
      size={size}
      loading={start.isPending}
      onClick={open}
    >
      <MessageCircle size={15} /> {label}
    </Button>
  );
}
