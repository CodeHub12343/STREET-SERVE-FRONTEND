'use client';

import { VendorRegister } from '@/features/vendor';
import { useRequireRole } from '@/lib/auth/guards';

export default function VendorRegisterPage() {
  useRequireRole('vendor');
  return <VendorRegister />;
}
