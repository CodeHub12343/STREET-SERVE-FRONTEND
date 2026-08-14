/**
 * Builds the styled-components theme object from the raw tokens. `buildTheme(mode)` produces
 * the dark or light theme; the active theme is chosen by the theme store + `data-theme`
 * (COMPONENT_LIBRARY.md §1, docs/06 §2.7).
 */
import {
  breakpoints,
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
