import { motion } from 'framer-motion';
import type { ArrayAlgorithmFrame, ArrayItem, SortComparisonRow } from '@/types';

interface ArrayVisualizerProps {
  readonly frame: ArrayAlgorithmFrame | null;
}

const MIN_BAR_HEIGHT_PX = 32;
const MAX_BAR_HEIGHT_PX = 260;

export function ArrayVisualizer({ frame }: ArrayVisualizerProps) {
  const items = frame?.data ?? [];
  const maxValue = Math.max(...items.map((item) => Math.abs(item.value)), 1);
  const comparisonRows = frame?.meta.comparisonRows ?? [];

  return (
    <section className="rounded-3xl border border-app bg-surface p-6 shadow-2xl shadow-slate-950/10">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300">
            Визуализация массива
          </p>
          <h2 className="mt-2 text-2xl font-bold text-app-primary">Сортировка массива</h2>
        </div>
        <div className="rounded-2xl border border-app bg-surface px-4 py-3 text-sm text-app-muted">
          Строка псевдокода: <span className="font-semibold text-cyan-200">{frame?.pseudocode.line ?? '—'}</span>
        </div>
      </div>

      <div className="flex min-h-[320px] items-end justify-center gap-3 rounded-2xl border border-app bg-surface p-5">
        {items.map((item, index) => (
          <ArrayBar frame={frame} index={index} item={item} key={item.id} maxValue={maxValue} />
        ))}
      </div>

      <p className="mt-5 min-h-12 rounded-2xl border border-app bg-surface px-4 py-3 text-sm leading-6 text-app-muted">
        {frame?.message ?? 'Загрузите алгоритм, чтобы увидеть пошаговую визуализацию.'}
      </p>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-app-muted">
        <Legend color="#06b6d4" label="сравнение" />
        <Legend color="#f97316" label="обмен" />
        <Legend color="#10b981" label="отсортировано" />
      </div>

      {comparisonRows.length > 0 && <SortComparisonTable rows={comparisonRows} />}
    </section>
  );
}

interface ArrayBarProps {
  readonly frame: ArrayAlgorithmFrame | null;
  readonly index: number;
  readonly item: ArrayItem;
  readonly maxValue: number;
}

function ArrayBar({ frame, index, item, maxValue }: ArrayBarProps) {
  const height = Math.max(MIN_BAR_HEIGHT_PX, (Math.abs(item.value) / maxValue) * MAX_BAR_HEIGHT_PX);
  const tone = getBarTone(frame, index);

  return (
    <motion.div
      animate={{ height }}
      className="flex w-14 flex-col items-center justify-end gap-2"
      layout
      transition={{ damping: 24, stiffness: 260, type: 'spring' }}
    >
      <motion.div
        animate={{ backgroundColor: tone.background, boxShadow: tone.shadow }}
        className="flex w-full items-end justify-center rounded-t-2xl border border-white/10 px-2 pb-2 text-sm font-bold text-white"
        style={{ height }}
        transition={{ duration: 0.2 }}
      >
        {item.value}
      </motion.div>
      <span className="text-xs text-slate-500">{index}</span>
    </motion.div>
  );
}

const getBarTone = (frame: ArrayAlgorithmFrame | null, index: number) => {
  if (frame?.meta.sortedIndices?.includes(index) === true) {
    return {
      background: '#10b981',
      shadow: '0 0 22px rgba(16, 185, 129, 0.35)',
    };
  }

  if (frame?.meta.swappingIndices?.includes(index) === true) {
    return {
      background: '#f97316',
      shadow: '0 0 22px rgba(249, 115, 22, 0.45)',
    };
  }

  if (frame?.meta.comparingIndices?.includes(index) === true) {
    return {
      background: '#06b6d4',
      shadow: '0 0 22px rgba(6, 182, 212, 0.45)',
    };
  }

  return {
    background: '#475569',
    shadow: '0 0 0 rgba(0, 0, 0, 0)',
  };
};


function Legend({ color, label }: { color: string; label: string }) {
  return (<span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />{label}</span>);
}


function SortComparisonTable({ rows }: { readonly rows: readonly SortComparisonRow[] }) {
  return (
    <div className="mt-5 overflow-x-auto rounded-2xl border border-app bg-slate-950/40">
      <table className="min-w-full border-collapse text-left text-xs text-app-muted">
        <caption className="px-4 py-3 text-left text-sm font-semibold text-app-primary">
          Таблица сравнения сортировок: все алгоритмы запускаются на одном и том же наборе, поэтому числа операций можно сопоставлять напрямую.
        </caption>
        <thead className="bg-slate-900/80 text-[11px] uppercase tracking-[0.16em] text-slate-400">
          <tr>
            <th className="border-t border-app px-4 py-3">Алгоритм</th>
            <th className="border-t border-app px-4 py-3">Что делает</th>
            <th className="border-t border-app px-4 py-3">Итоговый массив</th>
            <th className="border-t border-app px-4 py-3 text-right">Сравнения</th>
            <th className="border-t border-app px-4 py-3 text-right">Записи/обмены</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className={row.isBest === true ? 'bg-emerald-500/10 text-emerald-100' : 'odd:bg-slate-900/30'} key={row.name}>
              <th className="border-t border-app px-4 py-3 font-semibold text-app-primary">{row.name}{row.isBest === true ? ' — меньше операций' : ''}</th>
              <td className="border-t border-app px-4 py-3 leading-5">{row.idea}</td>
              <td className="border-t border-app px-4 py-3 font-mono">[{row.sortedValues.join(', ')}]</td>
              <td className="border-t border-app px-4 py-3 text-right font-mono">{row.comparisons}</td>
              <td className="border-t border-app px-4 py-3 text-right font-mono">{row.writes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
