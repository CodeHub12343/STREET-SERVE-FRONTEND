import type { Metadata } from 'next';
import { ProfileStep } from '@/features/identity';

export const metadata: Metadata = { title: 'Your profile' };

export default function OnboardingProfilePage() {
  return <ProfileStep />;
}
