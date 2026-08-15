/**
 * Builds the styled-components theme object from the raw tokens. `buildTheme(mode)` produces
 * the dark or light theme; the active theme is chosen by the theme store + `data-theme`
 * (COMPONENT_LIBRARY.md §1, docs/06 §2.7).
 */
import {
  breakpoints,
  chart,
  elevation,
  motion,
  palette,
  radius,
  space,
  statusToColor,
  typography,
  type StatusKey,
  type ThemeMode,
} from './tokens';

export const buildTheme = (mode: ThemeMode) => {
  const color = palette[mode];
  return {
    mode,
    color,
    space,
    radius,
    typography,
    motion,
    breakpoints,
    /**
     * Depth by meaning: `theme.elevation.overlay` for a sheet, `.floating` for the orbit, `.raised`
     * for a popover, `.flat` for anything that scrolls with the page. Picking a level is answering
     * "what is this surface doing", not "how strong a shadow do I want".
     */
    elevation: elevation[mode],
    /**
     * Chart colours, per mode. `chart.series1…4` are IDENTITY only — never a status. Assign in
     * order and never cycle; a fifth series aggregates into "Other" rather than inventing a hue.
     */
    chart: chart[mode],
    /** Resolve a semantic status to its themed color value. */
    status: (key: StatusKey): string => color[statusToColor[key]],
    /** Min-width media helper: theme.media.md → '@media (min-width: 1024px)'. */
    media: {
      sm: `@media (min-width: ${breakpoints.sm}px)`,
      md: `@media (min-width: ${breakpoints.md}px)`,
      lg: `@media (min-width: ${breakpoints.lg}px)`,
    },
  } as const;
};

export type AppTheme = ReturnType<typeof buildTheme>;

export const darkTheme = buildTheme('dark');
export const lightTheme = buildTheme('light');
