import type { ArrayAlgorithmFrame, ArrayAlgorithmMeta, ArrayItem, ArraySnapshot } from '@/types';
import { cloneArraySnapshot, createArrayItems, getAllIndices, getArrayItemIds } from './utils';

const bubbleSortPseudocode = {
  initial: 1,
  outerLoop: 2,
  compare: 4,
  swap: 5,
  sortedSuffix: 6,
  complete: 7,
} as const;

const createFrame = (
  step: number,
  phase: ArrayAlgorithmFrame['phase'],
  items: readonly ArrayItem[],
  activeIndices: readonly number[],
  pseudocodeLine: number,
  message: string,
  meta: ArrayAlgorithmMeta = {},
): ArrayAlgorithmFrame => ({
  step,
  domain: 'array',
  phase,
  status: phase === 'complete' ? 'completed' : 'running',
  data: cloneArraySnapshot(items),
  activeIds: getArrayItemIds(items, activeIndices),
  pseudocode: { line: pseudocodeLine },
  message,
  description: message,
  meta,
});

export function* bubbleSort(values: readonly number[]): Generator<ArrayAlgorithmFrame, void, unknown> {
  const items = [...createArrayItems(values)];
  let step = 0;

  yield createFrame(
    step++,
    'initial',
    items,
    [],
    bubbleSortPseudocode.initial,
    'Создаём рабочую копию массива перед запуском Bubble Sort.',
    { sortedIndices: [] },
  );

  for (let end = items.length - 1; end > 0; end -= 1) {
    yield createFrame(
      step++,
      'inspect',
      items,
      [end],
      bubbleSortPseudocode.outerLoop,
      `Начинаем проход до индекса ${end}. Правая часть массива уже отсортирована.`,
      { sortedIndices: getSortedSuffixIndices(items, end) },
    );

    for (let current = 0; current < end; current += 1) {
      const next = current + 1;

      yield createFrame(
        step++,
        'compare',
        items,
        [current, next],
        bubbleSortPseudocode.compare,
        `Сравниваем элементы ${items[current]!.value} и ${items[next]!.value}.`,
        {
          comparingIndices: [current, next],
          sortedIndices: getSortedSuffixIndices(items, end),
        },
      );

      if (items[current]!.value > items[next]!.value) {
        const currentItem = items[current]!;
        items[current] = items[next]!;
        items[next] = currentItem;

        yield createFrame(
          step++,
          'swap',
          items,
          [current, next],
          bubbleSortPseudocode.swap,
          'Меняем элементы местами, потому что левый элемент больше правого.',
          {
            swappingIndices: [current, next],
            sortedIndices: getSortedSuffixIndices(items, end),
          },
        );
      }
    }

    yield createFrame(
      step++,
      'inspect',
      items,
      [end],
      bubbleSortPseudocode.sortedSuffix,
      `Элемент на позиции ${end} занял окончательное место.`,
      { sortedIndices: getSortedSuffixIndices(items, end - 1) },
    );
  }

  yield createFrame(
    step,
    'complete',
    items,
    [],
    bubbleSortPseudocode.complete,
    'Bubble Sort завершён: массив полностью отсортирован.',
    { sortedIndices: getAllIndices(items) },
  );
}

const getSortedSuffixIndices = (items: ArraySnapshot, currentEnd: number): readonly number[] => {
  if (items.length === 0) {
    return [];
  }

  return items
    .map((_, index) => index)
    .filter((index) => index > currentEnd);
};
