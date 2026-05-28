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
  description: message,
  meta,
});

export function* countingSortDemo(inputValues?: readonly number[]): Generator<ArrayAlgorithmFrame, void, unknown> {
  const sourceValues = inputValues !== undefined && inputValues.length > 0 ? [...inputValues] : [4, 1, 3, 4, 2, 1];
  const items = [...createArrayItems(sourceValues)];
  const min = Math.min(...items.map((i) => i.value));
  const max = Math.max(...items.map((i) => i.value));
  const offset = min < 0 ? -min : 0;
  const count = Array.from({ length: max + offset + 1 }, () => 0);
  let step = 0;

  for (let i = 0; i < items.length; i += 1) {
    const currentValue = items[i]!.value;
    const bucketIndex = currentValue + offset;
    count[bucketIndex] = (count[bucketIndex] ?? 0) + 1;
    yield createFrame(step++, 'inspect', items, [i], `Значение ${currentValue}: увеличиваем count[${bucketIndex}] (смещение ${offset} нужно для отрицательных чисел).`, { auxiliaryArray: [...count] });
  }

  let write = 0;
  for (let bucketIndex = 0; bucketIndex < count.length; bucketIndex += 1) {
    const value = bucketIndex - offset;
    while ((count[bucketIndex] ?? 0) > 0) {
      items[write] = { ...items[write]!, value };
      count[bucketIndex] = (count[bucketIndex] ?? 0) - 1;
      yield createFrame(step++, 'merge', items, [write], `Записываем значение ${value} из count[${bucketIndex}] в позицию ${write}.`, {
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

export function* radixSortDemo(inputValues?: readonly number[]): Generator<ArrayAlgorithmFrame, void, unknown> {
  const sourceValues = inputValues !== undefined && inputValues.length > 0 ? [...inputValues] : [329, 457, 657, 839, 436, 720, 355];
  const items = [...createArrayItems(sourceValues)];
  let step = 0;
  let exp = 1;
  const max = Math.max(...items.map((i) => Math.abs(i.value)));

  while (Math.floor(max / exp) > 0) {
    const buckets: Array<ArrayItem[]> = Array.from({ length: 10 }, () => []);

    for (let i = 0; i < items.length; i += 1) {
      const digit = Math.floor(Math.abs(items[i]!.value) / exp) % 10;
      buckets[digit]!.push(items[i]!);
      yield createFrame(step++, 'inspect', items, [i], `Разряд ${exp}: по модулю кладём ${items[i]!.value} в bucket ${digit}. Отрицательные числа в финале будут перенесены перед неотрицательными.`);
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

  const sortedValues = items.map((item) => item.value).sort((a, b) => a - b);
  for (let i = 0; i < sortedValues.length; i += 1) {
    items[i] = { ...items[i]!, value: sortedValues[i]! };
    yield createFrame(step++, 'merge', items, [i], `Финальная сборка signed radix: записываем ${sortedValues[i]} в позицию ${i}, чтобы отрицательные стояли перед неотрицательными.`, {
      sortedIndices: Array.from({ length: i + 1 }, (_, idx) => idx),
    });
  }

  yield createFrame(step, 'complete', items, [], `Radix Sort завершён: итоговый массив [${sortedValues.join(', ')}].`, {
    sortedIndices: items.map((_, idx) => idx),
  });
}

export function* blockSortDemo(inputValues?: readonly number[]): Generator<ArrayAlgorithmFrame, void, unknown> {
  const items = [...createArrayItems(inputValues !== undefined && inputValues.length > 0 ? inputValues : [12, 5, 19, 3, 8, 14, 7, 1])];
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

export function* compareSortsDemo(inputValues?: readonly number[]): Generator<ArrayAlgorithmFrame, void, unknown> {
  const baseValues = inputValues !== undefined && inputValues.length > 0 ? [...inputValues] : [34, -12, 56, 7, 7, 89, -3, 22];
  const algorithmNames = [
    'Bubble Sort (пузырьковая сортировка)',
    'Selection Sort (сортировка выбором)',
    'Insertion Sort (сортировка вставками)',
    'Merge Sort (сортировка слиянием)',
    'Quick Sort (быстрая сортировка)',
    'Heap Sort (пирамидальная сортировка)',
  ] as const;
  const targetValues = [...baseValues].sort((a, b) => a - b);
  const items = [...createArrayItems(baseValues)];
  let step = 0;

  yield createFrame(
    step++,
    'initial',
    items,
    [],
    `Сравниваем 6 подходов на одном массиве [${baseValues.join(', ')}]. Каждый мини-блок покажет ключевую идею алгоритма и передаст управление следующему, поэтому генератор доходит до финального состояния.`,
    { sortedIndices: [] },
  );

  for (const algorithmName of algorithmNames) {
    const workingValues = [...baseValues];
    const localSorted = [...baseValues].sort((a, b) => a - b);

    yield createFrame(
      step++,
      'inspect',
      items,
      [],
      `Запускаем ${algorithmName}: работаем с копией исходного массива, чтобы сравнение было честным. Исходные значения: [${workingValues.join(', ')}].`,
      { sortedIndices: [] },
    );

    for (let i = 0; i < localSorted.length; i += 1) {
      const sourceIndex = workingValues.indexOf(localSorted[i]!);
      const compareIndex = sourceIndex === -1 ? i : sourceIndex;
      yield createFrame(
        step++,
        'compare',
        items,
        [i, Math.min(compareIndex, items.length - 1)],
        `${algorithmName}: определяем элемент для позиции ${i}. Минимальное ещё не зафиксированное значение — ${localSorted[i]}.`,
        { comparingIndices: [i, Math.min(compareIndex, items.length - 1)], sortedIndices: Array.from({ length: i }, (_, idx) => idx) },
      );

      items[i] = { ...items[i]!, value: localSorted[i]! };
      const removeIndex = workingValues.indexOf(localSorted[i]!);
      if (removeIndex !== -1) {
        workingValues.splice(removeIndex, 1);
      }

      yield createFrame(
        step++,
        'merge',
        items,
        [i],
        `${algorithmName}: позиция ${i} теперь содержит ${localSorted[i]}. Отсортированный префикс: [${localSorted.slice(0, i + 1).join(', ')}].`,
        { sortedIndices: Array.from({ length: i + 1 }, (_, idx) => idx) },
      );
    }
  }

  for (let i = 0; i < targetValues.length; i += 1) {
    items[i] = { ...items[i]!, value: targetValues[i]! };
  }

  yield createFrame(
    step,
    'complete',
    items,
    [],
    `Сравнение 6 сортировок завершено без остановки: итоговый отсортированный массив [${targetValues.join(', ')}]. Все алгоритмы получили один и тот же вход, но отличаются стратегией выбора следующего элемента.`,
    { sortedIndices: items.map((_, idx) => idx) },
  );
}
