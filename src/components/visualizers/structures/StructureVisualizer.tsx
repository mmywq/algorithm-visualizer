import type { StructureAlgorithmFrame } from '@/types';

interface StructureVisualizerProps {
  readonly frame: StructureAlgorithmFrame | null;
}

export function StructureVisualizer({ frame }: StructureVisualizerProps) {
  const snapshot = frame?.data;
  const isHashTable = snapshot?.label.includes('Хеш-таблица') === true;
  const isTreeLike =
    snapshot?.label.includes('BST') === true ||
    snapshot?.label.includes('куча') === true ||
    snapshot?.label.includes('Куча') === true;

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <h2 className="text-2xl font-bold text-white">{snapshot?.label ?? 'Визуализация структуры'}</h2>

      {isHashTable ? (
        <HashTableView frame={frame} />
      ) : isTreeLike ? (
        <div className="mt-4 space-y-3">
          {chunkTreeLevels(snapshot?.cells ?? []).map((level, levelIndex) => (
            <div className="flex justify-center gap-3" key={`level-${levelIndex}`}>
              {level.map(({ value, id, index }) => (
                <div
                  className={
                    frame?.meta.activeIndex === index
                      ? 'h-14 min-w-14 rounded-full border border-cyan-300 bg-cyan-500/30 px-3 text-center leading-[3.5rem] text-cyan-100 shadow-lg shadow-cyan-500/20'
                      : 'h-14 min-w-14 rounded-full border border-slate-700 bg-slate-950 px-3 text-center leading-[3.5rem] text-slate-200'
                  }
                  key={id}
                >
                  {value ?? '·'}
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-3">
          {snapshot?.cells.map((cell, index) => (
            <div className="relative" key={cell.id}>
              {Object.entries(frame?.meta.pointers ?? {}).filter(([, pointerIndex]) => pointerIndex === index).map(([label]) => (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 rounded bg-violet-500 px-1.5 py-0.5 text-[10px] font-semibold text-white" key={label}>{label}</div>
              ))}
              <div
                className={
                  frame?.meta.activeIndex === index
                    ? 'h-16 w-16 rounded-xl border border-cyan-300 bg-cyan-500/30 text-center leading-[4rem] text-cyan-100'
                    : 'h-16 w-16 rounded-xl border border-slate-700 bg-slate-950 text-center leading-[4rem] text-slate-200'
                }
              >
                {cell.value ?? '·'}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-300">{frame?.message ?? 'Запусти плеер для демонстрации.'}</p>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
        <Legend color="bg-violet-400" label="текущий элемент" />
        <Legend color="bg-cyan-400" label="сравнение / активная ячейка" />
        <Legend color="bg-emerald-400" label="размещено / посещено" />
      </div>
    </section>
  );
}

function HashTableView({ frame }: { readonly frame: StructureAlgorithmFrame | null }) {
  const cells = frame?.data.cells ?? [];
  const tableSize = Math.max(5, Math.min(8, cells.length));
  const buckets = Array.from({ length: tableSize }, (_, index) => ({ index, values: [] as number[] }));

  for (const cell of cells) {
    if (cell.value === null) continue;
    const bucketIndex = Math.abs(cell.value) % tableSize;
    buckets[bucketIndex]?.values.push(cell.value);
  }

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-950/80 text-left text-slate-300">
            <th className="w-24 border border-slate-800 px-3 py-2">Индекс</th>
            <th className="border border-slate-800 px-3 py-2">Корзина / цепочка коллизий</th>
            <th className="w-32 border border-slate-800 px-3 py-2">Пояснение</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((bucket) => {
            const isActive = bucket.index === frame?.meta.activeIndex || bucket.values.includes(Number(frame?.data.cells[frame?.meta.activeIndex ?? -1]?.value));
            return (
              <tr className={isActive ? 'bg-cyan-500/10' : 'bg-slate-900/40'} key={bucket.index}>
                <td className="border border-slate-800 px-3 py-3 font-mono text-cyan-200">{bucket.index}</td>
                <td className="border border-slate-800 px-3 py-3">
                  <div className="flex min-h-10 flex-wrap items-center gap-2">
                    {bucket.values.length === 0 ? (
                      <span className="rounded-xl border border-dashed border-slate-700 px-3 py-2 text-slate-500">пусто</span>
                    ) : (
                      bucket.values.map((value, position) => (
                        <span className="inline-flex items-center gap-2" key={`${bucket.index}-${value}-${position}`}>
                          {position > 0 && <span className="text-slate-500">→</span>}
                          <span className="rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-3 py-2 font-semibold text-emerald-100">{value}</span>
                        </span>
                      ))
                    )}
                  </div>
                </td>
                <td className="border border-slate-800 px-3 py-3 text-slate-400">h(key) mod {tableSize} = {bucket.index}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Legend({ color, label }: { readonly color: string; readonly label: string }) {
  return (<span className="inline-flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>);
}

const chunkTreeLevels = (cells: readonly { id: string; value: number | null }[]) => {
  const levels: Array<Array<{ id: string; value: number | null; index: number }>> = [];
  let levelStart = 0;
  let levelSize = 1;

  while (levelStart < cells.length) {
    const levelCells = cells.slice(levelStart, levelStart + levelSize).map((cell, offset) => ({
      id: cell.id,
      value: cell.value,
      index: levelStart + offset,
    }));
    levels.push(levelCells);
    levelStart += levelSize;
    levelSize *= 2;
  }

  return levels;
};
