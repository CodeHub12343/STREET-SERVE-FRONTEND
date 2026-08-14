/**
 * Active surface/mode for the additive-role switcher (STATE_MANAGEMENT.md §5,
 * AUTHENTICATION_IMPLEMENTATION.md §4). Not authorization — just which surface the user is in.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppMode } from '@/types';

interface ModeState {
  activeMode: AppMode;
  setMode: (mode: AppMode) => void;
}

export const useModeStore = create<ModeState>()(
  persist(
    (set) => ({
      activeMode: 'customer',
      setMode: (activeMode) => set({ activeMode }),
    }),
    { name: 'ss-mode' },
  ),
);
