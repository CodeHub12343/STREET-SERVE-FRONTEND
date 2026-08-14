'use client';

/**
 * Onboarding steps require an authenticated session (you sign up first, then onboard). In dev
 * without Clerk keys the guard no-ops so the flow is walkable.
 */
import type { ReactNode } from 'react';
import { useRequireAuth } from '@/lib/auth/guards';

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  useRequireAuth();
  return <>{children}</>;
}
