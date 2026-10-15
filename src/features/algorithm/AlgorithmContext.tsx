import { createContext, useContext } from 'react';
import type { AlgorithmEntry } from '@/content/catalog';

export type AlgorithmTab = 'demo' | 'theory' | 'quiz';

export interface AlgorithmContextValue {
  readonly entry: AlgorithmEntry;
  readonly embed: boolean;
  readonly setTab: (tab: AlgorithmTab) => void;
}

export const AlgorithmContext = createContext<AlgorithmContextValue | null>(null);

export function useAlgorithm(): AlgorithmContextValue {
  const value = useContext(AlgorithmContext);
  if (value === null) throw new Error('useAlgorithm используется вне страницы алгоритма');
  return value;
}

export function useOptionalAlgorithm(): AlgorithmContextValue | null {
  return useContext(AlgorithmContext);
}
