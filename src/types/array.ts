import type { AlgorithmFrame } from './algorithm';

export type ArrayItemId = string;

export interface ArrayItem {
  readonly id: ArrayItemId;
  readonly value: number;
}

export type ArraySnapshot = readonly ArrayItem[];

export interface ArrayAlgorithmMeta extends Record<string, unknown> {
  readonly comparingIndices?: readonly [number, number];
  readonly swappingIndices?: readonly [number, number];
  readonly sortedIndices?: readonly number[];
  readonly auxiliaryArray?: readonly number[];
}

export type ArrayAlgorithmFrame = AlgorithmFrame<ArraySnapshot, ArrayAlgorithmMeta>;

export interface ArrayPreset {
  readonly id: string;
  readonly name: string;
  readonly values: readonly number[];
  readonly createdAt: string;
  readonly updatedAt: string;
}
