import type { AlgorithmFrame, AlgorithmPhase } from '@/types';
import { plural } from '@/lib/plural';

export interface StringSnapshot {
  readonly text: string;
  readonly pattern: string;
}

export interface StringMeta extends Record<string, unknown> {
  /** сдвиг образца относительно текста */
  readonly shift: number;
  /** индекс в образце, который сравнивается сейчас */
  readonly j?: number;
  readonly state?: 'match' | 'mismatch';
  /** символы образца, уже совпавшие на текущем сдвиге */
  readonly matched?: number;
  /** найденные вхождения (сдвиги) */
  readonly found: readonly number[];
  readonly comparisons: number;
  /** префикс-функция КМП; null — ещё не вычислена */
  readonly pi?: readonly (number | null)[];
  readonly piFocus?: { readonly i: number; readonly k: number };
  /** хеши Рабина — Карпа */
  readonly windowHash?: number;
  readonly patternHash?: number;
  readonly spurious?: readonly number[];
  readonly building?: boolean;
  readonly outcome?: 'hit' | 'miss';
}

export type StringFrame = AlgorithmFrame<StringSnapshot, StringMeta>;

const word = plural;
const comparisonsText = (count: number): string => `${count} ${word(count, 'сравнение', 'сравнения', 'сравнений')}`;

const makeFrame =
  (text: string, pattern: string) =>
  (step: number, phase: AlgorithmPhase, line: number, message: string, meta: StringMeta): StringFrame => ({
    step,
    domain: 'array',
    phase,
    status: phase === 'complete' ? 'completed' : 'running',
    data: { text, pattern },
    activeIds: [],
    pseudocode: { line },
    message,
    description: message,
    meta,
  });

const finish = (found: readonly number[], m: number, comparisons: number, n: number): string =>
  found.length === 0
    ? `Вхождений нет. Выполнено ${comparisonsText(comparisons)} символов.`
    : `Найдено ${found.length} ${word(found.length, 'вхождение', 'вхождения', 'вхождений')} — с позиций ${found.join(', ')}. Выполнено ${comparisonsText(comparisons)}; в худшем случае наивному поиску нужно ${(n - m + 1) * m}.`;

/** Наивный поиск: образец прикладывается к каждой позиции и сравнивается слева направо. */
export function* naiveSearch(text: string, pattern: string): Generator<StringFrame, void, unknown> {
  const frame = makeFrame(text, pattern);
  const n = text.length;
  const m = pattern.length;
  const found: number[] = [];
  let comparisons = 0;
  let step = 0;

  yield frame(
    step++,
    'initial',
    1,
    `Ищем «${pattern}» в «${text}». Прикладываем образец к каждой из ${Math.max(0, n - m + 1)} ${word(Math.max(0, n - m + 1), 'позиции', 'позиций', 'позиций')} и сравниваем символы слева направо.`,
    {
      shift: 0,
      found,
      comparisons,
    },
  );

  for (let s = 0; s + m <= n; s += 1) {
    let j = 0;
    while (j < m) {
      comparisons += 1;
      const ok = text[s + j] === pattern[j];
      yield frame(
        step++,
        'compare',
        ok ? 2 : 3,
        ok
          ? `Сдвиг ${s}: T[${s + j}] = «${text[s + j]}» совпадает с P[${j}].`
          : `Сдвиг ${s}: T[${s + j}] = «${text[s + j]}» ≠ P[${j}] = «${pattern[j]}» — сдвигаем образец на 1.`,
        {
          shift: s,
          j,
          state: ok ? 'match' : 'mismatch',
          matched: j,
          found: [...found],
          comparisons,
        },
      );
      if (!ok) break;
      j += 1;
    }
    if (j === m) {
      found.push(s);
      yield frame(
        step++,
        'visit',
        4,
        m === 1 ? `Символ совпал — вхождение с позиции ${s}.` : `Все ${m} ${word(m, 'символ', 'символа', 'символов')} совпали — вхождение с позиции ${s}.`,
        { shift: s, matched: m, found: [...found], comparisons },
      );
    }
  }

  yield frame(step, 'complete', 5, finish(found, m, comparisons, n), {
    shift: Math.max(0, n - m),
    found,
    comparisons,
    ...(found.length === 0 ? { outcome: 'miss' as const } : {}),
  });
}

/** Кнут — Моррис — Пратт: префикс-функция позволяет не возвращаться назад по тексту. */
export function* kmpSearch(text: string, pattern: string): Generator<StringFrame, void, unknown> {
  const frame = makeFrame(text, pattern);
  const n = text.length;
  const m = pattern.length;
  const pi: (number | null)[] = Array.from({ length: m }, () => null);
  const found: number[] = [];
  let comparisons = 0;
  let step = 0;

  pi[0] = 0;
  yield frame(
    step++,
    'initial',
    1,
    `Сначала строим префикс-функцию образца «${pattern}»: π[i] — длина самого длинного собственного префикса P[0…i], который одновременно является его суффиксом. π[0] = 0.`,
    { shift: 0, found, comparisons, pi: [...pi], building: true },
  );

  let k = 0;
  for (let i = 1; i < m; i += 1) {
    while (k > 0 && pattern[i] !== pattern[k]) {
      comparisons += 1;
      yield frame(step++, 'compare', 2, `P[${i}] = «${pattern[i]}» ≠ P[${k}] = «${pattern[k]}» — откатываемся: k ← π[${k - 1}] = ${pi[k - 1]}.`, {
        shift: 0,
        found,
        comparisons,
        pi: [...pi],
        piFocus: { i, k },
        building: true,
      });
      k = pi[k - 1]!;
    }
    comparisons += 1;
    const ok = pattern[i] === pattern[k];
    if (ok) k += 1;
    pi[i] = k;
    yield frame(
      step++,
      'merge',
      3,
      ok
        ? `P[${i}] = «${pattern[i]}» = P[${k - 1}] — префикс удлинился: π[${i}] = ${k}.`
        : `P[${i}] = «${pattern[i]}» не продолжает ни один префикс: π[${i}] = 0.`,
      { shift: 0, found, comparisons, pi: [...pi], piFocus: { i, k: Math.max(0, k - (ok ? 1 : 0)) }, building: true },
    );
  }

  yield frame(step++, 'inspect', 4, `Префикс-функция готова: [${pi.join(', ')}]. Теперь идём по тексту один раз, ни разу не возвращаясь назад.`, {
    shift: 0,
    found,
    comparisons,
    pi: [...pi],
  });

  let q = 0;
  for (let i = 0; i < n; i += 1) {
    while (q > 0 && text[i] !== pattern[q]) {
      comparisons += 1;
      const before = q;
      q = pi[q - 1]!;
      yield frame(
        step++,
        'discard',
        4,
        `T[${i}] = «${text[i]}» ≠ P[${before}] = «${pattern[before]}». Совпавшие ${before} ${word(before, 'символ', 'символа', 'символов')} не пропадают: их конец совпадает с префиксом длины π[${before - 1}] = ${q}. Сдвигаем образец сразу на ${before - q}.`,
        { shift: i - q, j: q, matched: q, state: 'mismatch', found: [...found], comparisons, pi: [...pi] },
      );
    }
    comparisons += 1;
    const ok = text[i] === pattern[q];
    yield frame(step++, 'compare', 5, `T[${i}] = «${text[i]}» ${ok ? '=' : '≠'} P[${q}] = «${pattern[q]}»${ok ? `: совпало ${q + 1} из ${m}` : ''}.`, {
      shift: i - q,
      j: q,
      matched: q,
      state: ok ? 'match' : 'mismatch',
      found: [...found],
      comparisons,
      pi: [...pi],
    });
    if (ok) q += 1;
    if (q === m) {
      found.push(i - m + 1);
      q = pi[q - 1]!;
      yield frame(
        step++,
        'visit',
        6,
        `Образец совпал целиком — вхождение с позиции ${i - m + 1}. Продолжаем с q ← π[${m - 1}] = ${q}, чтобы найти и перекрывающиеся вхождения.`,
        {
          shift: i - m + 1,
          matched: m,
          found: [...found],
          comparisons,
          pi: [...pi],
        },
      );
    }
  }

  yield frame(
    step,
    'complete',
    6,
    `${found.length === 0 ? 'Вхождений нет.' : `Найдено ${found.length} ${word(found.length, 'вхождение', 'вхождения', 'вхождений')} — с позиций ${found.join(', ')}.`} Всего ${comparisonsText(comparisons)}: не больше 2(n + m) — указатель по тексту ни разу не вернулся назад.`,
    { shift: Math.max(0, n - m), found, comparisons, pi: [...pi], ...(found.length === 0 ? { outcome: 'miss' as const } : {}) },
  );
}

export const RK_BASE = 10;
export const RK_MOD = 13;

/** «Числовое значение» символа: цифры — сами собой, буквы — номер в алфавите. */
export const charValue = (char: string): number => {
  if (/\d/.test(char)) return Number(char);
  const lower = char.toLowerCase();
  const latin = 'abcdefghijklmnopqrstuvwxyz'.indexOf(lower);
  if (latin >= 0) return latin + 1;
  const cyrillic = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя'.indexOf(lower);
  if (cyrillic >= 0) return cyrillic + 1;
  return (char.codePointAt(0) ?? 0) % 50;
};

/** Рабин — Карп: сравниваем хеши окон, а символы — только когда хеши совпали. */
export function* rabinKarp(text: string, pattern: string): Generator<StringFrame, void, unknown> {
  const frame = makeFrame(text, pattern);
  const n = text.length;
  const m = pattern.length;
  const found: number[] = [];
  const spurious: number[] = [];
  let comparisons = 0;
  let step = 0;
  const power = (() => {
    let result = 1;
    for (let k = 1; k < m; k += 1) result = (result * RK_BASE) % RK_MOD;
    return result;
  })();
  const hashOf = (value: string): number => [...value].reduce((h, char) => (h * RK_BASE + charValue(char)) % RK_MOD, 0);

  if (m > n) {
    yield frame(step, 'complete', 5, 'Образец длиннее текста — вхождений быть не может.', { shift: 0, found, comparisons, outcome: 'miss' });
    return;
  }

  const patternHash = hashOf(pattern);
  let windowHash = hashOf(text.slice(0, m));
  yield frame(
    step++,
    'initial',
    1,
    `Каждый символ — число (цифра или номер буквы), строка длины ${m} — число в системе с основанием ${RK_BASE}. Хеш — остаток от деления на ${RK_MOD}. h(«${pattern}») = ${patternHash}, h(«${text.slice(0, m)}») = ${windowHash}.`,
    { shift: 0, found, comparisons, patternHash, windowHash, spurious },
  );

  for (let s = 0; s + m <= n; s += 1) {
    const equal = windowHash === patternHash;
    yield frame(
      step++,
      'compare',
      2,
      `Сдвиг ${s}: хеш окна «${text.slice(s, s + m)}» = ${windowHash} ${equal ? '=' : '≠'} ${patternHash}${equal ? ' — кандидат, проверяем символы.' : ' — точно не вхождение, символы не сравниваем.'}`,
      {
        shift: s,
        found: [...found],
        comparisons,
        patternHash,
        windowHash,
        spurious: [...spurious],
      },
    );
    if (equal) {
      let j = 0;
      while (j < m) {
        comparisons += 1;
        const ok = text[s + j] === pattern[j];
        yield frame(step++, 'compare', 3, `Проверка: T[${s + j}] = «${text[s + j]}» ${ok ? '=' : '≠'} P[${j}] = «${pattern[j]}».`, {
          shift: s,
          j,
          matched: j,
          state: ok ? 'match' : 'mismatch',
          found: [...found],
          comparisons,
          patternHash,
          windowHash,
          spurious: [...spurious],
        });
        if (!ok) break;
        j += 1;
      }
      if (j === m) {
        found.push(s);
        yield frame(step++, 'visit', 3, `Символы совпали — вхождение с позиции ${s}.`, {
          shift: s,
          matched: m,
          found: [...found],
          comparisons,
          patternHash,
          windowHash,
          spurious: [...spurious],
        });
      } else {
        spurious.push(s);
        yield frame(
          step++,
          'discard',
          3,
          `Хеши равны, а строки разные — это коллизия (ложное срабатывание). Поэтому после совпадения хешей символы всегда проверяют.`,
          {
            shift: s,
            found: [...found],
            comparisons,
            patternHash,
            windowHash,
            spurious: [...spurious],
          },
        );
      }
    }
    if (s + m < n) {
      const out = charValue(text[s]!);
      const incoming = charValue(text[s + m]!);
      const next = (((windowHash - ((out * power) % RK_MOD) + RK_MOD) % RK_MOD) * RK_BASE + incoming) % RK_MOD;
      yield frame(
        step++,
        'swap',
        4,
        `Сдвигаем окно за O(1): убираем «${text[s]}» (${out}), дописываем «${text[s + m]}» (${incoming}): h = ((${windowHash} − ${out}·${power}) · ${RK_BASE} + ${incoming}) mod ${RK_MOD} = ${next}.`,
        { shift: s + 1, found: [...found], comparisons, patternHash, windowHash: next, spurious: [...spurious] },
      );
      windowHash = next;
    }
  }

  yield frame(
    step,
    'complete',
    5,
    `${found.length === 0 ? 'Вхождений нет.' : `Найдено ${found.length} ${word(found.length, 'вхождение', 'вхождения', 'вхождений')} — с позиций ${found.join(', ')}.`} Символы сравнивались лишь ${comparisonsText(comparisons)}${spurious.length > 0 ? `, коллизий: ${spurious.length}` : ''}. С большим простым модулем коллизии почти не случаются, и поиск идёт за O(n + m) в среднем.`,
    { shift: Math.max(0, n - m), found, comparisons, patternHash, windowHash, spurious, ...(found.length === 0 ? { outcome: 'miss' as const } : {}) },
  );
}
