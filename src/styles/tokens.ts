/**
 * Design tokens — the single source of raw values, taken verbatim from
 * docs/06-ux-and-design-system.md §2 and docs/design/index.html.
 * Nothing in the app hard-codes a color/space/radius/duration; it all flows from here
 * (COMPONENT_LIBRARY.md §1).
 */

export type ThemeMode = 'dark' | 'light';

/** Palette per §2.2. Dark is the default theme (§2.7). */
const darkColor = {
  surfaceBase: '#0E0F12',
  surfaceRaised: '#17181C',
  surfaceRaised2: '#1E2027',
  textPrimary: '#F4F4F5',
  textSecondary: '#9C9FA8',
  textTertiary: '#8A8D96', // lightened from #82858F for WCAG AA (4.5:1) on raised dark surfaces
  line: 'rgba(156,159,168,.16)',
  line2: 'rgba(156,159,168,.28)',
  accentPrimary: '#C4410C', // deepened for WCAG AA: white text on the CTA fill reaches 5.1:1
  accentSecondary: '#4C8DFF',
  statusLive: '#22C55E',
  statusWarning: '#FDB022',
  statusDanger: '#F04438',
  statusDiscount: '#9B8AFA',
  statusDriving: '#22C55E',
  statusParked: '#4C8DFF',
  statusAway: '#9B8AFA',
  shadow: '0 20px 60px rgba(0,0,0,.5)',
} as const;

const lightColor: Record<keyof typeof darkColor, string> = {
  surfaceBase: '#FAFAF9',
  surfaceRaised: '#FFFFFF',
  surfaceRaised2: '#FAFAF9',
  textPrimary: '#14151A',
  textSecondary: '#5B5E68',
  textTertiary: '#64676F', // darkened from #6E717B for WCAG AA (4.5:1) on tinted chip backgrounds
  line: 'rgba(91,94,104,.16)',
  line2: 'rgba(91,94,104,.26)',
  accentPrimary: '#C4410C', // deepened for WCAG AA: white text on the CTA fill reaches 5.1:1
  accentSecondary: '#175CD3', // deepened for WCAG AA: link/tertiary text reaches 5.9:1 on light surfaces
  statusLive: '#17B26A',
  statusWarning: '#F79009',
  statusDanger: '#D92D20',
  statusDiscount: '#7A5AF8',
  statusDriving: '#17B26A',
  statusParked: '#1E6FFF',
  statusAway: '#7A5AF8',
  shadow: '0 20px 50px rgba(20,21,26,.14)',
};

export const palette: Record<ThemeMode, Record<keyof typeof darkColor, string>> = {
  dark: darkColor,
  light: lightColor,
};

/** 4px base spacing unit (§2.4) — indexed scale: space[1] = 4px … space[8] = 64px. */
export const space = [0, 4, 8, 12, 16, 24, 32, 48, 64] as const;

/** Border radius (§2.4). */
export const radius = {
  control: 8,
  card: 16,
  pill: 9999,
} as const;

/**
 * Type scale + families (§2.3). Families resolve to the next/font CSS variables set on <html>
 * (see app/layout.tsx), with system fallbacks so text renders even before fonts load.
 */
export const typography = {
  fontDisplay: "var(--font-inter-tight), ui-sans-serif, system-ui, sans-serif",
  fontBody:
    "var(--font-inter), ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  scale: [12, 14, 16, 20, 24, 32, 40, 56] as const,
  lineBody: 1.4,
  lineDisplay: 1.15,
} as const;

/** Motion tokens (§2.6c). Durations in ms. */
export const motion = {
  micro: 100,
  standard: 200,
  sheet: 300,
  easeOut: 'cubic-bezier(0.2, 0, 0, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
} as const;

/** Responsive breakpoints in px (§2.6i), min-width / mobile-first (RESPONSIVE_STRATEGY.md §2). */
export const breakpoints = {
  sm: 640,
  md: 1024,
  lg: 1280,
} as const;

/**
 * Semantic status → palette-key map. One status value drives pin ring, chip, etc.
 * (docs/06 §2.2, docs/13 C-14 "one status drives five surfaces").
 */
export const statusToColor = {
  driving: 'statusDriving',
  parked: 'statusParked',
  away: 'statusAway',
  live: 'statusLive',
  warning: 'statusWarning',
  danger: 'statusDanger',
  discount: 'statusDiscount',
} as const;

export type StatusKey = keyof typeof statusToColor;
export type ColorKey = keyof typeof darkColor;
