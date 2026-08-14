'use client';

/**
 * Global reset + base + the design-system's non-negotiable global rules:
 *  - theme-aware background/color from the active theme
 *  - 2px accent-secondary focus ring, offset 2px, never removed (docs/06 §2.6j)
 *  - tabular numerals utility for money/countdowns (docs/06 §2.3)
 *  - prefers-reduced-motion collapse (docs/06 §2.6c)
 */
import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; }
  * { margin: 0; }

  html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }

  body {
    background: ${({ theme }) => theme.color.surfaceBase};
    color: ${({ theme }) => theme.color.textPrimary};
    font-family: ${({ theme }) => theme.typography.fontBody};
    font-size: 16px;
    line-height: ${({ theme }) => theme.typography.lineBody};
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    min-height: 100dvh;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: ${({ theme }) => theme.typography.fontDisplay};
    line-height: ${({ theme }) => theme.typography.lineDisplay};
    letter-spacing: -0.01em;
    font-weight: 750;
  }

  a { color: inherit; text-decoration: none; }
  button, input, select, textarea { font: inherit; color: inherit; }
  img, svg, video { display: block; max-width: 100%; }

  /* Money / countdown numerals never jitter (docs/06 §2.3). */
  .tnum { font-variant-numeric: tabular-nums; }

  /* Keyboard focus ring — restyled, never removed (docs/06 §2.6j). */
  :focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.accentSecondary};
    outline-offset: 2px;
    border-radius: 6px;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
`;
