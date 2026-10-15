import { describe, expect, it } from 'vitest';
import type { ArrayAlgorithmFrame } from '@/types';
import { binarySearch, interpolationSearch, jumpSearch, linearSearch, searchBounds } from './searching';

type Search = (values: readonly number[], key: number) => Generator<ArrayAlgorithmFrame, void, unknown>;

const run = (search: Search, values: readonly number[], key: number) => {
  const frames = [...search(values, key)];
  const last = frames.at(-1)!;
  return {
    frames,
    last,
    found: last.meta.foundIndex,
    comparisons: frames.filter((frame) => frame.phase === 'compare').length,
  };
};

const sorted = [3, 8, 12, 17, 23, 31, 38, 45, 52, 60, 67, 74, 81, 90];
const searches: Record<string, Search> = { linearSearch, binarySearch, interpolationSearch, jumpSearch };

describe.each(Object.entries(searches))('%s', (_name, search) => {
  it('находит каждый элемент упорядоченного массива', () => {
    sorted.forEach((value, index) => {
      const result = run(search, sorted, value);
      expect(result.last.phase).toBe('complete');
      expect(result.last.meta.outcome).toBe('hit');
      expect(result.found).toBe(index);
    });
  });

  it('сообщает об отсутствии ключа — слева, справа и в промежутке', () => {
    for (const key of [-5, 1, 10, 50, 91, 200]) {
      const result = run(search, sorted, key);
      expect(result.last.meta.outcome).toBe('miss');
      expect(result.found).toBeUndefined();
    }
  });

  it('работает на массиве из одного элемента и на одинаковых значениях', () => {
    expect(run(search, [7], 7).found).toBe(0);
    expect(run(search, [7], 3).last.meta.outcome).toBe('miss');
    const same = run(search, [5, 5, 5, 5], 5);
    expect(same.last.meta.outcome).toBe('hit');
    expect(same.frames.at(-1)!.data[same.found!]!.value).toBe(5);
  });

  it('счётчик сравнений в кадрах совпадает с числом шагов-сравнений', () => {
    const result = run(search, sorted, 60);
    expect((result.last.meta.counters as { comparisons: number }).comparisons).toBe(result.comparisons);
  });
});

describe('оценки числа сравнений', () => {
  it('бинарный поиск не превышает ⌈log₂(n + 1)⌉ на всех ключах', () => {
    for (let n = 1; n <= 16; n += 1) {
      const values = Array.from({ length: n }, (_, index) => index * 3);
      for (let key = -1; key <= n * 3; key += 1) {
        expect(run(binarySearch, values, key).comparisons).toBeLessThanOrEqual(searchBounds.binary(n));
      }
    }
  });

  it('поиск прыжками не превышает ⌈n / m⌉ + m − 1', () => {
    for (let n = 1; n <= 16; n += 1) {
      const values = Array.from({ length: n }, (_, index) => index * 2);
      for (let key = -1; key <= n * 2; key += 1) {
        expect(run(jumpSearch, values, key).comparisons).toBeLessThanOrEqual(searchBounds.jump(n));
      }
    }
  });

  it('линейный поиск не требует упорядоченности', () => {
    expect(run(linearSearch, [42, 18, 64, 9], 9).found).toBe(3);
  });

  it('упорядоченные поиски сортируют вход сами', () => {
    const result = run(binarySearch, [9, 1, 5], 5);
    expect(result.last.data.map((item) => item.value)).toEqual([1, 5, 9]);
    expect(result.found).toBe(1);
  });
});
