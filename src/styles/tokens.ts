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

/* ───────────────────────── Elevation ─────────────────────────
 *
 * There was one `shadow` token, used in 27 places — so a toast, a card and a bottom sheet all cast
 * the same shadow and nothing could express "this sits above that". Depth was decoration rather
 * than hierarchy.
 *
 * Four levels, each tied to a MEANING rather than a look, so the right one is picked by asking what
 * the surface is doing:
 *
 *   flat     0  in the page      cards, list rows, anything that scrolls with the content
 *   raised   1  lifted a little  menus, popovers, the picker's result list
 *   floating 2  above the page   the orbit, FABs, sticky bars
 *   overlay  3  over everything   sheets, modals, toasts — things with a scrim behind them
 *
 * Two shadows per level: a tight contact shadow for the edge and a wide ambient one for the lift.
 * A single large blur reads as fog; the pair reads as an object. Dark mode uses deeper alpha
 * because a soft shadow is invisible on a near-black surface — the same values would simply
 * disappear.
 */
const darkElevation = {
  flat: 'none',
  raised: '0 1px 2px rgba(0,0,0,.45), 0 4px 12px rgba(0,0,0,.35)',
  floating: '0 2px 6px rgba(0,0,0,.5), 0 10px 28px rgba(0,0,0,.45)',
  overlay: '0 4px 12px rgba(0,0,0,.55), 0 24px 64px rgba(0,0,0,.55)',
} as const;

const lightElevation: Record<keyof typeof darkElevation, string> = {
  flat: 'none',
  raised: '0 1px 2px rgba(20,21,26,.06), 0 4px 12px rgba(20,21,26,.08)',
  floating: '0 2px 6px rgba(20,21,26,.08), 0 10px 28px rgba(20,21,26,.10)',
  overlay: '0 4px 12px rgba(20,21,26,.10), 0 24px 64px rgba(20,21,26,.14)',
};

export const elevation: Record<ThemeMode, Record<keyof typeof darkElevation, string>> = {
  dark: darkElevation,
  light: lightElevation,
};

export type ElevationKey = keyof typeof darkElevation;

/* ───────────────────────── Charts ─────────────────────────
 *
 * Series colour is a different job from status colour, and mixing them is the mistake this exists
 * to prevent: `statusDanger` on a chart series means "this line is bad", not "this line is Orders".
 * The status palette stays reserved for state; these four are for identity only.
 *
 * FOUR slots, not eight, and that is a finding rather than a shortcut. Every candidate palette was
 * run through the validator: with the brand burnt-orange occupying the warm side, a fifth and sixth
 * hue collided with it under all-pairs comparison — olive against the brand orange came out at
 * ΔE 3.2 for protanopia (indistinguishable) and magenta at 11.7 for NORMAL vision. Rather than ship
 * six colours where two pairs are unreadable, the palette stops at four and a fifth series folds
 * into "Other", or the chart becomes small multiples.
 *
 * Both modes pass all six checks under `--pairs all` (the strict setting — any two series may end
 * up adjacent once a filter removes the ones between them):
 *
 *   light  #175CD3 #C4410C #0D9488 #A21CAF   worst pair ΔE 21.8 normal · 9.6 deutan
 *   dark   #3B82F6 #D9662B #0E9F8F #B84FC7   worst pair ΔE 19.7 normal · 9.1 deutan
 *
 * Assign in the fixed order below and never cycle: colour follows the entity, so filtering a series
 * out must not repaint the survivors.
 */
const darkChart = {
  series1: '#3B82F6',
  series2: '#D9662B',
  series3: '#0E9F8F',
  series4: '#B84FC7',
  /** Recessive furniture. Grid lines must never compete with the data they measure. */
  grid: 'rgba(156,159,168,.14)',
  axis: 'rgba(156,159,168,.30)',
  /** The gap drawn between adjacent fills so two bars read as two objects, not one block. */
  gap: '#17181C',
} as const;

const lightChart: Record<keyof typeof darkChart, string> = {
  series1: '#175CD3',
  series2: '#C4410C',
  series3: '#0D9488',
  series4: '#A21CAF',
  grid: 'rgba(91,94,104,.14)',
  axis: 'rgba(91,94,104,.30)',
  gap: '#FFFFFF',
};

export const chart: Record<ThemeMode, Record<keyof typeof darkChart, string>> = {
  dark: darkChart,
  light: lightChart,
};

/**
 * The categorical order, as an array — so a chart maps `series[i]` and cannot invent a 5th colour.
 * Reaching past the end is the signal to aggregate, not to generate a hue.
 */
export const CHART_SERIES_KEYS = ['series1', 'series2', 'series3', 'series4'] as const;

export type ChartKey = keyof typeof darkChart;
