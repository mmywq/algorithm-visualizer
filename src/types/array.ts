import type { AlgorithmFrame } from './algorithm';

export type ArrayItemId = string;

export interface ArrayItem {
  readonly id: ArrayItemId;
  readonly value: number;
}

export type ArraySnapshot = readonly ArrayItem[];

export interface SortComparisonRow {
  readonly name: string;
  readonly idea: string;
  readonly sortedValues: readonly number[];
  readonly comparisons: number;
  readonly writes: number;
  readonly isBest?: boolean;
}

export interface ArrayAlgorithmMeta extends Record<string, unknown> {
  readonly comparingIndices?: readonly [number, number];
  readonly swappingIndices?: readonly [number, number];
  readonly sortedIndices?: readonly number[];
  readonly auxiliaryArray?: readonly number[];
  readonly comparisonRows?: readonly SortComparisonRow[];
  readonly comparisonInsights?: readonly string[];
  /** опорный элемент (быстрая сортировка) или текущий ключ (вставки) */
  readonly pivotIndex?: number;
  /** рабочий отрезок; элементы вне него приглушаются */
  readonly range?: readonly [number, number];
  /** подписи указателей под столбиками: { i: 2, j: 5 } */
  readonly pointers?: Readonly<Record<string, number>>;
  /** отброшенные элементы (поиск): рисуются бледно */
  readonly discardedIndices?: readonly number[];
  /** найденный элемент */
  readonly foundIndex?: number;
  /** элемент, который сейчас проверяет поиск */
  readonly probeIndex?: number;
  /** искомое значение: рисуется пунктирной линией поперёк столбиков */
  readonly targetValue?: number;
  /** итог поиска: miss — ключа нет, кот расстраивается */
  readonly outcome?: 'hit' | 'miss';
  readonly auxiliaryLabel?: string;
  /** размер кучи в пирамидальной сортировке: элементы правее уже отсортированы */
  readonly heapSize?: number;
  readonly counters?: Readonly<Record<string, number>>;
}

export type ArrayAlgorithmFrame = AlgorithmFrame<ArraySnapshot, ArrayAlgorithmMeta>;

export interface ArrayPreset {
  readonly id: string;
  readonly name: string;
  readonly values: readonly number[];
  readonly createdAt: string;
  readonly updatedAt: string;
}
