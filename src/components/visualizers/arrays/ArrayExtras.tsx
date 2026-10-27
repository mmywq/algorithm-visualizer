import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { ease, spring } from '@/lib/motion';
import type { ArrayAlgorithmFrame, SortComparisonRow } from '@/types';

/** Вспомогательный массив (счётчики, корзины, буфер слияния) под основной сценой. */
export function AuxiliaryStrip({ frame }: { readonly frame: ArrayAlgorithmFrame | null }) {
  const values = frame?.meta.auxiliaryArray;
  if (values === undefined) return null;
  return (
    <div className="mt-3 rounded-2xl bg-surface-2 p-3">
      <p className="mb-2 px-1 text-[13px] font-black text-ink-2">{frame?.meta.auxiliaryLabel ?? 'Вспомогательный массив'}</p>
      <div className="flex flex-wrap gap-1.5">
        {values.map((value, index) => (
          <motion.span
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex min-w-11 flex-col items-center rounded-xl border-2 border-pink/40 bg-pink/10 px-2.5 py-1.5"
            initial={{ scale: 0.8, opacity: 0 }}
            key={`${index}-${value}`}
          >
            <span className="font-mono text-[15px] font-black text-ink">{value}</span>
            <span className="font-mono text-[10px] font-bold text-ink-3">{index}</span>
          </motion.span>
        ))}
      </div>
    </div>
  );
}

/** Живые счётчики операций, посчитанные по уже показанным кадрам. */
export function OperationCounters({ frames, index }: { readonly frames: readonly ArrayAlgorithmFrame[]; readonly index: number }) {
  let comparisons = 0;
  let writes = 0;
  for (let i = 0; i <= index && i < frames.length; i += 1) {
    const phase = frames[i]!.phase;
    if (phase === 'compare') comparisons += 1;
    if (phase === 'swap' || phase === 'merge') writes += 1;
  }
  const items = [
    { label: 'Сравнений', value: comparisons, color: 'brand' },
    { label: 'Обменов и записей', value: writes, color: 'orange' },
  ];
  return (
    <section className="card grid grid-cols-2 gap-3 p-4">
      {items.map((item) => (
        <div className="rounded-2xl bg-surface-2 px-3.5 py-3" key={item.label}>
          <p className="text-[13px] font-extrabold text-ink-3">{item.label}</p>
          <motion.p
            animate={{ scale: [1.15, 1] }}
            className="font-mono text-[28px] font-black leading-tight tabular"
            key={item.value}
            style={{ color: `rgb(var(--c-${item.color}))` }}
            transition={{ duration: 0.25, ease: ease.out }}
          >
            {item.value}
          </motion.p>
        </div>
      ))}
    </section>
  );
}

export function SortComparisonTable({ rows }: { readonly rows: readonly SortComparisonRow[] }) {
  if (rows.length === 0) return null;
  const maxOps = Math.max(1, ...rows.map((row) => row.comparisons + row.writes));
  return (
    <section className="card overflow-hidden">
      <h3 className="px-5 pt-5 text-[17px] font-black text-ink">Таблица сравнения</h3>
      <p className="px-5 text-sm font-semibold text-ink-2">Все алгоритмы получают одну и ту же исходную копию массива — показатели сопоставимы напрямую.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-left">
          <thead>
            <tr className="bg-surface-2 text-[13px] font-extrabold text-ink-2">
              <th className="px-5 py-2.5" scope="col">
                Алгоритм
              </th>
              <th className="px-3 py-2.5 text-right" scope="col">
                Сравнения
              </th>
              <th className="px-3 py-2.5 text-right" scope="col">
                Записи
              </th>
              <th className="px-5 py-2.5" scope="col">
                Всего операций
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const total = row.comparisons + row.writes;
              return (
                <tr className={`border-t-2 border-line ${row.isBest === true ? 'bg-green/8' : ''}`} key={row.name}>
                  <th className="px-5 py-3 text-[15px] font-extrabold text-ink" scope="row">
                    <span className="inline-flex items-center gap-2">
                      {row.isBest === true && <Trophy className="text-yellow" size={16} strokeWidth={2.75} />}
                      {row.name}
                    </span>
                    <span className="block text-[13px] font-semibold text-ink-3">{row.idea}</span>
                  </th>
                  <td className="px-3 py-3 text-right font-mono font-bold text-brand">{row.comparisons}</td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-orange">{row.writes}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-line">
                        <motion.div
                          animate={{ clipPath: `inset(0 ${100 - (total / maxOps) * 100}% 0 0 round 999px)` }}
                          className={`h-full w-full rounded-full ${row.isBest === true ? 'bg-green' : 'bg-cat'}`}
                          initial={{ clipPath: 'inset(0 100% 0 0 round 999px)' }}
                          transition={spring.gentle}
                        />
                      </div>
                      <span className="w-10 text-right font-mono text-sm font-black text-ink">{total}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function InsightsList({ insights }: { readonly insights: readonly string[] }) {
  if (insights.length === 0) return null;
  return (
    <section className="card p-5">
      <h3 className="text-[17px] font-black text-ink">Выводы по этому набору данных</h3>
      <ul className="mt-3 flex flex-col gap-2.5">
        {insights.map((insight) => (
          <li className="rounded-2xl bg-surface-2 px-4 py-3 text-[15px] font-semibold leading-6 text-ink" key={insight.slice(0, 40)}>
            {insight}
          </li>
        ))}
      </ul>
    </section>
  );
}
