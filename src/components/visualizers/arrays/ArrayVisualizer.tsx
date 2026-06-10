import { motion } from 'framer-motion';
import { ColorLegend } from '@/components/common/ColorLegend';
import type { ArrayAlgorithmFrame, ArrayItem, SortComparisonRow } from '@/types';

interface ArrayVisualizerProps {
  readonly frame: ArrayAlgorithmFrame | null;
  readonly title?: string;
}

const PLOT_HEIGHT_PX = 280;
const MIN_BAR_HEIGHT_PX = 24;

export function ArrayVisualizer({ frame, title = 'Массив' }: ArrayVisualizerProps) {
  const items = frame?.data ?? [];
  const values = items.map((item) => item.value);
  const maxPositive = Math.max(0, ...values);
  const maxNegative = Math.max(0, ...values.map((value) => -value));
  const hasNegative = maxNegative > 0;
  const scale = maxPositive + maxNegative === 0 ? 0 : PLOT_HEIGHT_PX / (maxPositive + maxNegative);
  const baselineTopPx = maxPositive * scale;
  const comparisonRows = frame?.meta.comparisonRows ?? [];
  const comparisonInsights = frame?.meta.comparisonInsights ?? [];

  return (
    <section className="app-panel">
      <h2 className="text-xl font-semibold text-app-primary">{title}</h2>

      <div className="relative mt-4 rounded-2xl border border-app bg-slate-950/50 px-5 pb-9 pt-5">
        {hasNegative && (
          <>
            <div
              className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-slate-500/70"
              style={{ top: `${baselineTopPx + 20}px` }}
            />
            <span
              className="pointer-events-none absolute left-1.5 -translate-y-1/2 text-[10px] font-semibold text-slate-400"
              style={{ top: `${baselineTopPx + 20}px` }}
            >
              0
            </span>
          </>
        )}

        <div className="flex items-stretch justify-center gap-2.5 overflow-x-auto" style={{ height: PLOT_HEIGHT_PX }}>
          {items.map((item, index) => (
            <ArrayBar
              baselineTopPx={baselineTopPx}
              frame={frame}
              index={index}
              item={item}
              key={item.id}
              scale={scale}
            />
          ))}
          {items.length === 0 && (
            <p className="self-center text-sm text-app-muted">Задайте входные данные, чтобы увидеть массив.</p>
          )}
        </div>
      </div>

      <p className="mt-4 min-h-[72px] rounded-2xl border border-app bg-surface px-4 py-3 text-sm leading-6 text-app-muted">
        {frame?.message ?? 'Нажмите «Старт» или листайте шаги кнопками — здесь будет описание текущего действия.'}
      </p>

      <div className="mt-3">
        <ColorLegend
          items={[
            { color: '#06b6d4', label: 'сравниваемые элементы' },
            { color: '#f97316', label: 'обмен или запись' },
            { color: '#10b981', label: 'элемент на итоговом месте' },
            { color: '#475569', label: 'остальные элементы' },
            { color: '#a855f7', label: 'вспомогательная структура' },
          ]}
        />
      </div>

      {frame?.meta.auxiliaryArray !== undefined && (
        <div className="mt-4 rounded-2xl border border-app bg-surface p-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-300">Вспомогательный массив</p>
          <p className="mt-1 text-sm text-app-muted">Счётчики, корзины или промежуточные значения, которые алгоритм использует параллельно с основным массивом.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {frame.meta.auxiliaryArray.map((value, index) => (
              <span className="inline-flex min-w-12 flex-col items-center rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-sm font-semibold text-violet-100" key={`${index}-${value}`}>
                <span>{value}</span>
                <span className="mt-1 text-[10px] font-normal text-violet-200/70">{index}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {comparisonRows.length > 0 && <SortComparisonTable rows={comparisonRows} />}

      {comparisonInsights.length > 0 && (
        <div className="mt-4 rounded-2xl border border-app bg-surface p-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Выводы по этому набору данных</p>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-app-muted">
            {comparisonInsights.map((insight) => (
              <li key={insight.slice(0, 40)}>{insight}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

interface ArrayBarProps {
  readonly frame: ArrayAlgorithmFrame | null;
  readonly index: number;
  readonly item: ArrayItem;
  readonly baselineTopPx: number;
  readonly scale: number;
}

function ArrayBar({ frame, index, item, baselineTopPx, scale }: ArrayBarProps) {
  const isNegative = item.value < 0;
  const rawHeight = Math.abs(item.value) * scale;
  const height = item.value === 0 ? 6 : Math.max(MIN_BAR_HEIGHT_PX, rawHeight);
  const top = isNegative ? baselineTopPx : Math.max(0, baselineTopPx - height);
  const tone = getBarTone(frame, index);

  return (
    <motion.div className="relative w-12 shrink-0" layout transition={{ damping: 26, stiffness: 300, type: 'spring' }}>
      <motion.div
        animate={{ backgroundColor: tone.background, height, top }}
        className={`absolute left-0 right-0 flex justify-center border border-white/10 text-sm font-bold text-white ${isNegative ? 'items-end rounded-b-xl pb-1' : 'items-start rounded-t-xl pt-1'}`}
        initial={false}
        style={{ boxShadow: tone.shadow }}
        transition={{ duration: 0.25 }}
      >
        {item.value}
      </motion.div>
      <span className="absolute -bottom-7 left-0 right-0 text-center text-xs text-slate-500">{index}</span>
    </motion.div>
  );
}

const getBarTone = (frame: ArrayAlgorithmFrame | null, index: number) => {
  if (frame?.meta.sortedIndices?.includes(index) === true) {
    return { background: '#10b981', shadow: '0 0 18px rgba(16, 185, 129, 0.3)' };
  }
  if (frame?.meta.swappingIndices?.includes(index) === true) {
    return { background: '#f97316', shadow: '0 0 18px rgba(249, 115, 22, 0.4)' };
  }
  if (frame?.meta.comparingIndices?.includes(index) === true) {
    return { background: '#06b6d4', shadow: '0 0 18px rgba(6, 182, 212, 0.4)' };
  }
  return { background: '#475569', shadow: '0 0 0 rgba(0, 0, 0, 0)' };
};

function SortComparisonTable({ rows }: { readonly rows: readonly SortComparisonRow[] }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-app bg-slate-950/40">
      <table className="min-w-full border-collapse text-left text-xs text-app-muted">
        <caption className="px-4 py-3 text-left text-sm font-semibold text-app-primary">
          Таблица сравнения: все алгоритмы запускаются на одном и том же исходном наборе, поэтому показатели сопоставимы напрямую.
        </caption>
        <thead className="bg-slate-900/80 text-[11px] uppercase tracking-[0.16em] text-slate-400">
          <tr>
            <th className="border-t border-app px-4 py-3">Алгоритм</th>
            <th className="border-t border-app px-4 py-3">Принцип работы</th>
            <th className="border-t border-app px-4 py-3">Итоговый массив</th>
            <th className="border-t border-app px-4 py-3 text-right">Сравнения</th>
            <th className="border-t border-app px-4 py-3 text-right">Записи/обмены</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className={row.isBest === true ? 'bg-emerald-500/10 text-emerald-100' : 'odd:bg-slate-900/30'} key={row.name}>
              <th className="border-t border-app px-4 py-3 font-semibold text-app-primary">{row.name}{row.isBest === true ? ' — меньше всего операций' : ''}</th>
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
