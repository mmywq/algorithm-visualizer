import { motion } from 'framer-motion';
import { Flag, Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { createArrayItems } from '@/algorithms/arrays/utils';
import { buildComparisonInsights, createSortComparisonRuns, toComparisonRow, type SortSimulationResult } from '@/algorithms/sorting/extra';
import { ArrayBars } from '@/components/visualizers/arrays/ArrayBars';
import { InsightsList, SortComparisonTable } from '@/components/visualizers/arrays/ArrayExtras';
import sortingTheory from '@/content/theory/sorting';
import { DemoLayout } from '@/features/demo/DemoLayout';
import { NumbersInput } from '@/features/demo/NumbersInput';
import { useDemoPlayer } from '@/features/player/useDemoPlayer';
import type { FrameSet } from '@/features/player/usePlayer';
import { numbersCodec, useUrlState } from '@/hooks/useUrlState';
import type { AlgorithmFrame, ArrayAlgorithmFrame } from '@/types';

const DEFAULT_VALUES = [34, -12, 56, 7, 7, 89, -3, 22];

type RaceFrame = AlgorithmFrame<{ readonly tick: number }, Record<string, never>>;

const laneColors = ['orange', 'brand', 'green', 'purple', 'pink', 'teal'] as const;

/** Кадр дорожки на заданном такте гонки. */
const laneFrame = (run: SortSimulationResult, tick: number): ArrayAlgorithmFrame => {
  const finished = tick >= run.animationSteps.length;
  const step = run.animationSteps[Math.min(tick, run.animationSteps.length - 1)];
  const values = finished ? run.sorted : (step?.values ?? run.sorted);
  return {
    step: tick,
    domain: 'array',
    phase: finished ? 'complete' : (step?.phase ?? 'inspect'),
    status: finished ? 'completed' : 'running',
    data: createArrayItems(values),
    activeIds: [],
    pseudocode: { line: 3 },
    message: step?.message ?? '',
    meta: finished
      ? { sortedIndices: values.map((_, index) => index) }
      : {
          ...(step?.comparingIndices === undefined ? {} : { comparingIndices: step.comparingIndices }),
          ...(step?.swappingIndices === undefined ? {} : { swappingIndices: step.swappingIndices }),
          ...(step?.sortedIndices === undefined ? {} : { sortedIndices: step.sortedIndices }),
        },
  };
};

export default function SortRaceDemo() {
  const [values, setValues] = useUrlState('in', DEFAULT_VALUES, numbersCodec({ min: -99, max: 99, maxCount: 14 }));
  const runs = useMemo(() => createSortComparisonRuns(values), [values]);
  const finishOrder = useMemo(() => [...runs].sort((a, b) => a.animationSteps.length - b.animationSteps.length), [runs]);
  const totalTicks = Math.max(...runs.map((run) => run.animationSteps.length));

  const frameSet = useMemo<FrameSet<RaceFrame>>(() => {
    const frames: RaceFrame[] = [];
    for (let tick = 0; tick <= totalTicks; tick += 1) {
      const finished = finishOrder.filter((run) => run.animationSteps.length <= tick);
      const last = tick === totalTicks;
      frames.push({
        step: tick,
        domain: 'array',
        phase: last ? 'complete' : tick === 0 ? 'initial' : 'compare',
        status: last ? 'completed' : 'running',
        data: { tick },
        activeIds: [],
        pseudocode: { line: tick === 0 ? 2 : last ? 5 : 3 },
        message:
          tick === 0
            ? `Старт! Шесть сортировок получают одинаковые копии массива [${values.join(', ')}]. На каждом такте каждая делает одно действие: сравнение или запись.`
            : last
              ? `Финиш. Быстрее всех по числу шагов справилась «${finishOrder[0]?.name}». Ниже — таблица с точным числом сравнений и записей и выводы по этим данным.`
              : finished.length === 0
                ? `Такт ${tick}: все алгоритмы ещё в пути.`
                : `Такт ${tick}: финишировали ${finished.map((run) => `«${run.name}»`).join(', ')}.`,
        meta: {},
      });
    }
    return { frames, truncated: false };
  }, [finishOrder, totalTicks, values]);

  const player = useDemoPlayer(frameSet);
  const tick = player.index;
  const rows = useMemo(() => {
    const best = runs.reduce((acc, run) => (run.comparisons + run.writes < acc.comparisons + acc.writes ? run : acc), runs[0]!);
    return runs.map((run) => ({ ...toComparisonRow(run), isBest: run.name === best.name }));
  }, [runs]);
  const insights = useMemo(() => {
    const best = runs.reduce((acc, run) => (run.comparisons + run.writes < acc.comparisons + acc.writes ? run : acc), runs[0]!);
    return buildComparisonInsights(values, runs, best);
  }, [runs, values]);

  return (
    <DemoLayout
      data={{
        summary: `[${values.join(', ')}]`,
        editor: <NumbersInput maxSize={14} onApply={setValues} scenarios value={values} />,
      }}
      player={player}
      pseudocode={sortingTheory['sort-race']?.pseudocode ?? []}
      resultExtra={
        <>
          <SortComparisonTable rows={rows} />
          <InsightsList insights={insights} />
        </>
      }
      resultInput={`[${values.join(', ')}]`}
      stage={
        <div className="grid gap-2.5 sm:grid-cols-2">
          {runs.map((run, index) => {
            const done = tick >= run.animationSteps.length;
            const place = finishOrder.indexOf(run) + 1;
            const color = laneColors[index % laneColors.length]!;
            return (
              <div
                className="rounded-2xl border-2 border-line bg-surface p-2.5"
                key={run.name}
                style={{ '--cat': `var(--c-${color})`, '--cat-press': `var(--c-${color}-press)` } as React.CSSProperties}
              >
                <div className="mb-2 flex items-center gap-2 px-1">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-cat" />
                  <p className="min-w-0 flex-1 truncate text-[14px] font-black text-ink">{run.name}</p>
                  {done ? (
                    <motion.span
                      animate={{ scale: 1 }}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-black ${place === 1 ? 'bg-yellow text-on' : 'bg-green/15 text-green'}`}
                      initial={{ scale: 0.5 }}
                    >
                      {place === 1 ? <Trophy size={12} strokeWidth={3} /> : <Flag size={12} strokeWidth={3} />}
                      {place} место
                    </motion.span>
                  ) : (
                    <span className="font-mono text-xs font-bold text-ink-3">
                      {Math.min(tick, run.animationSteps.length)}/{run.animationSteps.length}
                    </span>
                  )}
                </div>
                <ArrayBars frame={laneFrame(run, tick)} height={120} showIndices={false} />
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-cat transition-[width] duration-200"
                    style={{ width: `${Math.min(1, tick / run.animationSteps.length) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      }
    />
  );
}
