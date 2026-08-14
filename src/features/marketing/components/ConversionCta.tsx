'use client';

/**
 * The landing page's primary conversion control — the single place that knows what "get started"
 * currently means.
 *
 * Pre-launch there is nothing to sign into, so it opens the pre-registration wizard in place.
 * Once live the same intent has a real destination, so it becomes a link to sign-up: navigation
 * must BE a link, not a button that navigates (the nested-interactive a11y trap CtaLink was
 * created to avoid), and a link gets middle-click, long-press and "open in new tab" for free.
 *
 * Every call site previously called `open()` directly, which is exactly why setting
 * NEXT_PUBLIC_LAUNCH_STATE=live changed nothing. Routing them all through here means the hero,
 * nav, mobile bar, benefits tabs and final CTA switch together or not at all.
 */
import type { ReactNode } from 'react';
import { track } from '../analytics';
import { marketingConfig } from '../marketing.config';
import { useConversion } from '../prereg/ConversionContext';
import type { PreregRole } from '../prereg/api';
import { CtaButton, CtaLink, type CtaSize, type CtaVariant } from './CtaLink';

export interface ConversionCtaProps {
  /** Analytics attribution for which CTA was used ('hero', 'nav', 'sticky-mobile', …). */
  source: string;
  /** Preselects the role — the wizard's default pre-launch, a query param once live. */
  role?: PreregRole;
  children: ReactNode;
  $variant?: CtaVariant;
  $size?: CtaSize;
  $fullWidth?: boolean;
  /** Needed by the sticky bar, which stays mounted (translated off-screen) while hidden. */
  tabIndex?: number;
  /**
   * Side effect to run before the CTA acts — the nav sheet uses it to close itself. Capture phase
   * so it fires ahead of our own handler in both the button and the link case.
   */
  onClickCapture?: () => void;
}

export function ConversionCta({ source, role, children, ...style }: ConversionCtaProps) {
  const { open } = useConversion();

  if (marketingConfig.isLive) {
    // Carry the role through so sign-up can skip asking what they already told us.
    const href = role
      ? `${marketingConfig.signUpHref}?role=${encodeURIComponent(role)}`
      : marketingConfig.signUpHref;
    return (
      <CtaLink href={href} onClick={() => track('cta_click', { source, role })} {...style}>
        {children}
      </CtaLink>
    );
  }

  return (
    <CtaButton
      type="button"
      onClick={() => {
        track('cta_click', { source, role });
        open(role, source);
      }}
      {...style}
    >
      {children}
    </CtaButton>
  );
}
