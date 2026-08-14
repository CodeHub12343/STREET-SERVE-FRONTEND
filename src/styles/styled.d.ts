/**
 * Augments styled-components' DefaultTheme with our AppTheme so `theme.color.accentPrimary`,
 * `theme.status('driving')`, `theme.media.md`, etc. are fully typed in every styled component
 * (COMPONENT_LIBRARY.md §1).
 */
import 'styled-components';
import type { AppTheme } from './theme';

declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface DefaultTheme extends AppTheme {}
}
