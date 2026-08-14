/**
 * Marketing theme extension (LANDING_PAGE_STRATEGY.md §7 deltas). Additive tokens scoped to the
 * marketing surface — product tokens in styles/tokens.ts stay untouched. Implemented as a token
 * module (not a nested ThemeProvider): every value derives from the active theme's mode, so
 * components stay SSR-safe and the product DefaultTheme type is never widened.
 */
import { css } from 'styled-components';
import type { AppTheme } from '@/styles/theme';

/** Display-XL steps beyond the product 56px cap — hero/H2 scale only. */
export const displayXL = {
  h1: 'clamp(40px, 8vw, 88px)',
  h2: 'clamp(28px, 4vw, 40px)',
  lede: 'clamp(16px, 2vw, 19px)',
} as const;

/** Marketing motion tier — used from LP-3 onward; both collapse under prefers-reduced-motion. */
export const mkMotion = {
  reveal: 500,
  hero: 600,
} as const;

/** Content grid maxima (LANDING_PAGE_RESPONSIVE_GUIDE.md §2). */
export const mkLayout = {
  contentMax: 1200,
  narrowMax: 720,
  sectionGapMobile: 56,
  sectionGapTablet: 72,
  sectionGapDesktop: 96,
} as const;

/**
 * Glassmorphism surface (allowed only over the map / as floating chrome —
 * LANDING_PAGE_3D_INTERACTIONS.md §5). Includes the no-backdrop-filter fallback.
 */
export const glass = (theme: AppTheme) => css`
  background: ${theme.mode === 'dark' ? 'rgba(23, 24, 28, 0.72)' : 'rgba(255, 255, 255, 0.78)'};
  border: 1px solid
    ${theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(20, 21, 26, 0.06)'};
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
  @supports not (backdrop-filter: blur(16px)) {
    background: ${theme.color.surfaceRaised};
  }
`;

/** The one sanctioned marketing gradient (Strategy §7.4) — headline emphasis + final-CTA glow. */
export const brandGradient = (theme: AppTheme) =>
  `linear-gradient(100deg, ${theme.mode === 'dark' ? '#FF6B45' : '#E04B12'}, #FF9E45)`;

/** Uppercase eyebrow label shared by sections and the hero. */
export const eyebrowStyle = css`
  font-size: 12px;
  font-weight: 750;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.textSecondary};
`;
