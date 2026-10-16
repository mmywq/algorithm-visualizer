import type { AlgorithmFrame } from './algorithm';

export interface StructureCell {
  readonly id: string;
  readonly value: number | null;
}

export interface StructureBucket {
  readonly id: string;
  readonly index: number;
  readonly values: readonly number[];
}

export interface StructureSnapshot {
  readonly label: string;
  readonly cells: readonly StructureCell[];
  readonly buckets?: readonly StructureBucket[];
}

export interface StructureAlgorithmMeta extends Record<string, unknown> {
  readonly operation: 'push' | 'pop' | 'enqueue' | 'dequeue' | 'index';
  readonly pointerIndex?: number;
  readonly activeIndex?: number;
  readonly pointers?: Readonly<Record<string, number>>;
  readonly bucketIndex?: number;
  readonly key?: number;
  /** итог операции: miss — ключа нет или вставить некуда (на итоговом кадре Кэш грустит) */
  readonly outcome?: 'hit' | 'miss';
}

export type StructureAlgorithmFrame = AlgorithmFrame<StructureSnapshot, StructureAlgorithmMeta>;
