import type { StructureAlgorithmFrame } from '@/types';

interface StructureVisualizerProps {
  readonly frame: StructureAlgorithmFrame | null;
}

export function StructureVisualizer({ frame }: StructureVisualizerProps) {
  const snapshot = frame?.data;

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <h2 className="text-2xl font-bold text-white">{snapshot?.label ?? 'Structure Visualizer'}</h2>
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
      <p className="mt-4 text-slate-300">{frame?.message ?? 'Запусти плеер для демонстрации.'}</p>
    </section>
  );
}
