import { motion } from 'framer-motion';
import { useCallback } from 'react';
import { binarySearch, interpolationSearch, jumpSearch, linearSearch, searchBounds, type SearchCounters } from '@/algorithms/arrays/searching';
import theory from '@/content/theory/search';
import { ArrayAlgorithmDemo } from '@/demos/shared/ArrayAlgorithmDemo';
import { KeyField } from '@/features/demo/KeyField';
import type { LegendItem } from '@/features/demo/Legend';
import { intCodec, useUrlState } from '@/hooks/useUrlState';
import { pluralize } from '@/lib/progress';
import type { ArrayAlgorithmFrame, PseudocodeLine } from '@/types';

type SearchRun = (values: readonly number[], key: number) => Generator<ArrayAlgorithmFrame, void, unknown>;

const legend: readonly LegendItem[] = [
  { color: 'rgb(var(--c-brand))', label: 'проверяется' },
  { color: 'rgb(var(--c-yellow))', label: 'найден' },
  { color: 'rgb(var(--c-yellow))', label: 'уровень ключа', shape: 'line' },
  { color: 'rgb(var(--viz-bar))', label: 'ещё кандидаты' },
  { color: 'rgb(var(--viz-empty))', label: 'отброшены' },
];

const pick = <T,>(list: readonly T[]): T | undefined => list[Math.floor(Math.random() * list.length)];

/** Ключ, которого точно нет в массиве: так удобно показывать неуспешный поиск. */
const missingKey = (values: readonly number[], current: number): number => {
  const present = new Set(values);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const candidates: number[] = [];
  for (let value = min - 3; value <= max + 3; value += 1) if (!present.has(value) && value !== current) candidates.push(value);
  // чаще берём «дырку» внутри диапазона — это интереснее, чем ключ за краем
  const inside = candidates.filter((value) => value > min && value < max);
  return pick(inside.length > 0 && Math.random() < 0.8 ? inside : candidates) ?? max + 1;
};

const presentKey = (values: readonly number[], current: number): number => pick(values.filter((value) => value !== current)) ?? values[0] ?? 0;

interface Bound {
  readonly value: number;
  readonly label: string;
}

/** Сравнения против теоретического худшего случая — главная мысль раздела «Поиск». */
function SearchStats({ frame, bound }: { readonly frame: ArrayAlgorithmFrame | null; readonly bound: Bound | null }) {
  const counters = frame?.meta.counters as SearchCounters | undefined;
  const comparisons = counters?.comparisons ?? 0;
  const candidates = counters?.candidates ?? frame?.data.length ?? 0;
  const share = bound === null || bound.value === 0 ? 0 : Math.min(1, comparisons / bound.value);

  return (
    <section className="card p-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-surface-2 px-3.5 py-3">
          <p className="text-[13px] font-extrabold text-ink-3">Сравнений</p>
          <motion.p
            animate={{ scale: [1.15, 1] }}
            className="font-mono text-[28px] font-black leading-tight text-brand tabular"
            key={comparisons}
            transition={{ duration: 0.25 }}
          >
            {comparisons}
          </motion.p>
        </div>
        <div className="rounded-2xl bg-surface-2 px-3.5 py-3">
          <p className="text-[13px] font-extrabold text-ink-3">Кандидатов</p>
          <motion.p
            animate={{ scale: [1.15, 1] }}
            className="font-mono text-[28px] font-black leading-tight text-teal tabular"
            key={candidates}
            transition={{ duration: 0.25 }}
          >
            {candidates}
          </motion.p>
        </div>
      </div>
      {bound !== null && (
        <div className="mt-3.5">
          <div className="flex items-baseline justify-between gap-3 text-[13px] font-bold text-ink-2">
            <span>{bound.label}</span>
            <span className="font-mono font-black text-ink">
              {comparisons} / {bound.value}
            </span>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface-2">
            <motion.div
              animate={{ width: `${share * 100}%` }}
              className="h-full rounded-full bg-brand"
              initial={false}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            />
          </div>
        </div>
      )}
    </section>
  );
}

interface SearchDemoProps {
  readonly run: SearchRun;
  readonly pseudocode: readonly PseudocodeLine[];
  readonly defaultValues: readonly number[];
  readonly defaultKey: number;
  readonly sorted: boolean;
  readonly bound?: (n: number) => Bound;
}

function SearchDemo({ run, pseudocode, defaultValues, defaultKey, sorted, bound }: SearchDemoProps) {
  const [key, setKey] = useUrlState('k', defaultKey, intCodec(-999, 999));
  const runWithKey = useCallback((values: readonly number[]) => run(values, key), [run, key]);

  return (
    <ArrayAlgorithmDemo
      aside={(frame) => <SearchStats bound={bound === undefined || frame === null ? null : bound(frame.data.length)} frame={frame} />}
      counters={false}
      defaultValues={defaultValues}
      describeInput={(values) => `[${values.join(', ')}], ключ ${key}`}
      input={{
        minSize: 1,
        sortedOnly: sorted,
        scenarios: !sorted,
        hint: sorted ? 'Алгоритм работает только с упорядоченным массивом.' : 'Порядок элементов может быть любым.',
      }}
      legend={legend}
      pseudocode={pseudocode}
      run={runWithKey}
      toolbar={(values) => (
        <div className="flex flex-wrap items-center gap-2">
          <KeyField onApply={setKey} value={key} />
          <button className="btn btn-secondary btn-sm" onClick={() => setKey(presentKey(values, key))} type="button">
            Есть в массиве
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setKey(missingKey(values, key))} type="button">
            Нет в массиве
          </button>
        </div>
      )}
    />
  );
}

const SORTED = [3, 8, 12, 17, 23, 31, 38, 45, 52, 60, 67, 74, 81, 90];
const comparisonsWord = (count: number): string => pluralize(count, 'сравнение', 'сравнения', 'сравнений');

export const LinearSearchDemo = () => (
  <SearchDemo
    bound={(n) => ({ value: searchBounds.linear(n), label: `Худший случай для n = ${n}: ${n} ${comparisonsWord(n)}` })}
    defaultKey={31}
    defaultValues={[42, 18, 64, 9, 73, 31, 55, 27]}
    pseudocode={theory['linear-search']!.pseudocode}
    run={linearSearch}
    sorted={false}
  />
);

export const BinarySearchDemo = () => (
  <SearchDemo
    bound={(n) => {
      const value = searchBounds.binary(n);
      return { value, label: `Худший случай: ⌈log₂(${n} + 1)⌉ = ${value}` };
    }}
    defaultKey={67}
    defaultValues={SORTED}
    pseudocode={theory['binary-search']!.pseudocode}
    run={binarySearch}
    sorted
  />
);

export const InterpolationSearchDemo = () => (
  <SearchDemo
    bound={(n) => {
      const value = searchBounds.binary(n);
      return { value, label: `Бинарному поиску в худшем случае: ${value}` };
    }}
    defaultKey={74}
    defaultValues={SORTED}
    pseudocode={theory['interpolation-search']!.pseudocode}
    run={interpolationSearch}
    sorted
  />
);

export const JumpSearchDemo = () => (
  <SearchDemo
    bound={(n) => {
      const value = searchBounds.jump(n);
      return { value, label: `Худший случай при m = ⌊√${n}⌋: ${value}` };
    }}
    defaultKey={60}
    defaultValues={SORTED}
    pseudocode={theory['jump-search']!.pseudocode}
    run={jumpSearch}
    sorted
  />
);
