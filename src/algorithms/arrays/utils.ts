import type { ArrayItem, ArraySnapshot } from '@/types';

export const createArrayItems = (values: readonly number[]): ArraySnapshot =>
  values.map((value, index): ArrayItem => ({
    id: `item-${index}-${value}`,
    value,
  }));

export const cloneArraySnapshot = (items: readonly ArrayItem[]): ArraySnapshot =>
  items.map((item) => ({ ...item }));

export const getArrayItemIds = (items: readonly ArrayItem[], indices: readonly number[]): readonly string[] =>
  indices
    .map((index) => items[index]?.id)
    .filter((id): id is string => id !== undefined);

export const getAllIndices = (items: readonly ArrayItem[]): readonly number[] =>
  items.map((_, index) => index);
