import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ConsentChoice = 'all' | 'necessary';

interface ConsentState {
  readonly choice: ConsentChoice | null;
  readonly decidedAt: string | null;
  readonly decide: (choice: ConsentChoice) => void;
  readonly reopen: () => void;
}

/**
 * Согласие на cookie. Необходимые данные (прогресс, настройки, вход) хранятся всегда;
 * необязательные (аналитика) разрешаются только при выборе «Принять все».
 */
export const useConsentStore = create<ConsentState>()(
  persist(
    (set) => ({
      choice: null,
      decidedAt: null,
      decide: (choice) => set({ choice, decidedAt: new Date().toISOString() }),
      reopen: () => set({ choice: null }),
    }),
    { name: 'algoscope:consent', version: 1 },
  ),
);

export const hasAnalyticsConsent = (): boolean => useConsentStore.getState().choice === 'all';
