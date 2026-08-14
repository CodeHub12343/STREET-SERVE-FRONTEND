/**
 * Marketing shell (SSR, public) — the SEO surface (NEXTJS_ARCHITECTURE.md §2.1). The
 * MarketingShell owns chrome (skip link, banner, sticky nav, footer) and the landmark structure
 * (LANDING_PAGE_ACCESSIBILITY.md §2).
 */
import type { ReactNode } from 'react';
import { MarketingShell } from '@/features/marketing/components/MarketingShell';
import { MotionRoot } from '@/features/marketing/motion/MotionRoot';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <MotionRoot>
      <MarketingShell>{children}</MarketingShell>
    </MotionRoot>
  );
}
