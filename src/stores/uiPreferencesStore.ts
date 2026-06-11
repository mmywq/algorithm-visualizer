import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeName = 'dark' | 'dark-emerald' | 'dark-graphite' | 'light' | 'light-warm' | 'light-blue';

export const themeOptions: readonly { readonly value: ThemeName; readonly label: string }[] = [
  { value: 'dark', label: 'Тёмная синяя' },
  { value: 'dark-emerald', label: 'Тёмная изумрудная' },
  { value: 'dark-graphite', label: 'Тёмная графитовая' },
  { value: 'light', label: 'Светлая' },
  { value: 'light-warm', label: 'Светлая тёплая' },
  { value: 'light-blue', label: 'Светлая голубая' },
];

const isThemeName = (value: unknown): value is ThemeName =>
  themeOptions.some((option) => option.value === value);

interface UiPreferencesState {
  readonly theme: ThemeName;
  readonly playbackSpeedMs: number;
  readonly setTheme: (theme: ThemeName) => void;
  readonly setPlaybackSpeedMs: (playbackSpeedMs: number) => void;
}

export const useUiPreferencesStore = create<UiPreferencesState>()(
  persist(
    (set) => ({
      theme: 'dark',
      playbackSpeedMs: 650,
      setTheme: (theme) => set({ theme: isThemeName(theme) ? theme : 'dark' }),
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
