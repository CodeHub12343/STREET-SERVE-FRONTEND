import type { Preview } from '@storybook/react';
import { withThemeFromJSXProvider } from '@storybook/addon-themes';
import { ThemeProvider } from 'styled-components';
import { darkTheme, lightTheme } from '../src/styles/theme';
import { GlobalStyle } from '../src/styles/GlobalStyle';

/**
 * Every story renders under the real styled-components theme + GlobalStyle, switchable between
 * dark and light via the toolbar — the practical guarantee that components look right in both
 * themes (COMPONENT_LIBRARY.md §6).
 */
export const decorators = [
  withThemeFromJSXProvider({
    themes: { dark: darkTheme, light: lightTheme },
    defaultTheme: 'dark',
    Provider: ThemeProvider,
    GlobalStyles: GlobalStyle,
  }),
];

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    layout: 'centered',
  },
};

export default preview;
