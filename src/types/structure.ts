import type { AlgorithmFrame } from './algorithm';

export interface StructureCell {
  readonly id: string;
  readonly value: number | null;
}

export interface StructureSnapshot {
  readonly label: string;
  readonly cells: readonly StructureCell[];
}

export interface StructureAlgorithmMeta extends Record<string, unknown> {
  readonly operation: 'push' | 'pop' | 'enqueue' | 'dequeue' | 'index';
  readonly pointerIndex?: number;
  readonly activeIndex?: number;
  readonly pointers?: Readonly<Record<string, number>>;
  readonly tableSize?: number;
  readonly bucketIndex?: number;
  readonly blockSize?: number;
  readonly overflowStartIndex?: number;
}


export type StructureAlgorithmFrame = AlgorithmFrame<StructureSnapshot, StructureAlgorithmMeta>;
