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
  const runs = createSortComparisonRuns(baseValues);
  let step = 0;

  yield createFrame(
    step++,
    'initial',
    createArrayItems(baseValues),
    [],
    `Сравниваем 6 сортировок на одном исходном наборе [${baseValues.join(', ')}]. Каждый алгоритм будет запускаться заново именно с этих значений, поэтому результат предыдущей сортировки не влияет на следующую.`,
  );

  const comparisonRows: SortComparisonRow[] = [];
  for (const run of runs) {
    yield createFrame(
      step++,
      'initial',
      createArrayItems(baseValues),
      [],
      `${run.name}: начинаем с исходного массива [${baseValues.join(', ')}], а не с результата предыдущего алгоритма. ${run.explanation}`,
      { comparisonRows: [...comparisonRows] },
    );

    for (const animationStep of run.animationSteps) {
      yield createFrame(
        step++,
        animationStep.phase,
        createArrayItems(animationStep.values),
        animationStep.activeIndices,
        `${run.name}: ${animationStep.message}`,
        {
          ...(animationStep.comparingIndices === undefined ? {} : { comparingIndices: animationStep.comparingIndices }),
          ...(animationStep.swappingIndices === undefined ? {} : { swappingIndices: animationStep.swappingIndices }),
          ...(animationStep.sortedIndices === undefined ? {} : { sortedIndices: animationStep.sortedIndices }),
          ...(animationStep.auxiliaryArray === undefined ? {} : { auxiliaryArray: animationStep.auxiliaryArray }),
          comparisonRows: [...comparisonRows],
        },
      );
    }

    comparisonRows.push(toComparisonRow(run));
    yield createFrame(
      step++,
      'complete',
      createArrayItems(run.sorted),
      [],
      `${run.name} завершена. Из исходного массива [${baseValues.join(', ')}] получен результат [${run.sorted.join(', ')}]. Сравнений: ${run.comparisons}, записей/обменов: ${run.writes}.`,
      { sortedIndices: run.sorted.map((_, index) => index), comparisonRows: [...comparisonRows] },
    );
  }

  const bestByOperations = runs.reduce((best, current) => current.comparisons + current.writes < best.comparisons + best.writes ? current : best, runs[0]!);
  const finalRows = runs.map((result) => ({ ...toComparisonRow(result), isBest: result.name === bestByOperations.name }));
  yield createFrame(
    step,
    'complete',
    createArrayItems(bestByOperations.sorted),
    [],
    `Сравнение 6 сортировок завершено. Все алгоритмы стартовали с [${baseValues.join(', ')}] и дали одинаковый отсортированный результат [${bestByOperations.sorted.join(', ')}]. На этом наборе меньше всего измеренных операций у «${bestByOperations.name}»: сравнений ${bestByOperations.comparisons}, записей/обменов ${bestByOperations.writes}. Это учебная оценка по числу операций для данного набора, а не абсолютная скорость на любом компьютере.`,
    { sortedIndices: bestByOperations.sorted.map((_, index) => index), comparisonRows: finalRows },
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
  readonly animationSteps: readonly SortAnimationStep[];
}

interface SortAnimationStep {
  readonly values: readonly number[];
  readonly phase: ArrayAlgorithmFrame['phase'];
  readonly activeIndices: readonly number[];
  readonly message: string;
  readonly comparingIndices?: readonly [number, number];
  readonly swappingIndices?: readonly [number, number];
  readonly sortedIndices?: readonly number[];
  readonly auxiliaryArray?: readonly number[];
}

const createSortComparisonRuns = (values: readonly number[]): readonly SortSimulationResult[] => [
  simulateBubbleSort(values),
  simulateSelectionSort(values),
  simulateInsertionSort(values),
  simulateMergeSort(values),
  simulateCountingSort(values),
  simulateQuickSort(values),
];

const simulateBubbleSort = (values: readonly number[]): SortSimulationResult => {
  const arr = [...values];
  const animationSteps: SortAnimationStep[] = [];
  let comparisons = 0;
  let writes = 0;

  for (let end = arr.length - 1; end > 0; end -= 1) {
    for (let i = 0; i < end; i += 1) {
      comparisons += 1;
      animationSteps.push({
        values: [...arr],
        phase: 'compare',
        activeIndices: [i, i + 1],
        comparingIndices: [i, i + 1],
        sortedIndices: Array.from({ length: arr.length - 1 - end }, (_, index) => end + 1 + index),
        message: `сравниваем соседей ${arr[i]} и ${arr[i + 1]} на позициях ${i} и ${i + 1}.`,
      });

      if (arr[i]! > arr[i + 1]!) {
        const left = arr[i]!;
        const right = arr[i + 1]!;
        [arr[i], arr[i + 1]] = [right, left];
        writes += 2;
        animationSteps.push({
          values: [...arr],
          phase: 'swap',
          activeIndices: [i, i + 1],
          swappingIndices: [i, i + 1],
          sortedIndices: Array.from({ length: arr.length - 1 - end }, (_, index) => end + 1 + index),
          message: `${left} > ${right}, поэтому меняем их местами. Большие значения постепенно уходят вправо.`,
        });
      }
    }
    animationSteps.push({
      values: [...arr],
      phase: 'inspect',
      activeIndices: [end],
      sortedIndices: Array.from({ length: arr.length - end }, (_, index) => end + index),
      message: `позиция ${end} зафиксирована: справа уже стоит один из наибольших элементов.`,
    });
  }

  animationSteps.push({
    values: [...arr],
    phase: 'complete',
    activeIndices: [],
    sortedIndices: arr.map((_, index) => index),
    message: `массив полностью отсортирован: [${arr.join(', ')}].`,
  });

  return { name: 'Пузырьковая сортировка', sorted: arr, comparisons, writes, explanation: 'сравнивает соседние элементы и меняет их местами, если левый больше правого.', animationSteps };
};

const simulateSelectionSort = (values: readonly number[]): SortSimulationResult => {
  const arr = [...values];
  const animationSteps: SortAnimationStep[] = [];
  let comparisons = 0;
  let writes = 0;

  for (let i = 0; i < arr.length - 1; i += 1) {
    let minIndex = i;
    animationSteps.push({ values: [...arr], phase: 'inspect', activeIndices: [i], sortedIndices: range(0, i), message: `ищем минимум для позиции ${i}; сначала минимумом считаем ${arr[i]}.` });
    for (let j = i + 1; j < arr.length; j += 1) {
      comparisons += 1;
      animationSteps.push({
        values: [...arr],
        phase: 'compare',
        activeIndices: [minIndex, j],
        comparingIndices: [minIndex, j],
        sortedIndices: range(0, i),
        message: `сравниваем текущий минимум ${arr[minIndex]} на позиции ${minIndex} с элементом ${arr[j]} на позиции ${j}.`,
      });
      if (arr[j]! < arr[minIndex]!) {
        minIndex = j;
        animationSteps.push({ values: [...arr], phase: 'inspect', activeIndices: [minIndex], sortedIndices: range(0, i), message: `новый минимум найден: ${arr[minIndex]} на позиции ${minIndex}.` });
      }
    }
    if (minIndex !== i) {
      const target = arr[i]!;
      const min = arr[minIndex]!;
      [arr[i], arr[minIndex]] = [min, target];
      writes += 2;
      animationSteps.push({ values: [...arr], phase: 'swap', activeIndices: [i, minIndex], swappingIndices: [i, minIndex], sortedIndices: range(0, i + 1), message: `переносим минимум ${min} в позицию ${i}; элемент ${target} уходит на место найденного минимума.` });
    } else {
      animationSteps.push({ values: [...arr], phase: 'inspect', activeIndices: [i], sortedIndices: range(0, i + 1), message: `позиция ${i} уже содержит минимальный элемент оставшейся части: ${arr[i]}.` });
    }
  }

  animationSteps.push({ values: [...arr], phase: 'complete', activeIndices: [], sortedIndices: arr.map((_, index) => index), message: `массив полностью отсортирован: [${arr.join(', ')}].` });
  return { name: 'Сортировка выбором', sorted: arr, comparisons, writes, explanation: 'на каждом шаге ищет минимум неотсортированной части и ставит его в первую свободную позицию.', animationSteps };
};

const simulateInsertionSort = (values: readonly number[]): SortSimulationResult => {
  const arr = [...values];
  const animationSteps: SortAnimationStep[] = [];
  let comparisons = 0;
  let writes = 0;

  animationSteps.push({ values: [...arr], phase: 'initial', activeIndices: [0], sortedIndices: [0], message: `первый элемент ${arr[0]} считаем отсортированной частью длины 1.` });
  for (let i = 1; i < arr.length; i += 1) {
    const key = arr[i]!;
    let j = i - 1;
    animationSteps.push({ values: [...arr], phase: 'inspect', activeIndices: [i], sortedIndices: range(0, i), message: `берём ключ ${key} из позиции ${i} и вставляем его в отсортированную левую часть.` });
    while (j >= 0) {
      comparisons += 1;
      animationSteps.push({ values: [...arr], phase: 'compare', activeIndices: [j, j + 1], comparingIndices: [j, j + 1], sortedIndices: range(0, i), message: `сравниваем ${arr[j]} с ключом ${key}: если левый элемент больше, сдвигаем его вправо.` });
      if (arr[j]! <= key) break;
      arr[j + 1] = arr[j]!;
      writes += 1;
      animationSteps.push({ values: [...arr], phase: 'merge', activeIndices: [j + 1], sortedIndices: range(0, i + 1), message: `сдвигаем ${arr[j + 1]} вправо на позицию ${j + 1}, освобождая место для ключа ${key}.` });
      j -= 1;
    }
    arr[j + 1] = key;
    writes += 1;
    animationSteps.push({ values: [...arr], phase: 'merge', activeIndices: [j + 1], sortedIndices: range(0, i + 1), message: `вставляем ключ ${key} в позицию ${j + 1}; левая часть до позиции ${i} снова отсортирована.` });
  }

  animationSteps.push({ values: [...arr], phase: 'complete', activeIndices: [], sortedIndices: arr.map((_, index) => index), message: `массив полностью отсортирован: [${arr.join(', ')}].` });
  return { name: 'Сортировка вставками', sorted: arr, comparisons, writes, explanation: 'поддерживает слева отсортированную часть и вставляет очередной элемент на своё место.', animationSteps };
};

const simulateMergeSort = (values: readonly number[]): SortSimulationResult => {
  const arr = [...values];
  const animationSteps: SortAnimationStep[] = [];
  let comparisons = 0;
  let writes = 0;

  for (let width = 1; width < arr.length; width *= 2) {
    for (let left = 0; left < arr.length; left += width * 2) {
      const mid = Math.min(left + width, arr.length);
      const right = Math.min(left + width * 2, arr.length);
      const leftPart = arr.slice(left, mid);
      const rightPart = arr.slice(mid, right);
      let i = 0;
      let j = 0;
      let writeIndex = left;

      animationSteps.push({ values: [...arr], phase: 'inspect', activeIndices: range(left, right), message: `делим текущий участок на [${leftPart.join(', ')}] и [${rightPart.join(', ')}], затем сливаем их в отсортированном порядке.` });
      while (i < leftPart.length && j < rightPart.length) {
        comparisons += 1;
        animationSteps.push({ values: [...arr], phase: 'compare', activeIndices: [left + i, mid + j], comparingIndices: [left + i, mid + j], message: `сравниваем первые неиспользованные элементы частей: ${leftPart[i]} и ${rightPart[j]}.` });
        arr[writeIndex] = leftPart[i]! <= rightPart[j]! ? leftPart[i++]! : rightPart[j++]!;
        writes += 1;
        animationSteps.push({ values: [...arr], phase: 'merge', activeIndices: [writeIndex], sortedIndices: range(left, writeIndex + 1), message: `записываем ${arr[writeIndex]} в позицию ${writeIndex}; слияние участка продолжается.` });
        writeIndex += 1;
      }
      while (i < leftPart.length) {
        arr[writeIndex] = leftPart[i++]!;
        writes += 1;
        animationSteps.push({ values: [...arr], phase: 'merge', activeIndices: [writeIndex], sortedIndices: range(left, writeIndex + 1), message: `дописываем оставшийся элемент левой части ${arr[writeIndex]} в позицию ${writeIndex}.` });
        writeIndex += 1;
      }
      while (j < rightPart.length) {
        arr[writeIndex] = rightPart[j++]!;
        writes += 1;
        animationSteps.push({ values: [...arr], phase: 'merge', activeIndices: [writeIndex], sortedIndices: range(left, writeIndex + 1), message: `дописываем оставшийся элемент правой части ${arr[writeIndex]} в позицию ${writeIndex}.` });
        writeIndex += 1;
      }
    }
  }

  animationSteps.push({ values: [...arr], phase: 'complete', activeIndices: [], sortedIndices: arr.map((_, index) => index), message: `массив полностью отсортирован: [${arr.join(', ')}].` });
  return { name: 'Сортировка слиянием', sorted: arr, comparisons, writes, explanation: 'делит массив на малые части и затем устойчиво сливает уже отсортированные участки.', animationSteps };
};

const simulateCountingSort = (values: readonly number[]): SortSimulationResult => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const count = Array.from({ length: max - min + 1 }, () => 0);
  const arr = [...values];
  const animationSteps: SortAnimationStep[] = [];
  let writes = 0;

  for (let i = 0; i < values.length; i += 1) {
    const value = values[i]!;
    count[value - min] = (count[value - min] ?? 0) + 1;
    animationSteps.push({ values: [...arr], phase: 'inspect', activeIndices: [i], auxiliaryArray: [...count], message: `значение ${value} увеличивает счётчик count[${value - min}], потому что минимальное значение набора равно ${min}.` });
  }

  let writeIndex = 0;
  for (let bucket = 0; bucket < count.length; bucket += 1) {
    const value = bucket + min;
    while ((count[bucket] ?? 0) > 0) {
      arr[writeIndex] = value;
      count[bucket] = (count[bucket] ?? 0) - 1;
      writes += 1;
      animationSteps.push({ values: [...arr], phase: 'merge', activeIndices: [writeIndex], sortedIndices: range(0, writeIndex + 1), auxiliaryArray: [...count], message: `по счётчику восстанавливаем значение ${value} и записываем его в позицию ${writeIndex}.` });
      writeIndex += 1;
    }
  }

  return { name: 'Сортировка подсчётом', sorted: arr, comparisons: 0, writes, explanation: `не сравнивает элементы, а считает частоты значений в диапазоне от ${min} до ${max}; хорошо работает, когда диапазон ключей небольшой.`, animationSteps };
};

const simulateQuickSort = (values: readonly number[]): SortSimulationResult => {
  const arr = [...values];
  const animationSteps: SortAnimationStep[] = [];
  let comparisons = 0;
  let writes = 0;

  const partition = (left: number, right: number): number => {
    const pivot = arr[right]!;
    let storeIndex = left;
    animationSteps.push({ values: [...arr], phase: 'inspect', activeIndices: [right], message: `выбираем опорный элемент pivot = ${pivot} на позиции ${right}; меньшие значения будем переносить левее него.` });
    for (let i = left; i < right; i += 1) {
      comparisons += 1;
      animationSteps.push({ values: [...arr], phase: 'compare', activeIndices: [i, right], comparingIndices: [i, right], message: `сравниваем ${arr[i]} с pivot ${pivot}. Если значение меньше или равно pivot, оно должно оказаться в левой части.` });
      if (arr[i]! <= pivot) {
        if (i !== storeIndex) {
          const current = arr[i]!;
          const boundary = arr[storeIndex]!;
          [arr[i], arr[storeIndex]] = [boundary, current];
          writes += 2;
          animationSteps.push({ values: [...arr], phase: 'swap', activeIndices: [i, storeIndex], swappingIndices: [i, storeIndex], message: `${current} переносим в левую часть, меняя с ${boundary}. Граница меньших элементов сдвигается вправо.` });
        }
        storeIndex += 1;
      }
    }
    if (storeIndex !== right) {
      const boundary = arr[storeIndex]!;
      [arr[storeIndex], arr[right]] = [pivot, boundary];
      writes += 2;
      animationSteps.push({ values: [...arr], phase: 'swap', activeIndices: [storeIndex, right], swappingIndices: [storeIndex, right], message: `ставим pivot ${pivot} на окончательную позицию ${storeIndex}; слева элементы не больше pivot, справа — больше.` });
    }
    return storeIndex;
  };

  const sort = (left: number, right: number): void => {
    if (left >= right) return;
    const pivotIndex = partition(left, right);
    sort(left, pivotIndex - 1);
    sort(pivotIndex + 1, right);
  };

  sort(0, arr.length - 1);
  animationSteps.push({ values: [...arr], phase: 'complete', activeIndices: [], sortedIndices: arr.map((_, index) => index), message: `массив полностью отсортирован: [${arr.join(', ')}].` });
  return { name: 'Быстрая сортировка', sorted: arr, comparisons, writes, explanation: 'выбирает опорный элемент, разделяет участок на элементы не больше и больше опорного, затем рекурсивно сортирует части.', animationSteps };
};

const range = (start: number, end: number): readonly number[] =>
  Array.from({ length: Math.max(0, end - start) }, (_, index) => start + index);
