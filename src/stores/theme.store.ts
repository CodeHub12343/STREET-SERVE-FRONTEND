/**
 * Theme override (STATE_MANAGEMENT.md §5). Default follows system; user can force dark/light
 * (docs/06 §2.7). Persisted so the choice survives reloads.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemePreference = 'system' | 'dark' | 'light';

interface ThemeState {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: 'system',
      setPreference: (preference) => set({ preference }),
    }),
    { name: 'ss-theme' },
  ),
);
