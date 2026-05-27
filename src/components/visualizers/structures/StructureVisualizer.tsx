import type { StructureAlgorithmFrame } from '@/types';

interface StructureVisualizerProps {
  readonly frame: StructureAlgorithmFrame | null;
}

export function StructureVisualizer({ frame }: StructureVisualizerProps) {
  const snapshot = frame?.data;
  const isTreeLike = snapshot?.label.includes('BST') === true || snapshot?.label.includes('Heap') === true;

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <h2 className="text-2xl font-bold text-white">{snapshot?.label ?? 'Визуализация структуры'}</h2>
      {isTreeLike ? (
        <div className="mt-4 space-y-3">
          {chunkTreeLevels(snapshot?.cells ?? []).map((level, levelIndex) => (
            <div className="flex justify-center gap-3" key={`level-${levelIndex}`}>
              {level.map(({ value, id, index }) => (
                <div
                  className={
                    frame?.meta.activeIndex === index
                      ? 'h-14 min-w-14 rounded-full border border-cyan-300 bg-cyan-500/30 px-3 text-center leading-[3.5rem] text-cyan-100'
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
            <div
              className={
                frame?.meta.activeIndex === index
                  ? 'h-16 w-16 rounded-xl border border-cyan-300 bg-cyan-500/30 text-center leading-[4rem] text-cyan-100'
                  : 'h-16 w-16 rounded-xl border border-slate-700 bg-slate-950 text-center leading-[4rem] text-slate-200'
              }
              key={cell.id}
            >
              {cell.value ?? '·'}
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 text-slate-300">{frame?.message ?? 'Запусти плеер для демонстрации.'}</p>
    </section>
  );
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
