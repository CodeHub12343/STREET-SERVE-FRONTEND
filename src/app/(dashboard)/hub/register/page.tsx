'use client';

import { HubRegister } from '@/features/hub';
import { useRequireRole } from '@/lib/auth/guards';

export default function HubRegisterPage() {
  useRequireRole('hub');
  return <HubRegister />;
}
