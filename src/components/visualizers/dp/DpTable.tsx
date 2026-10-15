import { motion } from 'framer-motion';
import type { Cell, DpFrame } from '@/algorithms/dp/dp';

const same = (a: Cell | undefined, r: number, c: number): boolean => a !== undefined && a[0] === r && a[1] === c;
const inList = (list: readonly Cell[] | undefined, r: number, c: number): boolean => list?.some((cell) => cell[0] === r && cell[1] === c) === true;

/**
 * Таблица динамического программирования: текущая ячейка, ячейки, от которых она зависит,
 * выбранная зависимость и путь восстановления ответа.
 */
export function DpTable({ frame }: { readonly frame: DpFrame | null }) {
  if (frame === null) return null;
  const { rowHeaders, colHeaders, cells, corner } = frame.data;
  const { current, deps, best, path } = frame.meta;
  const size =
    colHeaders.length > 12 ? 'h-8 min-w-8 text-[12px]' : colHeaders.length > 9 ? 'h-9 min-w-9 text-[14px]' : 'h-10 min-w-10 text-[15px] sm:h-11 sm:min-w-11';

  return (
    <div className="viz-stage overflow-x-auto px-2 py-4">
      <table className="mx-auto border-separate font-mono" style={{ borderSpacing: 3 }}>
        <thead>
          <tr>
            <th className="whitespace-nowrap px-1.5 text-right text-[11px] font-extrabold text-ink-3" scope="col">
              {corner ?? ''}
            </th>
            {colHeaders.map((header, c) => (
              <th
                className={`h-7 min-w-8 rounded-md px-1 text-center text-[13px] font-black ${current?.[1] === c ? 'bg-brand/16 text-brand' : 'text-ink-3'}`}
                key={`col-${c}`}
                scope="col"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cells.map((row, r) => (
            <tr key={`row-${r}`}>
              <th
                className={`whitespace-nowrap rounded-md px-1.5 text-right text-[13px] font-black ${current?.[0] === r ? 'bg-brand/16 text-brand' : 'text-ink-3'}`}
                scope="row"
              >
                {rowHeaders[r]}
              </th>
              {row.map((value, c) => {
                const isCurrent = same(current, r, c);
                const isBest = same(best, r, c);
                const isDep = inList(deps, r, c);
                const onPath = inList(path, r, c);
                const tone = isCurrent
                  ? 'border-brand-press bg-brand text-on'
                  : onPath
                    ? 'border-yellow-press bg-yellow text-on'
                    : isBest
                      ? 'border-green bg-green/25 text-ink'
                      : isDep
                        ? 'border-cyan bg-cyan/16 text-ink'
                        : value === null
                          ? 'border-dashed border-line bg-transparent text-ink-3'
                          : 'border-[rgb(var(--viz-node-line))] bg-surface text-ink';
                return (
                  <td className="p-0" key={`${r}-${c}`}>
                    <motion.div
                      animate={{ scale: isCurrent ? 1.08 : 1 }}
                      className={`flex items-center justify-center rounded-lg border-2 font-black transition-colors duration-150 ${tone} ${size}`}
                      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                    >
                      {value ?? '·'}
                    </motion.div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const dpLegend = [
  { color: 'rgb(var(--c-brand))', label: 'вычисляется' },
  { color: 'rgb(var(--c-cyan))', label: 'от чего зависит' },
  { color: 'rgb(var(--c-green))', label: 'выбранный вариант' },
  { color: 'rgb(var(--c-yellow))', label: 'восстановление ответа' },
];
