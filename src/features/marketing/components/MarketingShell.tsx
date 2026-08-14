'use client';

/**
 * MarketingShell — the page chrome: skip link, announcement banner, sticky nav, <main>, footer.
 * Landmark structure per LANDING_PAGE_ACCESSIBILITY.md §2 (header → main → footer, skip link as
 * the first tab stop).
 */
import { useEffect, type ReactNode } from 'react';
import styled from 'styled-components';
import { trackOncePerSession } from '../analytics';
import { ConversionProvider } from '../prereg/ConversionContext';
import { AnnouncementBanner } from './AnnouncementBanner';
import { MarketingNav } from './MarketingNav';
import { MarketingFooter } from './MarketingFooter';
import { StickyMobileCta } from './StickyMobileCta';
import { glass } from '../mk';

export function MarketingShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    trackOncePerSession('landing_view');
  }, []);

  return (
    <ConversionProvider>
      <SkipLink href="#hero-content">Skip to content</SkipLink>
      {/* Banner scrolls away; the nav bar is sticky. The nav must NOT share a wrapper with the
          banner — position:sticky unsticks at its parent's bottom edge. */}
      <header>
        <AnnouncementBanner />
      </header>
      <MarketingNav />
      <main id="main">{children}</main>
      <MarketingFooter />
      <StickyMobileCta />
    </ConversionProvider>
  );
}

const SkipLink = styled.a`
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 100;
  padding: 12px 20px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  font-weight: 700;
  font-size: 14px;
  ${({ theme }) => glass(theme)}
  color: ${({ theme }) => theme.color.textPrimary};
  transform: translateY(-200%);
  &:focus-visible {
    transform: none;
  }
`;
