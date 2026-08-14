'use client';

/**
 * Resolves the active theme (system | dark | light → concrete dark/light), stamps `data-theme`
 * on <html> so CSS + the design system agree, and provides the styled-components theme +
 * GlobalStyle. Dark is the default (docs/06 §2.7).
 */
import { useEffect, useState, type ReactNode } from 'react';
import { ThemeProvider as SCThemeProvider } from 'styled-components';
import { darkTheme, lightTheme } from '@/styles/theme';
import { GlobalStyle } from '@/styles/GlobalStyle';
import { useThemeStore } from '@/stores/theme.store';
import type { ThemeMode } from '@/styles/tokens';

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const preference = useThemeStore((s) => s.preference);
  const [system, setSystem] = useState<ThemeMode>('dark');

  // Track the OS preference so `system` stays live.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const update = () => setSystem(mq.matches ? 'light' : 'dark');
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const mode: ThemeMode = preference === 'system' ? system : preference;

  // Mirror onto <html data-theme> so non-styled CSS (and the design tokens) match.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  const theme = mode === 'light' ? lightTheme : darkTheme;

  return (
    <SCThemeProvider theme={theme}>
      <GlobalStyle />
      {children}
    </SCThemeProvider>
  );
}
