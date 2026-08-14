/**
 * Auth / onboarding group. Pass-through — each page owns its shell: AuthShell (sign-in/up), a
 * full-screen carousel (welcome), or WizardFlow (onboarding steps). See ROUTING_STRUCTURE.md §3.
 */
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
