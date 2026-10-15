import { create } from 'zustand';

/** Текущий шаг открытой демонстрации — нужен окну «Поделиться», чтобы дать ссылку на этот шаг. */
interface DemoState {
  readonly index: number;
  readonly total: number;
}

export const useDemoStateStore = create<DemoState>(() => ({ index: 0, total: 0 }));
