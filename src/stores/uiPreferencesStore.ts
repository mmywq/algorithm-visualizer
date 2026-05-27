import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeMode = 'dark' | 'light';

interface UiPreferencesState {
  readonly theme: ThemeMode;
  readonly playbackSpeedMs: number;
  readonly setTheme: (theme: ThemeMode) => void;
  readonly toggleTheme: () => void;
  readonly setPlaybackSpeedMs: (playbackSpeedMs: number) => void;
}

export const useUiPreferencesStore = create<UiPreferencesState>()(
  persist(
    (set) => ({
      theme: 'dark',
      playbackSpeedMs: 650,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setPlaybackSpeedMs: (playbackSpeedMs) => set({ playbackSpeedMs }),
    }),
    {
      name: 'av-ui-preferences',
      partialize: (state) => ({
        theme: state.theme,
        playbackSpeedMs: state.playbackSpeedMs,
      }),
    },
  ),
);
