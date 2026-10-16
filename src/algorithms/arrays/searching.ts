import type { AlgorithmPhase, ArrayAlgorithmFrame, ArrayAlgorithmMeta, ArrayItem } from '@/types';
import { cloneArraySnapshot, createArrayItems, getArrayItemIds } from './utils';
import { countOf } from '@/lib/plural';

type SearchGenerator = Generator<ArrayAlgorithmFrame, void, unknown>;

export interface SearchCounters extends Record<string, number> {
  readonly comparisons: number;
  readonly candidates: number;
}

const frame = (
  step: number,
  phase: AlgorithmPhase,
  items: readonly ArrayItem[],
  line: number,
  message: string,
  meta: ArrayAlgorithmMeta,
): ArrayAlgorithmFrame => ({
  step,
  domain: 'array',
  phase,
  status: phase === 'complete' ? 'completed' : 'running',
  data: cloneArraySnapshot(items),
  activeIds: getArrayItemIds(items, meta.probeIndex === undefined ? [] : [meta.probeIndex]),
  pseudocode: { line },
  message,
  description: message,
  meta,
});

const indices = (from: number, to: number): number[] => {
  const result: number[] = [];
  for (let index = from; index <= to; index += 1) result.push(index);
  return result;
};

/** всё, что вне [lo, hi], уже отброшено */
const outside = (count: number, lo: number, hi: number): number[] => [...indices(0, Math.min(lo, count) - 1), ...indices(Math.max(hi + 1, 0), count - 1)];

const word = (count: number, one: string, few: string, many: string): string => {
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  const mod10 = count % 10;
  return mod10 === 1 ? one : mod10 >= 2 && mod10 <= 4 ? few : many;
};

const comparisonsText = (count: number): string => `${count} ${word(count, 'сравнение', 'сравнения', 'сравнений')}`;

const sortedItems = (input: readonly number[]): ArrayItem[] => [...createArrayItems([...input].sort((a, b) => a - b))];

/** Линейный поиск: элементы проверяются по очереди, порядок массива не важен. */
export function* linearSearch(input: readonly number[], key: number): SearchGenerator {
  const items = [...createArrayItems(input)];
  const n = items.length;
  let step = 0;
  let comparisons = 0;
  const counters = (candidates: number): SearchCounters => ({ comparisons, candidates });

  yield frame(
    step++,
    'initial',
    items,
    1,
    `Ищем ключ ${key} среди ${countOf(n, 'элемента', 'элементов', 'элементов')}. Массив не обязан быть упорядочен, поэтому проверяем элементы по очереди слева направо.`,
    { targetValue: key, pointers: { i: 0 }, counters: counters(n) },
  );

  for (let i = 0; i < n; i += 1) {
    const value = items[i]!.value;
    comparisons += 1;
    const equal = value === key;
    yield frame(step++, 'compare', items, 2, equal ? `A[${i}] = ${value} — совпадает с ключом.` : `A[${i}] = ${value} ≠ ${key} — идём дальше.`, {
      targetValue: key,
      probeIndex: i,
      pointers: { i },
      discardedIndices: indices(0, i - 1),
      counters: counters(n - i),
    });
    if (equal) {
      yield frame(step++, 'complete', items, 3, `Ключ ${key} найден на позиции ${i}. Понадобилось ${comparisonsText(comparisons)} из ${n} возможных.`, {
        targetValue: key,
        foundIndex: i,
        discardedIndices: indices(0, i - 1),
        outcome: 'hit',
        counters: counters(1),
      });
      return;
    }
  }

  yield frame(step++, 'complete', items, 4, `Элементы закончились: ключа ${key} в массиве нет. Проверены все ${n}, результат — −1.`, {
    targetValue: key,
    discardedIndices: indices(0, n - 1),
    outcome: 'miss',
    counters: counters(0),
  });
}

/** Бинарный поиск: каждое сравнение отбрасывает половину оставшегося отрезка. */
export function* binarySearch(input: readonly number[], key: number): SearchGenerator {
  const items = sortedItems(input);
  const n = items.length;
  let step = 0;
  let comparisons = 0;
  let lo = 0;
  let hi = n - 1;
  const meta = (extra: ArrayAlgorithmMeta = {}): ArrayAlgorithmMeta => ({
    targetValue: key,
    range: [lo, hi],
    discardedIndices: outside(n, lo, hi),
    pointers: { lo, hi },
    counters: { comparisons, candidates: Math.max(0, hi - lo + 1) },
    ...extra,
  });

  yield frame(
    step++,
    'initial',
    items,
    1,
    `Массив упорядочен — значит, после каждого сравнения можно отбросить целую половину. Ищем ${key}, границы отрезка: lo = 0, hi = ${hi}.`,
    meta(),
  );

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const value = items[mid]!.value;
    comparisons += 1;
    const relation = value === key ? '=' : value < key ? '<' : '>';
    yield frame(
      step++,
      'compare',
      items,
      3,
      `Середина отрезка: mid = ⌊(${lo} + ${hi}) / 2⌋ = ${mid}. Сравниваем A[${mid}] = ${value} с ключом: ${value} ${relation} ${key}.`,
      meta({ probeIndex: mid, pointers: { lo, mid, hi } }),
    );

    if (value === key) {
      yield frame(
        step++,
        'complete',
        items,
        4,
        `Ключ ${key} найден на позиции ${mid}. Хватило ${comparisonsText(comparisons)} — линейному поиску понадобилось бы ${mid + 1}.`,
        meta({ foundIndex: mid, pointers: { mid }, outcome: 'hit', counters: { comparisons, candidates: 1 } }),
      );
      return;
    }

    if (value < key) {
      const dropped = mid - lo + 1;
      lo = mid + 1;
      yield frame(
        step++,
        'discard',
        items,
        5,
        `${value} < ${key}: ключ может быть только правее mid. Отбрасываем ${dropped} ${word(dropped, 'элемент', 'элемента', 'элементов')} слева вместе с mid: lo ← ${lo}.`,
        meta(),
      );
    } else {
      const dropped = hi - mid + 1;
      hi = mid - 1;
      yield frame(
        step++,
        'discard',
        items,
        5,
        `${value} > ${key}: ключ может быть только левее mid. Отбрасываем ${dropped} ${word(dropped, 'элемент', 'элемента', 'элементов')} справа вместе с mid: hi ← ${hi}.`,
        meta(),
      );
    }
  }

  yield frame(
    step++,
    'complete',
    items,
    6,
    `Отрезок опустел (lo = ${lo} > hi = ${hi}): ключа ${key} в массиве нет. Это выяснилось за ${comparisonsText(comparisons)} на ${n} элементах.`,
    {
      targetValue: key,
      discardedIndices: indices(0, n - 1),
      outcome: 'miss',
      counters: { comparisons, candidates: 0 },
    },
  );
}

/** Интерполяционный поиск: позиция угадывается по значению ключа, как в телефонном справочнике. */
export function* interpolationSearch(input: readonly number[], key: number): SearchGenerator {
  const items = sortedItems(input);
  const n = items.length;
  let step = 0;
  let comparisons = 0;
  let lo = 0;
  let hi = n - 1;
  const at = (index: number): number => items[index]!.value;
  const meta = (extra: ArrayAlgorithmMeta = {}): ArrayAlgorithmMeta => ({
    targetValue: key,
    range: [lo, hi],
    discardedIndices: outside(n, lo, hi),
    pointers: { lo, hi },
    counters: { comparisons, candidates: Math.max(0, hi - lo + 1) },
    ...extra,
  });

  yield frame(
    step++,
    'initial',
    items,
    1,
    `Ищем ${key}. Вместо середины будем «прицеливаться»: чем ближе ключ к A[hi], тем правее пробуем. Это работает тем лучше, чем равномернее распределены значения.`,
    meta(),
  );

  while (lo <= hi) {
    if (key < at(lo) || key > at(hi)) {
      yield frame(
        step++,
        'complete',
        items,
        2,
        `Ключ ${key} вне диапазона [A[${lo}] = ${at(lo)} … A[${hi}] = ${at(hi)}] — среди оставшихся элементов его быть не может. Ключа нет, результат — −1.`,
        { targetValue: key, discardedIndices: indices(0, n - 1), outcome: 'miss', counters: { comparisons, candidates: 0 } },
      );
      return;
    }

    const span = at(hi) - at(lo);
    const pos = span === 0 ? lo : lo + Math.floor(((key - at(lo)) * (hi - lo)) / span);
    yield frame(
      step++,
      'inspect',
      items,
      3,
      span === 0
        ? `На отрезке все значения равны ${at(lo)}, поэтому пробуем pos = lo = ${pos}.`
        : `Оцениваем позицию: pos = ${lo} + ⌊(${key} − ${at(lo)})·(${hi} − ${lo}) / (${at(hi)} − ${at(lo)})⌋ = ${pos}.`,
      meta({ pointers: { lo, pos, hi } }),
    );

    const value = at(pos);
    comparisons += 1;
    const relation = value === key ? '=' : value < key ? '<' : '>';
    yield frame(
      step++,
      'compare',
      items,
      4,
      `Сравниваем A[${pos}] = ${value} с ключом: ${value} ${relation} ${key}.`,
      meta({ probeIndex: pos, pointers: { lo, pos, hi } }),
    );

    if (value === key) {
      yield frame(
        step++,
        'complete',
        items,
        4,
        `Ключ ${key} найден на позиции ${pos} за ${comparisonsText(comparisons)}. На равномерных данных прицел почти сразу попадает в цель.`,
        meta({ foundIndex: pos, pointers: { pos }, outcome: 'hit', counters: { comparisons, candidates: 1 } }),
      );
      return;
    }

    if (value < key) {
      lo = pos + 1;
      yield frame(step++, 'discard', items, 5, `${value} < ${key}: ключ правее. Отбрасываем всё до pos включительно: lo ← ${lo}.`, meta());
    } else {
      hi = pos - 1;
      yield frame(step++, 'discard', items, 5, `${value} > ${key}: ключ левее. Отбрасываем всё от pos и правее: hi ← ${hi}.`, meta());
    }
  }

  yield frame(step++, 'complete', items, 6, `Отрезок опустел: ключа ${key} в массиве нет. Проверено ${comparisonsText(comparisons)}.`, {
    targetValue: key,
    discardedIndices: indices(0, n - 1),
    outcome: 'miss',
    counters: { comparisons, candidates: 0 },
  });
}

/** Поиск прыжками: шагаем блоками по √n, затем перебираем один блок. */
export function* jumpSearch(input: readonly number[], key: number): SearchGenerator {
  const items = sortedItems(input);
  const n = items.length;
  const m = Math.max(1, Math.floor(Math.sqrt(n)));
  let step = 0;
  let comparisons = 0;
  let prev = 0;
  const at = (index: number): number => items[index]!.value;

  yield frame(
    step++,
    'initial',
    items,
    1,
    `Ищем ${key}. Длина прыжка m = ⌊√${n}⌋ = ${m}: сначала проверяем только последние элементы блоков по ${m}, чтобы найти нужный блок.`,
    { targetValue: key, pointers: { prev: 0 }, counters: { comparisons, candidates: n } },
  );

  for (;;) {
    const last = Math.min(prev + m, n) - 1;
    const value = at(last);
    comparisons += 1;
    const less = value < key;
    const relation = value === key ? '=' : less ? '<' : '>';
    yield frame(step++, 'compare', items, 2, `Блок [${prev}…${last}]: его последний элемент A[${last}] = ${value} ${relation} ${key}.`, {
      targetValue: key,
      probeIndex: last,
      range: [prev, last],
      discardedIndices: indices(0, prev - 1),
      pointers: { prev, last },
      counters: { comparisons, candidates: n - prev },
    });

    if (value === key) {
      yield frame(step++, 'complete', items, 2, `Ключ ${key} оказался последним элементом блока — позиция ${last}, ${comparisonsText(comparisons)}.`, {
        targetValue: key,
        foundIndex: last,
        discardedIndices: indices(0, prev - 1),
        outcome: 'hit',
        counters: { comparisons, candidates: 1 },
      });
      return;
    }
    if (!less) break;

    prev += m;
    if (prev >= n) {
      yield frame(step++, 'complete', items, 6, `Блоки закончились, а все элементы меньше ${key}. Ключа в массиве нет, результат — −1.`, {
        targetValue: key,
        discardedIndices: indices(0, n - 1),
        outcome: 'miss',
        counters: { comparisons, candidates: 0 },
      });
      return;
    }
    yield frame(
      step++,
      'discard',
      items,
      3,
      `Весь блок меньше ключа — отбрасываем его и прыгаем на ${countOf(m, 'позицию', 'позиции', 'позиций')} вперёд: prev ← ${prev}.`,
      {
        targetValue: key,
        discardedIndices: indices(0, prev - 1),
        pointers: { prev },
        counters: { comparisons, candidates: n - prev },
      },
    );
  }

  const last = Math.min(prev + m, n) - 1;
  if (last === prev) {
    yield frame(step++, 'complete', items, 6, `A[${last}] > ${key}, а все элементы левее уже отброшены — ключа в массиве нет. Результат — −1.`, {
      targetValue: key,
      discardedIndices: indices(0, n - 1),
      outcome: 'miss',
      counters: { comparisons, candidates: 0 },
    });
    return;
  }
  const blockMeta = (extra: ArrayAlgorithmMeta = {}): ArrayAlgorithmMeta => ({
    targetValue: key,
    range: [prev, last - 1],
    discardedIndices: outside(n, prev, last - 1),
    counters: { comparisons, candidates: last - prev },
    ...extra,
  });
  yield frame(
    step++,
    'inspect',
    items,
    4,
    `A[${last}] > ${key}, значит, если ключ есть, он в блоке [${prev}…${last - 1}]. Перебираем этот блок слева направо.`,
    blockMeta({ pointers: { prev } }),
  );

  for (let i = prev; i < last; i += 1) {
    const value = at(i);
    comparisons += 1;
    const relation = value === key ? '=' : value < key ? '<' : '>';
    yield frame(
      step++,
      'compare',
      items,
      5,
      `Сравниваем A[${i}] = ${value} с ключом: ${value} ${relation} ${key}.`,
      blockMeta({ probeIndex: i, pointers: { i } }),
    );
    if (value === key) {
      yield frame(
        step++,
        'complete',
        items,
        5,
        `Ключ ${key} найден на позиции ${i} за ${comparisonsText(comparisons)}. Прыжки сэкономили проверку ${prev} ${word(prev, 'элемента', 'элементов', 'элементов')} в начале.`,
        blockMeta({ foundIndex: i, pointers: { i }, outcome: 'hit', counters: { comparisons, candidates: 1 } }),
      );
      return;
    }
    if (value > key) {
      yield frame(step++, 'complete', items, 6, `${value} > ${key}, а дальше значения только больше — ключа в массиве нет. Результат — −1.`, {
        targetValue: key,
        discardedIndices: indices(0, n - 1),
        outcome: 'miss',
        counters: { comparisons, candidates: 0 },
      });
      return;
    }
  }

  yield frame(step++, 'complete', items, 6, `Блок просмотрен, а A[${last}] уже больше ключа — ${key} в массиве нет. Результат — −1.`, {
    targetValue: key,
    discardedIndices: indices(0, n - 1),
    outcome: 'miss',
    counters: { comparisons, candidates: 0 },
  });
}

/** Худшее число сравнений — для подписи «теория против практики». */
export const searchBounds = {
  linear: (n: number): number => n,
  binary: (n: number): number => Math.ceil(Math.log2(n + 1)),
  jump: (n: number): number => {
    const m = Math.max(1, Math.floor(Math.sqrt(n)));
    return Math.ceil(n / m) + m - 1;
  },
} as const;
