import type { ArrayAlgorithmFrame, ArrayAlgorithmMeta, ArrayItem, AlgorithmPhase } from '@/types';
import { cloneArraySnapshot, createArrayItems, getArrayItemIds } from './utils';

type SortGenerator = Generator<ArrayAlgorithmFrame, void, unknown>;

const frame = (
  step: number,
  phase: AlgorithmPhase,
  items: readonly ArrayItem[],
  line: number,
  message: string,
  meta: ArrayAlgorithmMeta = {},
): ArrayAlgorithmFrame => ({
  step,
  domain: 'array',
  phase,
  status: phase === 'complete' ? 'completed' : 'running',
  data: cloneArraySnapshot(items),
  activeIds: getArrayItemIds(items, [...(meta.comparingIndices ?? []), ...(meta.swappingIndices ?? [])]),
  pseudocode: { line },
  message,
  description: message,
  meta,
});

const swap = (items: ArrayItem[], a: number, b: number): void => {
  const temp = items[a]!;
  items[a] = items[b]!;
  items[b] = temp;
};

const values = (items: readonly ArrayItem[]): string => `[${items.map((item) => item.value).join(', ')}]`;
const all = (items: readonly ArrayItem[]): number[] => items.map((_, index) => index);
const word = (count: number, one: string, few: string, many: string): string => {
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  const mod10 = count % 10;
  return mod10 === 1 ? one : mod10 >= 2 && mod10 <= 4 ? few : many;
};

/** Сортировка вставками: ключ «спускается» влево, пока слева стоит большее значение. */
export function* insertionSort(input: readonly number[]): SortGenerator {
  const items = [...createArrayItems(input)];
  let step = 0;
  let comparisons = 0;
  let shifts = 0;

  yield frame(
    step++,
    'initial',
    items,
    1,
    `Левая часть из одного элемента уже упорядочена. Каждый следующий элемент будем вставлять в неё на своё место. Массив: ${values(items)}.`,
    {
      pointers: { i: 1 },
    },
  );

  for (let i = 1; i < items.length; i += 1) {
    let j = i;
    yield frame(step++, 'inspect', items, 2, `Берём ключ ${items[i]!.value} (позиция ${i}). Слева от него — упорядоченная часть, в неё и вставим ключ.`, {
      pivotIndex: i,
      pointers: { i, j },
      range: [0, i],
    });
    while (j > 0) {
      comparisons += 1;
      const left = items[j - 1]!.value;
      const key = items[j]!.value;
      yield frame(
        step++,
        'compare',
        items,
        3,
        `Сравниваем ${left} и ключ ${key}: ${left > key ? `${left} > ${key}, значит ключ должен стоять левее` : `${left} ≤ ${key} — ключ на своём месте`}.`,
        {
          comparingIndices: [j - 1, j],
          pivotIndex: j,
          pointers: { i, j },
          range: [0, i],
        },
      );
      if (left <= key) break;
      swap(items, j - 1, j);
      shifts += 1;
      yield frame(step++, 'swap', items, 4, `Сдвигаем ${left} на одну позицию вправо, ключ ${key} перемещается на позицию ${j - 1}.`, {
        swappingIndices: [j - 1, j],
        pivotIndex: j - 1,
        pointers: { i, j: j - 1 },
        range: [0, i],
      });
      j -= 1;
    }
    yield frame(
      step++,
      'merge',
      items,
      5,
      `Ключ ${items[j]!.value} встал на позицию ${j}. Упорядочены первые ${i + 1} ${word(i + 1, 'элемент', 'элемента', 'элементов')}: ${values(items.slice(0, i + 1))}.`,
      {
        pivotIndex: j,
        range: [0, i],
      },
    );
  }

  yield frame(
    step,
    'complete',
    items,
    6,
    `Сортировка вставками завершена: ${values(items)}. Сравнений — ${comparisons}, сдвигов — ${shifts}. На почти упорядоченных данных сдвигов почти нет, и алгоритм работает за линейное время.`,
    {
      sortedIndices: all(items),
    },
  );
}

/** Сортировка выбором: в неотсортированной части ищем минимум и ставим его в начало. */
export function* selectionSort(input: readonly number[]): SortGenerator {
  const items = [...createArrayItems(input)];
  let step = 0;
  let comparisons = 0;
  let swaps = 0;
  const sorted: number[] = [];

  yield frame(
    step++,
    'initial',
    items,
    1,
    `На каждом проходе найдём минимум неотсортированной части и поменяем его с первым её элементом. Массив: ${values(items)}.`,
  );

  for (let i = 0; i < items.length - 1; i += 1) {
    let min = i;
    yield frame(step++, 'inspect', items, 2, `Проход ${i + 1}: считаем минимумом первый элемент неотсортированной части — ${items[i]!.value}.`, {
      pivotIndex: min,
      pointers: { i, min },
      sortedIndices: [...sorted],
    });
    for (let j = i + 1; j < items.length; j += 1) {
      comparisons += 1;
      yield frame(step++, 'compare', items, 3, `Сравниваем ${items[j]!.value} с текущим минимумом ${items[min]!.value}.`, {
        comparingIndices: [min, j],
        pivotIndex: min,
        pointers: { i, j, min },
        sortedIndices: [...sorted],
      });
      if (items[j]!.value < items[min]!.value) {
        min = j;
        yield frame(step++, 'inspect', items, 4, `${items[j]!.value} меньше — запоминаем новый минимум на позиции ${j}.`, {
          pivotIndex: min,
          pointers: { i, j, min },
          sortedIndices: [...sorted],
        });
      }
    }
    if (min !== i) {
      swap(items, i, min);
      swaps += 1;
      yield frame(step++, 'swap', items, 5, `Меняем местами ${items[min]!.value} и минимум ${items[i]!.value}: минимум встаёт на позицию ${i}.`, {
        swappingIndices: [i, min],
        sortedIndices: [...sorted],
      });
    } else {
      yield frame(step++, 'inspect', items, 5, `Минимум уже на позиции ${i} — обмен не нужен.`, { pivotIndex: i, sortedIndices: [...sorted] });
    }
    sorted.push(i);
  }

  yield frame(
    step,
    'complete',
    items,
    6,
    `Сортировка выбором завершена: ${values(items)}. Сравнений — ${comparisons}: их всегда n(n−1)/2, независимо от данных. Обменов — ${swaps}, не больше n − 1.`,
    {
      sortedIndices: all(items),
    },
  );
}

/** Сортировка Шелла: вставки по подпоследовательностям с шагом gap, шаг уменьшается вдвое. */
export function* shellSort(input: readonly number[]): SortGenerator {
  const items = [...createArrayItems(input)];
  let step = 0;
  let comparisons = 0;
  let moves = 0;
  const n = items.length;

  yield frame(
    step++,
    'initial',
    items,
    1,
    `Сортировка Шелла сначала упорядочивает элементы, далеко отстоящие друг от друга, а потом сокращает шаг. Начальный шаг gap = ⌊${n}/2⌋ = ${Math.floor(n / 2)}.`,
  );

  for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
    for (let i = gap; i < n; i += 1) {
      const chain = all(items).filter((index) => index % gap === i % gap);
      const dimmed = all(items).filter((index) => !chain.includes(index));
      let j = i;
      yield frame(
        step++,
        'inspect',
        items,
        2,
        `Шаг ${gap}: берём элемент ${items[i]!.value} (позиция ${i}) и вставляем его в цепочку элементов через ${gap}.`,
        {
          pivotIndex: i,
          pointers: { i },
          discardedIndices: dimmed,
        },
      );
      while (j >= gap) {
        comparisons += 1;
        const left = items[j - gap]!.value;
        const current = items[j]!.value;
        yield frame(step++, 'compare', items, 3, `Сравниваем ${left} (позиция ${j - gap}) и ${current} (позиция ${j}).`, {
          comparingIndices: [j - gap, j],
          pointers: { [`j−${gap}`]: j - gap, j },
          discardedIndices: dimmed,
        });
        if (left <= current) break;
        swap(items, j - gap, j);
        moves += 1;
        yield frame(
          step++,
          'swap',
          items,
          4,
          `${left} > ${current} — меняем их местами: меньшее значение перепрыгивает сразу на ${gap} ${word(gap, 'позицию', 'позиции', 'позиций')} влево.`,
          {
            swappingIndices: [j - gap, j],
            discardedIndices: dimmed,
          },
        );
        j -= gap;
      }
    }
    yield frame(
      step++,
      'merge',
      items,
      5,
      `Проход с шагом ${gap} закончен: каждая цепочка через ${gap} упорядочена. ${gap > 1 ? `Следующий шаг — ${Math.floor(gap / 2)}.` : 'Это был обычный проход вставками.'}`,
    );
  }

  yield frame(
    step,
    'complete',
    items,
    6,
    `Сортировка Шелла завершена: ${values(items)}. Сравнений — ${comparisons}, перестановок — ${moves}. Крупные шаги быстро уносят элементы далеко, поэтому финальным вставкам почти нечего делать.`,
    {
      sortedIndices: all(items),
    },
  );
}

/** Быстрая сортировка с разбиением Ломуто: опорный — последний элемент отрезка. */
export function* quickSort(input: readonly number[]): SortGenerator {
  const items = [...createArrayItems(input)];
  const sorted = new Set<number>();
  let step = 0;
  let comparisons = 0;
  let swaps = 0;
  let maxDepth = 0;

  yield frame(
    step++,
    'initial',
    items,
    1,
    `Быстрая сортировка выбирает опорный элемент и разбивает отрезок: слева — меньшие, справа — не меньшие. Затем так же сортирует обе части. Массив: ${values(items)}.`,
  );

  function* sortRange(lo: number, hi: number, depth: number): SortGenerator {
    maxDepth = Math.max(maxDepth, depth);
    if (lo >= hi) {
      if (lo === hi) {
        sorted.add(lo);
        yield frame(step++, 'inspect', items, 1, `Отрезок из одного элемента (${items[lo]!.value}) уже упорядочен.`, {
          sortedIndices: [...sorted],
          range: [lo, hi],
        });
      }
      return;
    }
    const pivot = items[hi]!.value;
    let i = lo;
    yield frame(step++, 'inspect', items, 2, `Отрезок [${lo}…${hi}]: опорный элемент — последний, ${pivot}. Граница меньших i = ${lo}.`, {
      pivotIndex: hi,
      pointers: { i, j: lo },
      range: [lo, hi],
      sortedIndices: [...sorted],
    });
    for (let j = lo; j < hi; j += 1) {
      comparisons += 1;
      const value = items[j]!.value;
      yield frame(
        step++,
        'compare',
        items,
        3,
        `Сравниваем ${value} с опорным ${pivot}: ${value < pivot ? 'меньше — отправим влево' : 'не меньше — остаётся справа'}.`,
        {
          comparingIndices: [j, hi],
          pivotIndex: hi,
          pointers: { i, j },
          range: [lo, hi],
          sortedIndices: [...sorted],
        },
      );
      if (value < pivot) {
        if (i !== j) {
          swap(items, i, j);
          swaps += 1;
          yield frame(step++, 'swap', items, 4, `Меняем ${items[j]!.value} и ${value}: ${value} переходит в левую часть, граница сдвигается.`, {
            swappingIndices: [i, j],
            pivotIndex: hi,
            pointers: { i: i + 1, j },
            range: [lo, hi],
            sortedIndices: [...sorted],
          });
        }
        i += 1;
      }
    }
    if (i !== hi) {
      swap(items, i, hi);
      swaps += 1;
    }
    sorted.add(i);
    yield frame(
      step++,
      'swap',
      items,
      5,
      `Ставим опорный ${pivot} на позицию ${i}: левее — только меньшие, правее — не меньшие. Это его окончательное место.`,
      {
        swappingIndices: [i, hi],
        range: [lo, hi],
        sortedIndices: [...sorted],
      },
    );
    yield frame(step++, 'inspect', items, 6, `Рекурсивно сортируем левую часть [${lo}…${i - 1}] и правую [${i + 1}…${hi}].`, {
      range: [lo, hi],
      sortedIndices: [...sorted],
    });
    yield* sortRange(lo, i - 1, depth + 1);
    yield* sortRange(i + 1, hi, depth + 1);
  }

  yield* sortRange(0, items.length - 1, 1);
  yield frame(
    step,
    'complete',
    items,
    6,
    `Быстрая сортировка завершена: ${values(items)}. Сравнений — ${comparisons}, обменов — ${swaps}, глубина рекурсии — ${maxDepth}. На уже упорядоченном массиве опорный всегда оказывается крайним, глубина растёт до n — это худший случай O(n²).`,
    {
      sortedIndices: all(items),
    },
  );
}

/** Пирамидальная сортировка: max-куча в самом массиве, максимум уходит в конец. */
export function* heapSort(input: readonly number[]): SortGenerator {
  const items = [...createArrayItems(input)];
  const n = items.length;
  const sorted: number[] = [];
  let step = 0;
  let comparisons = 0;
  let swaps = 0;

  yield frame(
    step++,
    'initial',
    items,
    1,
    `Массив можно считать двоичным деревом: у элемента i дети — 2i+1 и 2i+2. Сначала превратим его в max-кучу, где каждый родитель не меньше детей.`,
    {
      heapSize: n,
    },
  );

  function* siftDown(start: number, size: number, line: number): SortGenerator {
    let root = start;
    for (;;) {
      const left = 2 * root + 1;
      const right = left + 1;
      if (left >= size) return;
      let largest = left;
      comparisons += 1;
      if (right < size) {
        comparisons += 1;
        if (items[right]!.value > items[left]!.value) largest = right;
      }
      yield frame(
        step++,
        'compare',
        items,
        2,
        `Узел ${items[root]!.value} (позиция ${root}) и его ${right < size ? `дети ${items[left]!.value} и ${items[right]!.value}` : `ребёнок ${items[left]!.value}`}: наибольший ребёнок — ${items[largest]!.value}.`,
        {
          comparingIndices: [root, largest],
          range: [0, size - 1],
          sortedIndices: [...sorted],
          heapSize: size,
        },
      );
      comparisons += 1;
      if (items[largest]!.value <= items[root]!.value) {
        yield frame(step++, 'inspect', items, line, `${items[root]!.value} не меньше детей — свойство кучи в этом поддереве выполнено.`, {
          pivotIndex: root,
          range: [0, size - 1],
          sortedIndices: [...sorted],
          heapSize: size,
        });
        return;
      }
      swap(items, root, largest);
      swaps += 1;
      yield frame(step++, 'swap', items, 3, `Ребёнок больше родителя — меняем их и продолжаем просеивание вниз.`, {
        swappingIndices: [root, largest],
        range: [0, size - 1],
        sortedIndices: [...sorted],
        heapSize: size,
      });
      root = largest;
    }
  }

  for (let start = Math.floor(n / 2) - 1; start >= 0; start -= 1) {
    yield* siftDown(start, n, 1);
  }
  yield frame(step++, 'inspect', items, 1, `Max-куча построена: наибольший элемент ${items[0]!.value} в корне (позиция 0).`, { pivotIndex: 0, heapSize: n });

  for (let end = n - 1; end > 0; end -= 1) {
    swap(items, 0, end);
    swaps += 1;
    sorted.unshift(end);
    yield frame(step++, 'swap', items, 4, `Меняем корень ${items[end]!.value} с последним элементом кучи: максимум встаёт на окончательную позицию ${end}.`, {
      swappingIndices: [0, end],
      sortedIndices: [...sorted],
      range: [0, end - 1],
      heapSize: end,
    });
    yield* siftDown(0, end, 5);
  }
  sorted.unshift(0);

  yield frame(
    step,
    'complete',
    items,
    6,
    `Пирамидальная сортировка завершена: ${values(items)}. Сравнений — ${comparisons}, обменов — ${swaps}. Время O(n log n) в любом случае и никакой дополнительной памяти.`,
    {
      sortedIndices: all(items),
      heapSize: 0,
    },
  );
}
