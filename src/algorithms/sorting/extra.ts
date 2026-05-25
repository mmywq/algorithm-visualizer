import type { ArrayAlgorithmFrame, ArrayAlgorithmMeta, ArrayItem } from '@/types';
import { cloneArraySnapshot, createArrayItems, getArrayItemIds } from '@/algorithms/arrays/utils';

const createFrame = (
  step: number,
  phase: ArrayAlgorithmFrame['phase'],
  items: readonly ArrayItem[],
  activeIndices: readonly number[],
  message: string,
  meta: ArrayAlgorithmMeta = {},
): ArrayAlgorithmFrame => ({
  step,
  domain: 'array',
  phase,
  status: phase === 'complete' ? 'completed' : 'running',
  data: cloneArraySnapshot(items),
  activeIds: getArrayItemIds(items, activeIndices),
  pseudocode: { line: step + 1 },
  message,
  meta,
});

export function* countingSortDemo(): Generator<ArrayAlgorithmFrame, void, unknown> {
  const items = [...createArrayItems([4, 1, 3, 4, 2, 1])];
  const max = Math.max(...items.map((i) => i.value));
  const count = Array.from({ length: max + 1 }, () => 0);
  let step = 0;

  for (let i = 0; i < items.length; i += 1) {
    count[items[i]!.value] += 1;
    yield createFrame(step++, 'inspect', items, [i], `count[${items[i]!.value}]++`, { auxiliaryArray: [...count] });
  }

  let write = 0;
  for (let value = 0; value < count.length; value += 1) {
    while (count[value]! > 0) {
      items[write] = { ...items[write]!, value };
      count[value] -= 1;
      yield createFrame(step++, 'merge', items, [write], `Записываем значение ${value}.`, {
        auxiliaryArray: [...count],
        sortedIndices: Array.from({ length: write + 1 }, (_, idx) => idx),
      });
      write += 1;
    }
  }

  yield createFrame(step, 'complete', items, [], 'Counting Sort завершён.', {
    sortedIndices: items.map((_, idx) => idx),
  });
}

export function* radixSortDemo(): Generator<ArrayAlgorithmFrame, void, unknown> {
  const items = [...createArrayItems([329, 457, 657, 839, 436, 720, 355])];
  let step = 0;
  let exp = 1;
  const max = Math.max(...items.map((i) => i.value));

  while (Math.floor(max / exp) > 0) {
    const buckets: Array<ArrayItem[]> = Array.from({ length: 10 }, () => []);

    for (let i = 0; i < items.length; i += 1) {
      const digit = Math.floor(items[i]!.value / exp) % 10;
      buckets[digit]!.push(items[i]!);
      yield createFrame(step++, 'inspect', items, [i], `Разряд ${exp}: кладём ${items[i]!.value} в bucket ${digit}.`);
    }

    let index = 0;
    for (const bucket of buckets) {
      for (const value of bucket) {
        items[index] = value;
        yield createFrame(step++, 'merge', items, [index], `Собираем обратно после разряда ${exp}.`);
        index += 1;
      }
    }

    exp *= 10;
  }

  yield createFrame(step, 'complete', items, [], 'Radix Sort завершён.', {
    sortedIndices: items.map((_, idx) => idx),
  });
}

export function* blockSortDemo(): Generator<ArrayAlgorithmFrame, void, unknown> {
  const items = [...createArrayItems([12, 5, 19, 3, 8, 14, 7, 1])];
  const blockSize = 2;
  let step = 0;

  for (let blockStart = 0; blockStart < items.length; blockStart += blockSize) {
    const block = items.slice(blockStart, blockStart + blockSize).sort((a, b) => a.value - b.value);
    for (let i = 0; i < block.length; i += 1) {
      items[blockStart + i] = block[i]!;
    }
    yield createFrame(step++, 'inspect', items, [blockStart], `Локально сортируем блок [${blockStart}..${blockStart + blockSize - 1}].`);
  }

  const sorted = [...items].sort((a, b) => a.value - b.value);
  for (let i = 0; i < sorted.length; i += 1) {
    items[i] = sorted[i]!;
    yield createFrame(step++, 'merge', items, [i], 'Глобальное слияние блоков.', {
      sortedIndices: Array.from({ length: i + 1 }, (_, idx) => idx),
    });
  }

  yield createFrame(step, 'complete', items, [], 'Block Sort завершён.', {
    sortedIndices: items.map((_, idx) => idx),
  });
}

export function* compareSortsDemo(): Generator<ArrayAlgorithmFrame, void, unknown> {
  const items = [...createArrayItems([9, 1, 7, 3, 6, 2])];
  let step = 0;
  const comparisons = [
    'Bubble: O(n²), stable',
    'Selection: O(n²), unstable',
    'Insertion: O(n²), stable',
    'Merge: O(n log n), stable',
    'Quick: O(n log n) avg, unstable',
    'Heap: O(n log n), unstable',
  ];

  for (let i = 0; i < comparisons.length; i += 1) {
    yield createFrame(step++, 'inspect', items, [i % items.length], `Сравнение: ${comparisons[i]}`);
  }

  yield createFrame(step, 'complete', items, [], 'Сравнение 6 сортировок завершено.');
}
