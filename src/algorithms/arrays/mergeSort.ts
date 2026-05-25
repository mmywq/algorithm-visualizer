import type { ArrayAlgorithmFrame, ArrayAlgorithmMeta, ArrayItem } from '@/types';
import { cloneArraySnapshot, createArrayItems, getAllIndices, getArrayItemIds } from './utils';

const mergeSortPseudocode = {
  initial: 1,
  split: 2,
  recurseLeft: 3,
  recurseRight: 4,
  mergeStart: 5,
  compare: 6,
  write: 7,
  complete: 8,
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
  meta,
});

export function* mergeSort(values: readonly number[]): Generator<ArrayAlgorithmFrame, void, unknown> {
  const items = [...createArrayItems(values)];
  let step = 0;

  yield createFrame(
    step++,
    'initial',
    items,
    [],
    mergeSortPseudocode.initial,
    'Создаём рабочую копию массива перед запуском Merge Sort.',
    { auxiliaryArray: values },
  );

  yield* sortRange(items, 0, items.length - 1, () => step++);

  yield createFrame(
    step,
    'complete',
    items,
    [],
    mergeSortPseudocode.complete,
    'Merge Sort завершён: массив полностью отсортирован.',
    {
      auxiliaryArray: items.map((item) => item.value),
      sortedIndices: getAllIndices(items),
    },
  );
}

function* sortRange(
  items: ArrayItem[],
  left: number,
  right: number,
  nextStep: () => number,
): Generator<ArrayAlgorithmFrame, void, unknown> {
  if (left >= right) {
    return;
  }

  const middle = Math.floor((left + right) / 2);

  yield createFrame(
    nextStep(),
    'inspect',
    items,
    getRangeIndices(left, right),
    mergeSortPseudocode.split,
    `Делим диапазон [${left}, ${right}] на [${left}, ${middle}] и [${middle + 1}, ${right}].`,
    { auxiliaryArray: items.map((item) => item.value) },
  );

  yield createFrame(
    nextStep(),
    'inspect',
    items,
    getRangeIndices(left, middle),
    mergeSortPseudocode.recurseLeft,
    `Рекурсивно сортируем левую половину [${left}, ${middle}].`,
    { auxiliaryArray: items.map((item) => item.value) },
  );
  yield* sortRange(items, left, middle, nextStep);

  yield createFrame(
    nextStep(),
    'inspect',
    items,
    getRangeIndices(middle + 1, right),
    mergeSortPseudocode.recurseRight,
    `Рекурсивно сортируем правую половину [${middle + 1}, ${right}].`,
    { auxiliaryArray: items.map((item) => item.value) },
  );
  yield* sortRange(items, middle + 1, right, nextStep);

  yield* merge(items, left, middle, right, nextStep);
}

function* merge(
  items: ArrayItem[],
  left: number,
  middle: number,
  right: number,
  nextStep: () => number,
): Generator<ArrayAlgorithmFrame, void, unknown> {
  const leftPart = items.slice(left, middle + 1);
  const rightPart = items.slice(middle + 1, right + 1);
  let leftIndex = 0;
  let rightIndex = 0;
  let writeIndex = left;

  yield createFrame(
    nextStep(),
    'merge',
    items,
    getRangeIndices(left, right),
    mergeSortPseudocode.mergeStart,
    `Сливаем отсортированные диапазоны [${left}, ${middle}] и [${middle + 1}, ${right}].`,
    { auxiliaryArray: [...leftPart, ...rightPart].map((item) => item.value) },
  );

  while (leftIndex < leftPart.length && rightIndex < rightPart.length) {
    const leftCandidate = leftPart[leftIndex];
    const rightCandidate = rightPart[rightIndex];

    if (leftCandidate === undefined || rightCandidate === undefined) {
      return;
    }

    yield createFrame(
      nextStep(),
      'compare',
      items,
      [left + leftIndex, middle + 1 + rightIndex],
      mergeSortPseudocode.compare,
      `Сравниваем ${leftCandidate.value} и ${rightCandidate.value} для записи в позицию ${writeIndex}.`,
      {
        comparingIndices: [left + leftIndex, middle + 1 + rightIndex],
        auxiliaryArray: [...leftPart, ...rightPart].map((item) => item.value),
      },
    );

    if (leftCandidate.value <= rightCandidate.value) {
      items[writeIndex] = leftCandidate;
      leftIndex += 1;
    } else {
      items[writeIndex] = rightCandidate;
      rightIndex += 1;
    }

    yield createFrame(
      nextStep(),
      'merge',
      items,
      [writeIndex],
      mergeSortPseudocode.write,
      `Записываем минимальный доступный элемент в позицию ${writeIndex}.`,
      { auxiliaryArray: items.slice(left, right + 1).map((item) => item.value) },
    );

    writeIndex += 1;
  }

  while (leftIndex < leftPart.length) {
    const nextItem = leftPart[leftIndex];

    if (nextItem === undefined) {
      return;
    }

    items[writeIndex] = nextItem;
    yield createFrame(
      nextStep(),
      'merge',
      items,
      [writeIndex],
      mergeSortPseudocode.write,
      `Дописываем оставшийся элемент ${nextItem.value} из левой половины.`,
      { auxiliaryArray: items.slice(left, right + 1).map((item) => item.value) },
    );
    leftIndex += 1;
    writeIndex += 1;
  }

  while (rightIndex < rightPart.length) {
    const nextItem = rightPart[rightIndex];

    if (nextItem === undefined) {
      return;
    }

    items[writeIndex] = nextItem;
    yield createFrame(
      nextStep(),
      'merge',
      items,
      [writeIndex],
      mergeSortPseudocode.write,
      `Дописываем оставшийся элемент ${nextItem.value} из правой половины.`,
      { auxiliaryArray: items.slice(left, right + 1).map((item) => item.value) },
    );
    rightIndex += 1;
    writeIndex += 1;
  }
}

const getRangeIndices = (left: number, right: number): readonly number[] => {
  if (right < left) {
    return [];
  }

  return Array.from({ length: right - left + 1 }, (_, offset) => left + offset);
};
