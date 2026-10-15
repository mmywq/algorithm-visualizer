import { treeFrame, type TreeFrame } from '@/algorithms/trees/treeFrames';
import type { AlgorithmFrame, AlgorithmPhase } from '@/types';
import type { TreeDiagramNode, TreeTone } from '@/types/tree';

export type Cell = readonly [number, number];

export interface DpTableSnapshot {
  readonly rowHeaders: readonly string[];
  readonly colHeaders: readonly string[];
  /** значения для показа; null — ячейка ещё не вычислена */
  readonly cells: readonly (readonly (string | null)[])[];
  readonly corner?: string;
}

export interface DpMeta extends Record<string, unknown> {
  readonly current?: Cell;
  /** ячейки, из которых берётся значение текущей */
  readonly deps?: readonly Cell[];
  /** выбранная зависимость (минимум или максимум) */
  readonly best?: Cell;
  /** путь восстановления ответа */
  readonly path?: readonly Cell[];
  readonly answer?: string;
  /** строки пояснения к ответу: набор монет, предметы, операции правки */
  readonly details?: readonly string[];
  readonly detailsLabel?: string;
  readonly outcome?: 'hit' | 'miss';
}

export type DpFrame = AlgorithmFrame<DpTableSnapshot, DpMeta>;

const word = (count: number, one: string, few: string, many: string): string => {
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  const mod10 = count % 10;
  return mod10 === 1 ? one : mod10 >= 2 && mod10 <= 4 ? few : many;
};

class Table {
  readonly values: (number | null)[][];
  constructor(
    readonly rowHeaders: readonly string[],
    readonly colHeaders: readonly string[],
    readonly format: (value: number) => string = String,
    readonly corner?: string,
  ) {
    this.values = rowHeaders.map(() => colHeaders.map(() => null));
  }

  get(r: number, c: number): number {
    return this.values[r]![c]!;
  }

  set(r: number, c: number, value: number): void {
    this.values[r]![c] = value;
  }

  snapshot(): DpTableSnapshot {
    return {
      rowHeaders: this.rowHeaders,
      colHeaders: this.colHeaders,
      cells: this.values.map((row) => row.map((value) => (value === null ? null : this.format(value)))),
      ...(this.corner === undefined ? {} : { corner: this.corner }),
    };
  }
}

const tableFrame = (table: Table, step: number, phase: AlgorithmPhase, line: number, message: string, meta: DpMeta = {}): DpFrame => ({
  step,
  domain: 'array',
  phase,
  status: phase === 'complete' ? 'completed' : 'running',
  data: table.snapshot(),
  activeIds: meta.current === undefined ? [] : [`${meta.current[0]}-${meta.current[1]}`],
  pseudocode: { line },
  message,
  description: message,
  meta,
});

// ---------- числа Фибоначчи ----------

/** Наивная рекурсия или рекурсия с мемоизацией — в виде дерева вызовов. */
export function* fibonacciCallTree(n: number, memo: boolean): Generator<TreeFrame, void, unknown> {
  interface Call {
    readonly id: string;
    readonly k: number;
    readonly parent: string | null;
    readonly side: 0 | 1;
    value: number | null;
    cached: boolean;
  }
  const calls: Call[] = [];
  const cache = new Map<number, number>();
  const counts = new Map<number, number>();
  let step = 0;
  let current: string | null = null;
  const label = memo ? 'Рекурсия с мемоизацией' : 'Наивная рекурсия';

  const nodes = (): TreeDiagramNode[] =>
    calls.map((call) => {
      const repeated = !memo && (counts.get(call.k) ?? 0) > 1;
      const tone: TreeTone = call.id === current ? 'active' : call.cached ? 'found' : call.value !== null ? (repeated ? 'new' : 'done') : 'path';
      return {
        key: call.id,
        label: `F${call.k}`,
        parentKey: call.parent,
        side: call.side,
        tone,
        ...(call.value === null ? {} : { sublabel: `= ${call.value}` }),
      };
    });

  const frame = (phase: AlgorithmPhase, line: number, message: string) =>
    treeFrame(step++, phase, label, nodes(), line, message, {
      output: memo
        ? [...cache.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `F${k}=${v}`)
        : [...counts.entries()].sort((a, b) => b[0] - a[0]).map(([k, count]) => `F${k} ×${count}`),
      outputLabel: memo ? 'Кеш' : 'Вызовов',
    });

  yield frame(
    'initial',
    1,
    memo
      ? `Считаем F(${n}) рекурсией, но каждый результат запоминаем в кеше. Повторный вызов с тем же k сразу вернёт готовое значение.`
      : `Считаем F(${n}) по определению: F(k) = F(k − 1) + F(k − 2). Посмотрим, сколько раз вычисляются одни и те же значения.`,
  );

  let counter = 0;
  function* call(k: number, parent: string | null, side: 0 | 1): Generator<TreeFrame, number, unknown> {
    counter += 1;
    const node: Call = { id: `c${counter}`, k, parent, side, value: null, cached: false };
    calls.push(node);
    counts.set(k, (counts.get(k) ?? 0) + 1);
    const previous = current;
    current = node.id;
    if (memo && cache.has(k)) {
      node.value = cache.get(k)!;
      node.cached = true;
      yield frame('visit', 2, `F(${k}) уже в кеше — возвращаем ${node.value} без новых вызовов.`);
      current = previous;
      return node.value;
    }
    if (k <= 1) {
      node.value = k;
      if (memo) cache.set(k, k);
      yield frame('visit', 3, `F(${k}) = ${k} — база рекурсии.`);
      current = previous;
      return k;
    }
    yield frame(
      'push',
      4,
      `Вызов F(${k}): нужно F(${k - 1}) и F(${k - 2}).${!memo && (counts.get(k) ?? 0) > 1 ? ` F(${k}) вычисляется уже ${counts.get(k)}-й раз!` : ''}`,
    );
    const left = yield* call(k - 1, node.id, 0);
    const right = yield* call(k - 2, node.id, 1);
    node.value = left + right;
    if (memo) cache.set(k, node.value);
    current = node.id;
    yield frame('merge', 5, `F(${k}) = ${left} + ${right} = ${node.value}${memo ? ' — запоминаем в кеше' : ''}.`);
    current = previous;
    return node.value;
  }

  const result = yield* call(n, null, 0);
  const repeats = [...counts.entries()].filter(([, count]) => count > 1).sort((a, b) => b[0] - a[0]);
  yield frame(
    'complete',
    6,
    memo
      ? `F(${n}) = ${result}. Всего ${calls.length} ${word(calls.length, 'вызов', 'вызова', 'вызовов')}: каждое значение считается один раз — O(n).`
      : `F(${n}) = ${result}, но понадобилось ${calls.length} ${word(calls.length, 'вызов', 'вызова', 'вызовов')}. Повторы: ${repeats.map(([k, count]) => `F(${k}) × ${count}`).join(', ')}. Число вызовов растёт экспоненциально — примерно как 1,6ⁿ.`,
  );
}

/** Табличное решение снизу вверх. */
export function* fibonacciTable(n: number): Generator<DpFrame, void, unknown> {
  const table = new Table(
    ['F'],
    Array.from({ length: n + 1 }, (_, k) => String(k)),
    String,
    'k',
  );
  let step = 0;
  yield tableFrame(table, step++, 'initial', 1, `Заполним таблицу F[0…${n}] слева направо: каждое значение зависит только от двух предыдущих.`);
  table.set(0, 0, 0);
  if (n >= 1) table.set(0, 1, 1);
  yield tableFrame(table, step++, 'push', 2, 'База: F[0] = 0, F[1] = 1.', { current: [0, Math.min(1, n)] });
  for (let k = 2; k <= n; k += 1) {
    const value = table.get(0, k - 1) + table.get(0, k - 2);
    table.set(0, k, value);
    yield tableFrame(table, step++, 'merge', 3, `F[${k}] = F[${k - 1}] + F[${k - 2}] = ${table.get(0, k - 1)} + ${table.get(0, k - 2)} = ${value}.`, {
      current: [0, k],
      deps: [
        [0, k - 1],
        [0, k - 2],
      ],
    });
  }
  yield tableFrame(
    table,
    step,
    'complete',
    4,
    `F(${n}) = ${table.get(0, n)}. Каждая ячейка — одно сложение: O(n) времени. Хранить можно только два последних значения — O(1) памяти.`,
    {
      current: [0, n],
      answer: String(table.get(0, n)),
    },
  );
}

// ---------- размен монет ----------

export function* coinChange(coins: readonly number[], amount: number): Generator<DpFrame, void, unknown> {
  const sorted = [...new Set(coins)].filter((coin) => coin > 0).sort((a, b) => a - b);
  const INF = Number.POSITIVE_INFINITY;
  const table = new Table(
    ['монет'],
    Array.from({ length: amount + 1 }, (_, s) => String(s)),
    (value) => (Number.isFinite(value) ? String(value) : '∞'),
    'сумма',
  );
  const from = new Map<number, number>();
  let step = 0;

  yield tableFrame(
    table,
    step++,
    'initial',
    1,
    `dp[s] — наименьшее число монет из {${sorted.join(', ')}}, которыми набирается сумма s. Заполним таблицу от 0 до ${amount}.`,
  );
  table.set(0, 0, 0);
  for (let s = 1; s <= amount; s += 1) table.set(0, s, INF);
  yield tableFrame(table, step++, 'push', 1, 'dp[0] = 0: нулевую сумму набирают без монет. Остальные пока ∞ — «набрать нельзя».', { current: [0, 0] });

  for (let s = 1; s <= amount; s += 1) {
    const options = sorted.filter((coin) => coin <= s);
    const deps: Cell[] = options.map((coin) => [0, s - coin]);
    let best = INF;
    let bestCoin: number | null = null;
    for (const coin of options) {
      const candidate = table.get(0, s - coin) + 1;
      if (candidate < best) {
        best = candidate;
        bestCoin = coin;
      }
    }
    table.set(0, s, best);
    if (bestCoin !== null && Number.isFinite(best)) from.set(s, bestCoin);
    yield tableFrame(
      table,
      step++,
      'merge',
      bestCoin === null || !Number.isFinite(best) ? 4 : 3,
      options.length === 0
        ? `Сумма ${s}: все монеты больше неё — набрать нельзя, dp[${s}] = ∞.`
        : `Сумма ${s}: ${options.map((coin) => `монета ${coin} → dp[${s - coin}] + 1 = ${Number.isFinite(table.get(0, s - coin)) ? table.get(0, s - coin) + 1 : '∞'}`).join('; ')}. ${Number.isFinite(best) ? `Минимум — ${best}, последняя монета ${bestCoin}.` : 'Ни один вариант не работает — ∞.'}`,
      { current: [0, s], deps, ...(bestCoin === null || !Number.isFinite(best) ? {} : { best: [0, s - bestCoin] as Cell }) },
    );
  }

  const total = table.get(0, amount);
  if (!Number.isFinite(total)) {
    yield tableFrame(table, step, 'complete', 4, `dp[${amount}] = ∞: сумму ${amount} нельзя набрать монетами {${sorted.join(', ')}}.`, {
      current: [0, amount],
      outcome: 'miss',
    });
    return;
  }
  const used: number[] = [];
  const path: Cell[] = [];
  for (let s = amount; s > 0; s -= from.get(s)!) {
    path.push([0, s]);
    used.push(from.get(s)!);
  }
  path.push([0, 0]);
  yield tableFrame(
    table,
    step,
    'complete',
    5,
    `Ответ: ${total} ${word(total, 'монета', 'монеты', 'монет')} — ${used.join(' + ')} = ${amount}. Набор восстановлен шагами назад по запомненным монетам.`,
    { path, answer: String(total), details: used.map(String), detailsLabel: 'Монеты' },
  );
}

// ---------- рюкзак 0/1 ----------

export interface KnapsackItem {
  readonly weight: number;
  readonly value: number;
}

export function* knapsack(items: readonly KnapsackItem[], capacity: number): Generator<DpFrame, void, unknown> {
  const table = new Table(
    ['∅', ...items.map((item, index) => `${index + 1}: ${item.weight}/${item.value}`)],
    Array.from({ length: capacity + 1 }, (_, w) => String(w)),
    String,
    'вес',
  );
  let step = 0;
  yield tableFrame(
    table,
    step++,
    'initial',
    1,
    `dp[i][w] — наибольшая ценность из первых i предметов при вместимости w. Строки — предметы «вес/ценность», столбцы — вместимость от 0 до ${capacity}.`,
  );
  for (let w = 0; w <= capacity; w += 1) table.set(0, w, 0);
  yield tableFrame(table, step++, 'push', 1, 'Без предметов ценность 0 при любой вместимости.', { current: [0, 0] });

  for (let i = 1; i <= items.length; i += 1) {
    const { weight, value } = items[i - 1]!;
    for (let w = 0; w <= capacity; w += 1) {
      const skip = table.get(i - 1, w);
      if (weight > w) {
        table.set(i, w, skip);
        yield tableFrame(table, step++, 'merge', 2, `Предмет ${i} (вес ${weight}) не помещается при w = ${w}: dp[${i}][${w}] = dp[${i - 1}][${w}] = ${skip}.`, {
          current: [i, w],
          deps: [[i - 1, w]],
          best: [i - 1, w],
        });
        continue;
      }
      const take = table.get(i - 1, w - weight) + value;
      const chosen = Math.max(skip, take);
      table.set(i, w, chosen);
      yield tableFrame(
        table,
        step++,
        'merge',
        take > skip ? 4 : 3,
        `w = ${w}: не брать — ${skip}; взять предмет ${i} — dp[${i - 1}][${w - weight}] + ${value} = ${take}. ${take > skip ? 'Выгоднее взять' : 'Выгоднее не брать'}: ${chosen}.`,
        {
          current: [i, w],
          deps: [
            [i - 1, w],
            [i - 1, w - weight],
          ],
          best: take > skip ? [i - 1, w - weight] : [i - 1, w],
        },
      );
    }
  }

  const path: Cell[] = [];
  const taken: number[] = [];
  let w = capacity;
  for (let i = items.length; i > 0; i -= 1) {
    path.push([i, w]);
    if (table.get(i, w) !== table.get(i - 1, w)) {
      taken.unshift(i);
      w -= items[i - 1]!.weight;
    }
  }
  path.push([0, w]);
  const best = table.get(items.length, capacity);
  const weightSum = taken.reduce((sum, index) => sum + items[index - 1]!.weight, 0);
  yield tableFrame(
    table,
    step,
    'complete',
    5,
    taken.length === 0
      ? `Ни один предмет не помещается — ценность 0.`
      : `Наибольшая ценность — ${best}: предметы ${taken.join(', ')} (вес ${weightSum} из ${capacity}). Восстановили набор снизу вверх: если значение отличается от строки выше, предмет взят.`,
    { path, answer: String(best), details: taken.map((index) => `№${index}: ${items[index - 1]!.weight}/${items[index - 1]!.value}`), detailsLabel: 'Взяты' },
  );
}

// ---------- наибольшая общая подпоследовательность ----------

export function* lcs(a: string, b: string): Generator<DpFrame, void, unknown> {
  const table = new Table(['∅', ...a], ['∅', ...b], String);
  let step = 0;
  yield tableFrame(
    table,
    step++,
    'initial',
    1,
    `dp[i][j] — длина наибольшей общей подпоследовательности первых i букв «${a}» и первых j букв «${b}». Первая строка и столбец — пустые префиксы, там нули.`,
  );
  for (let i = 0; i <= a.length; i += 1) table.set(i, 0, 0);
  for (let j = 0; j <= b.length; j += 1) table.set(0, j, 0);
  yield tableFrame(table, step++, 'push', 1, 'С пустой строкой общих букв нет — нули по краям.', { current: [0, 0] });

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        table.set(i, j, table.get(i - 1, j - 1) + 1);
        yield tableFrame(
          table,
          step++,
          'merge',
          2,
          `«${a[i - 1]}» = «${b[j - 1]}» — буквы совпали: dp[${i}][${j}] = dp[${i - 1}][${j - 1}] + 1 = ${table.get(i, j)}.`,
          {
            current: [i, j],
            deps: [[i - 1, j - 1]],
            best: [i - 1, j - 1],
          },
        );
      } else {
        const up = table.get(i - 1, j);
        const left = table.get(i, j - 1);
        table.set(i, j, Math.max(up, left));
        yield tableFrame(
          table,
          step++,
          'merge',
          3,
          `«${a[i - 1]}» ≠ «${b[j - 1]}»: берём лучшее без одной из букв — max(${up}, ${left}) = ${table.get(i, j)}.`,
          {
            current: [i, j],
            deps: [
              [i - 1, j],
              [i, j - 1],
            ],
            best: up >= left ? [i - 1, j] : [i, j - 1],
          },
        );
      }
    }
  }

  const path: Cell[] = [];
  const letters: string[] = [];
  let i = a.length;
  let j = b.length;
  while (i > 0 && j > 0) {
    path.push([i, j]);
    if (a[i - 1] === b[j - 1]) {
      letters.unshift(a[i - 1]!);
      i -= 1;
      j -= 1;
    } else if (table.get(i - 1, j) >= table.get(i, j - 1)) i -= 1;
    else j -= 1;
  }
  path.push([i, j]);
  const result = letters.join('');
  yield tableFrame(
    table,
    step,
    'complete',
    4,
    result.length === 0
      ? `Общих букв нет — длина 0.`
      : `Длина НОП — ${result.length}: «${result}». Путь назад по таблице: по диагонали там, где буквы совпали, иначе — к большему соседу.`,
    { path, answer: result, details: letters, detailsLabel: 'Подпоследовательность', ...(result.length === 0 ? { outcome: 'miss' as const } : {}) },
  );
}

// ---------- расстояние Левенштейна ----------

export function* editDistance(a: string, b: string): Generator<DpFrame, void, unknown> {
  const table = new Table(['∅', ...a], ['∅', ...b], String);
  let step = 0;
  yield tableFrame(
    table,
    step++,
    'initial',
    1,
    `dp[i][j] — сколько правок (вставка, удаление, замена) нужно, чтобы первые i букв «${a}» превратить в первые j букв «${b}».`,
  );
  for (let i = 0; i <= a.length; i += 1) table.set(i, 0, i);
  for (let j = 0; j <= b.length; j += 1) table.set(0, j, j);
  yield tableFrame(table, step++, 'push', 1, 'Края: из i букв в пустую строку — i удалений, из пустой в j букв — j вставок.', { current: [0, 0] });

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        table.set(i, j, table.get(i - 1, j - 1));
        yield tableFrame(
          table,
          step++,
          'merge',
          2,
          `«${a[i - 1]}» = «${b[j - 1]}» — правка не нужна: dp[${i}][${j}] = dp[${i - 1}][${j - 1}] = ${table.get(i, j)}.`,
          {
            current: [i, j],
            deps: [[i - 1, j - 1]],
            best: [i - 1, j - 1],
          },
        );
        continue;
      }
      const replace = table.get(i - 1, j - 1) + 1;
      const remove = table.get(i - 1, j) + 1;
      const insert = table.get(i, j - 1) + 1;
      const best = Math.min(replace, remove, insert);
      table.set(i, j, best);
      const bestCell: Cell = best === replace ? [i - 1, j - 1] : best === remove ? [i - 1, j] : [i, j - 1];
      yield tableFrame(
        table,
        step++,
        'merge',
        3,
        `«${a[i - 1]}» ≠ «${b[j - 1]}»: заменить — ${replace}, удалить «${a[i - 1]}» — ${remove}, вставить «${b[j - 1]}» — ${insert}. Минимум ${best}.`,
        {
          current: [i, j],
          deps: [
            [i - 1, j - 1],
            [i - 1, j],
            [i, j - 1],
          ],
          best: bestCell,
        },
      );
    }
  }

  const path: Cell[] = [];
  const operations: string[] = [];
  let i = a.length;
  let j = b.length;
  while (i > 0 || j > 0) {
    path.push([i, j]);
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1] && table.get(i, j) === table.get(i - 1, j - 1)) {
      i -= 1;
      j -= 1;
    } else if (i > 0 && j > 0 && table.get(i, j) === table.get(i - 1, j - 1) + 1) {
      operations.unshift(`заменить «${a[i - 1]}» → «${b[j - 1]}»`);
      i -= 1;
      j -= 1;
    } else if (i > 0 && table.get(i, j) === table.get(i - 1, j) + 1) {
      operations.unshift(`удалить «${a[i - 1]}»`);
      i -= 1;
    } else {
      operations.unshift(`вставить «${b[j - 1]}»`);
      j -= 1;
    }
  }
  path.push([0, 0]);
  const distance = table.get(a.length, b.length);
  yield tableFrame(
    table,
    step,
    'complete',
    4,
    distance === 0 ? 'Строки совпадают — расстояние 0.' : `Расстояние Левенштейна — ${distance}. Правки: ${operations.join(', ')}.`,
    { path, answer: String(distance), details: operations, detailsLabel: 'Правки' },
  );
}
