import { motion } from 'framer-motion';
import type { ArrayAlgorithmFrame, ArrayItem } from '@/types';

interface ArrayVisualizerProps {
  readonly frame: ArrayAlgorithmFrame | null;
}

const MIN_BAR_HEIGHT_PX = 32;
const MAX_BAR_HEIGHT_PX = 260;

export function ArrayVisualizer({ frame }: ArrayVisualizerProps) {
  const items = frame?.data ?? [];
  const maxValue = Math.max(...items.map((item) => item.value), 1);

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
  const height = Math.max(MIN_BAR_HEIGHT_PX, (item.value / maxValue) * MAX_BAR_HEIGHT_PX);
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
