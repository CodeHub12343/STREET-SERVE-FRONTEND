import type { Metadata } from 'next';
import { RoleStep } from '@/features/identity';

export const metadata: Metadata = { title: 'What brings you here' };

export default function OnboardingRolePage() {
  return <RoleStep />;
}
