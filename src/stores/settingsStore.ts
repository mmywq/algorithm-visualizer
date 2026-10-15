import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemePreference = 'light' | 'dark' | 'system';
export type MotionPreference = 'system' | 'reduce' | 'full';

export const SPEED_OPTIONS = [0.25, 0.5, 1, 1.5, 2, 3] as const;
export type Speed = (typeof SPEED_OPTIONS)[number];

interface SettingsState {
  readonly theme: ThemePreference;
  readonly motion: MotionPreference;
  readonly speed: Speed;
  readonly sound: boolean;
  readonly autoTheory: boolean;
  /** Кэш гуляет по низу экрана */
  readonly catWalks: boolean;
  readonly setTheme: (theme: ThemePreference) => void;
  readonly setMotion: (motion: MotionPreference) => void;
  readonly setSpeed: (speed: Speed) => void;
  readonly setSound: (sound: boolean) => void;
  readonly setCatWalks: (catWalks: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      motion: 'system',
      speed: 1,
      sound: false,
      autoTheory: false,
      catWalks: true,
      setTheme: (theme) => set({ theme }),
      setMotion: (motion) => set({ motion }),
      setSpeed: (speed) => set({ speed }),
      setSound: (sound) => set({ sound }),
      setCatWalks: (catWalks) => set({ catWalks }),
    }),
    { name: 'algoscope:settings', version: 2, migrate: (persisted) => ({ ...(persisted as object), theme: 'dark' }) as SettingsState },
  ),
);

export const resolveTheme = (preference: ThemePreference): 'light' | 'dark' => {
  if (preference !== 'system') return preference;
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};
