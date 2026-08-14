'use client';

import { MessagesList } from '@/features/messaging';
import { useRequireRole } from '@/lib/auth/guards';

export default function VendorMessagesPage() {
  useRequireRole('vendor');
  return <MessagesList />;
}
