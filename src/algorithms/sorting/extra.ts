import type { ArrayAlgorithmFrame, ArrayAlgorithmMeta, ArrayItem, SortComparisonRow } from '@/types';
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
  const algorithms = [
    simulateBubbleSort(baseValues),
    simulateSelectionSort(baseValues),
    simulateInsertionSort(baseValues),
    simulateMergeSort(baseValues),
    simulateCountingSort(baseValues),
    simulateQuickSort(baseValues),
  ];
  let step = 0;

  yield createFrame(
    step++,
    'initial',
    createArrayItems(baseValues),
    [],
    `Сравниваем 6 сортировок на одном наборе [${baseValues.join(', ')}]. Для каждой строки считаем сравнения, перестановки/записи и показываем итоговый массив; завершение будет только после всех шести алгоритмов.`,
  );

  const comparisonRows: SortComparisonRow[] = [];
  for (const result of algorithms) {
    comparisonRows.push(toComparisonRow(result));
    yield createFrame(
      step++,
      'inspect',
      createArrayItems(result.sorted),
      [],
      `${result.name}: ${result.explanation} Итог [${result.sorted.join(', ')}], сравнений ${result.comparisons}, записей/обменов ${result.writes}.`,
      { sortedIndices: result.sorted.map((_, index) => index), auxiliaryArray: [result.comparisons, result.writes], comparisonRows: [...comparisonRows] },
    );
  }

  const fastest = algorithms.reduce((best, current) => current.comparisons + current.writes < best.comparisons + best.writes ? current : best, algorithms[0]!);
  const finalRows = algorithms.map((result) => ({ ...toComparisonRow(result), isBest: result.name === fastest.name }));
  yield createFrame(
    step,
    'complete',
    createArrayItems(fastest.sorted),
    [],
    `Сравнение 6 сортировок завершено. На этом наборе меньше всего операций у «${fastest.name}»: сравнений ${fastest.comparisons}, записей/обменов ${fastest.writes}. Все алгоритмы дали одинаковый отсортированный результат [${fastest.sorted.join(', ')}].`,
    { sortedIndices: fastest.sorted.map((_, index) => index), comparisonRows: finalRows },
  );
}

const toComparisonRow = (result: SortSimulationResult): SortComparisonRow => ({
  name: result.name,
  idea: result.explanation,
  sortedValues: result.sorted,
  comparisons: result.comparisons,
  writes: result.writes,
});

interface SortSimulationResult {
  readonly name: string;
  readonly sorted: readonly number[];
  readonly comparisons: number;
  readonly writes: number;
  readonly explanation: string;
}

const simulateBubbleSort = (values: readonly number[]): SortSimulationResult => {
  const arr = [...values];
  let comparisons = 0;
  let writes = 0;
  for (let end = arr.length - 1; end > 0; end -= 1) {
    for (let i = 0; i < end; i += 1) {
      comparisons += 1;
      if (arr[i]! > arr[i + 1]!) {
        [arr[i], arr[i + 1]] = [arr[i + 1]!, arr[i]!];
        writes += 2;
      }
    }
  }
  return { name: 'Пузырьковая сортировка', sorted: arr, comparisons, writes, explanation: 'соседние элементы многократно сравниваются, большие значения всплывают вправо.' };
};

const simulateSelectionSort = (values: readonly number[]): SortSimulationResult => {
  const arr = [...values];
  let comparisons = 0;
  let writes = 0;
  for (let i = 0; i < arr.length - 1; i += 1) {
    let minIndex = i;
    for (let j = i + 1; j < arr.length; j += 1) {
      comparisons += 1;
      if (arr[j]! < arr[minIndex]!) minIndex = j;
    }
    if (minIndex !== i) {
      [arr[i], arr[minIndex]] = [arr[minIndex]!, arr[i]!];
      writes += 2;
    }
  }
  return { name: 'Сортировка выбором', sorted: arr, comparisons, writes, explanation: 'на каждом шаге ищется минимум оставшейся части и переносится в начало.' };
};

const simulateInsertionSort = (values: readonly number[]): SortSimulationResult => {
  const arr = [...values];
  let comparisons = 0;
  let writes = 0;
  for (let i = 1; i < arr.length; i += 1) {
    const key = arr[i]!;
    let j = i - 1;
    while (j >= 0) {
      comparisons += 1;
      if (arr[j]! <= key) break;
      arr[j + 1] = arr[j]!;
      writes += 1;
      j -= 1;
    }
    arr[j + 1] = key;
    writes += 1;
  }
  return { name: 'Сортировка вставками', sorted: arr, comparisons, writes, explanation: 'поддерживает слева отсортированную часть и вставляет очередной элемент на своё место.' };
};

const simulateMergeSort = (values: readonly number[]): SortSimulationResult => {
  let comparisons = 0;
  let writes = 0;
  const sort = (arr: readonly number[]): number[] => {
    if (arr.length <= 1) return [...arr];
    const mid = Math.floor(arr.length / 2);
    const left = sort(arr.slice(0, mid));
    const right = sort(arr.slice(mid));
    const merged: number[] = [];
    let i = 0;
    let j = 0;
    while (i < left.length && j < right.length) {
      comparisons += 1;
      if (left[i]! <= right[j]!) merged.push(left[i++]!); else merged.push(right[j++]!);
      writes += 1;
    }
    while (i < left.length) { merged.push(left[i++]!); writes += 1; }
    while (j < right.length) { merged.push(right[j++]!); writes += 1; }
    return merged;
  };
  return { name: 'Сортировка слиянием', sorted: sort(values), comparisons, writes, explanation: 'массив делится пополам, затем отсортированные половины устойчиво сливаются.' };
};

const simulateCountingSort = (values: readonly number[]): SortSimulationResult => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const count = Array.from({ length: max - min + 1 }, () => 0);
  let writes = 0;
  for (const value of values) count[value - min] = (count[value - min] ?? 0) + 1;
  const sorted: number[] = [];
  for (let i = 0; i < count.length; i += 1) {
    while (count[i]! > 0) {
      sorted.push(i + min);
      count[i] = (count[i] ?? 0) - 1;
      writes += 1;
    }
  }
  return { name: 'Сортировка подсчётом', sorted, comparisons: 0, writes, explanation: `не сравнивает элементы, а считает частоты значений в диапазоне от ${min} до ${max}.` };
};

const simulateQuickSort = (values: readonly number[]): SortSimulationResult => {
  let comparisons = 0;
  let writes = 0;
  const sort = (arr: readonly number[]): number[] => {
    if (arr.length <= 1) return [...arr];
    const pivot = arr[Math.floor(arr.length / 2)]!;
    const less: number[] = [];
    const equal: number[] = [];
    const greater: number[] = [];
    for (const value of arr) {
      comparisons += 1;
      if (value < pivot) less.push(value);
      else if (value > pivot) greater.push(value);
      else equal.push(value);
      writes += 1;
    }
    return [...sort(less), ...equal, ...sort(greater)];
  };
  return { name: 'Быстрая сортировка', sorted: sort(values), comparisons, writes, explanation: 'выбирает опорный элемент, разделяет значения на меньшие/равные/большие и рекурсивно сортирует части.' };
};
