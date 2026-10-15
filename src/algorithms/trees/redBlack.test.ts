import { describe, expect, it } from 'vitest';
import { inorderValues, treeHeight } from './treeFrames';
import { blackHeight, buildRedBlack, noRedRed } from './redBlack';

const check = (values: readonly number[]) => {
  const root = buildRedBlack(values);
  expect(root?.color ?? 'black').toBe('black');
  expect(noRedRed(root)).toBe(true);
  expect(blackHeight(root)).toBeGreaterThan(0);
  expect(inorderValues(root)).toEqual([...values].sort((a, b) => a - b));
  expect(treeHeight(root)).toBeLessThanOrEqual(2 * Math.log2(values.length + 1) + 1e-9);
};

describe('красно-чёрное дерево', () => {
  it('сохраняет свойства на возрастающей и убывающей последовательностях', () => {
    check([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    check([12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  });

  it('сохраняет свойства после каждой вставки случайной последовательности', () => {
    let seed = 11;
    const random = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
    for (let round = 0; round < 40; round += 1) {
      const values = [...new Set(Array.from({ length: 12 }, () => Math.floor(random() * 99)))];
      for (let n = 1; n <= values.length; n += 1) check(values.slice(0, n));
    }
  });

  it('пустое дерево и один ключ', () => {
    expect(buildRedBlack([])).toBeNull();
    check([42]);
  });
});
