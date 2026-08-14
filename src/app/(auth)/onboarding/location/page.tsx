import type { Metadata } from 'next';
import { LocationStep } from '@/features/identity';

export const metadata: Metadata = { title: 'Location' };

export default function OnboardingLocationPage() {
  return <LocationStep />;
}
