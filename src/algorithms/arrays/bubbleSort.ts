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
  let comparisons = 0;
  let swaps = 0;

  yield createFrame(
    step++,
    'initial',
    items,
    [],
    bubbleSortPseudocode.initial,
    `Создаётся рабочая копия массива [${values.join(', ')}]. Пузырьковая сортировка будет многократно проходить по массиву, сравнивая соседние элементы.`,
    { sortedIndices: [] },
  );

  if (isSorted(items)) {
    yield createFrame(
      step++,
      'complete',
      items,
      [],
      bubbleSortPseudocode.complete,
      `Входной массив уже упорядочен, обмены не требуются. Итоговый массив: [${items.map((item) => item.value).join(', ')}]. Выполнено сравнений: 0, обменов: 0.`,
      { sortedIndices: getAllIndices(items) },
    );
    return;
  }

  for (let end = items.length - 1; end > 0; end -= 1) {
    let swapped = false;
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
      comparisons += 1;

      yield createFrame(
        step++,
        'compare',
        items,
        [current, next],
        bubbleSortPseudocode.compare,
        `Сравниваются соседние элементы: ${items[current]!.value} (позиция ${current}) и ${items[next]!.value} (позиция ${next}).`,
        {
          comparingIndices: [current, next],
          sortedIndices: getSortedSuffixIndices(items, end),
        },
      );

      if (items[current]!.value > items[next]!.value) {
        const currentItem = items[current]!;
        items[current] = items[next]!;
        items[next] = currentItem;

        swapped = true;
        swaps += 1;

        yield createFrame(
          step++,
          'swap',
          items,
          [current, next],
          bubbleSortPseudocode.swap,
          `${items[next]!.value} > ${items[current]!.value}, поэтому элементы меняются местами. Большее значение смещается к концу массива.`,
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

    if (!swapped || isSorted(items)) {
      yield createFrame(
        step++,
        'complete',
        items,
        [],
        bubbleSortPseudocode.complete,
        `Проход не потребовал обменов — массив упорядочен, алгоритм останавливается досрочно. Итоговый массив: [${items.map((item) => item.value).join(', ')}]. Выполнено сравнений: ${comparisons}, обменов: ${swaps}.`,
        { sortedIndices: getAllIndices(items) },
      );
      return;
    }
  }

  yield createFrame(
    step,
    'complete',
    items,
    [],
    bubbleSortPseudocode.complete,
    `Пузырьковая сортировка завершена. Итоговый массив: [${items.map((item) => item.value).join(', ')}]. Выполнено сравнений: ${comparisons}, обменов: ${swaps}.`,
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


const isSorted = (items: readonly ArrayItem[]): boolean => items.every((item, index) => index === 0 || items[index - 1]!.value <= item.value);
