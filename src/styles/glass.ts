/**
 * Glass surface material (MAP_REDESIGN_SPECIFICATION §8.1) — the ONE recipe for floating chrome
 * over the map. Do not create variants; callers only choose the border-radius.
 *
 * Why each part matters:
 * - `saturate(1.6)` is mandatory. Blur alone averages the map to grey mud; boosting saturation
 *   preserves the sense that a real map continues beneath — the whole difference between Apple's
 *   material and a generic frosted div.
 * - A `0.5px` hairline (a crisp ~1.5 device px at 3× DPI), not 1px which reads chunky.
 * - A two-layer shadow: a tight 1px contact shadow plus a wide soft one. This doubles as the §8.3
 *   scrim — the separation that keeps white glass legible over white residential roads. A single
 *   blurred shadow is the most common tell of amateur elevation.
 * - Dark glass gets a lit top edge (`inset … rgba(255,255,255,.06)`) so it reads as a surface, not
 *   a hole, and a deeper drop.
 *
 * Degrades to a solid `surfaceRaised` where `backdrop-filter` is unsupported OR the user asked for
 * reduced transparency (iOS accessibility parity).
 */
import { css } from 'styled-components';
import type { AppTheme } from './theme';

export const glassSurface = (theme: AppTheme) => css`
  background: ${theme.mode === 'dark'
    ? `color-mix(in srgb, ${theme.color.surfaceRaised} 78%, transparent)`
    : `color-mix(in srgb, ${theme.color.surfaceRaised} 72%, transparent)`};
  -webkit-backdrop-filter: blur(24px) saturate(1.6);
  backdrop-filter: blur(24px) saturate(1.6);
  border: 0.5px solid ${`color-mix(in srgb, ${theme.color.line2} 60%, transparent)`};
  box-shadow: ${theme.mode === 'dark'
    ? `0 1px 2px rgba(0, 0, 0, 0.2), 0 8px 24px -8px rgba(0, 0, 0, 0.5),
       inset 0 1px 0 rgba(255, 255, 255, 0.06)`
    : `0 1px 2px rgba(0, 0, 0, 0.04), 0 8px 24px -8px rgba(0, 0, 0, 0.12)`};

  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    background: ${theme.color.surfaceRaised};
  }
  @media (prefers-reduced-transparency: reduce) {
    background: ${theme.color.surfaceRaised};
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
`;
