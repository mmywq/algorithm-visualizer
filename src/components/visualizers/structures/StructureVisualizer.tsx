import type { StructureAlgorithmFrame } from '@/types';

interface StructureVisualizerProps {
  readonly frame: StructureAlgorithmFrame | null;
}

export function StructureVisualizer({ frame }: StructureVisualizerProps) {
  const snapshot = frame?.data;
  const isTreeLike =
    snapshot?.label.includes('BST') === true ||
    snapshot?.label.includes('куча') === true ||
    snapshot?.label.includes('Куча') === true;

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <h2 className="text-2xl font-bold text-white">{snapshot?.label ?? 'Визуализация структуры'}</h2>

      {snapshot?.buckets !== undefined ? (
        <HashTableView frame={frame} />
      ) : isTreeLike ? (
        <TreeView frame={frame} />
      ) : (
        <div className="mt-4 flex flex-wrap gap-3">
          {snapshot?.cells.map((cell, index) => (
            <div className="relative" key={cell.id}>
              {Object.entries(frame?.meta.pointers ?? {}).filter(([, pointerIndex]) => pointerIndex === index).map(([label]) => (
                <PointerBadge label={label} key={label} />
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

      <p className="mt-4 text-slate-300">{frame?.message ?? 'Запустите плеер для демонстрации.'}</p>
    </section>
  );
}



function HashTableView({ frame }: { readonly frame: StructureAlgorithmFrame | null }) {
  const buckets = frame?.data.buckets ?? [];
  const activeBucketIndex = frame?.meta.bucketIndex;
  const activeKey = frame?.meta.key;

  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/50">
      <table className="min-w-full border-collapse text-left text-sm text-slate-300">
        <caption className="px-4 py-3 text-left text-sm leading-6 text-slate-300">
          Хеш-таблица показана именно как таблица: каждая строка — корзина или блок, слева её индекс, справа содержимое цепочки/ячейки. Активная строка подсвечивается, чтобы было видно, куда попал текущий ключ.
        </caption>
        <thead className="bg-slate-900 text-xs uppercase tracking-[0.16em] text-slate-400">
          <tr>
            <th className="border-t border-slate-800 px-4 py-3">Индекс</th>
            <th className="border-t border-slate-800 px-4 py-3">Адресация</th>
            <th className="border-t border-slate-800 px-4 py-3">Содержимое</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((bucket) => {
            const isActive = activeBucketIndex === bucket.index;
            return (
              <tr className={isActive ? 'bg-cyan-500/10 text-cyan-100' : 'odd:bg-slate-900/40'} key={bucket.id}>
                <th className="border-t border-slate-800 px-4 py-3 font-mono text-base text-slate-100">{bucket.index}</th>
                <td className="border-t border-slate-800 px-4 py-3">
                  {isActive && activeKey !== undefined ? `ключ ${activeKey} → строка ${bucket.index}` : 'ожидает ключ'}
                </td>
                <td className="border-t border-slate-800 px-4 py-3">
                  {bucket.values.length === 0 ? (
                    <span className="text-slate-500">пусто</span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {bucket.values.map((value, valueIndex) => (
                        <span className="inline-flex items-center gap-2" key={`${bucket.id}-${valueIndex}`}>
                          <span className="rounded-xl border border-cyan-700/60 bg-cyan-500/15 px-3 py-2 font-semibold text-cyan-100">{value}</span>
                          {valueIndex < bucket.values.length - 1 && <span className="text-slate-500">→</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PointerBadge({ label }: { readonly label: string }) {
  return (
    <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-violet-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
      {getPointerLabel(label)}
    </div>
  );
}

const getPointerLabel = (label: string): string => {
  const labels: Record<string, string> = {
    head: 'голова head',
    tail: 'хвост tail',
    top: 'вершина top',
    i: 'индекс i',
  };
  return labels[label] ?? label;
};

function TreeView({ frame }: { readonly frame: StructureAlgorithmFrame | null }) {
  const nodes = buildTreeLayout(frame?.data.cells ?? [], frame?.meta.activeIndex);
  const visibleNodes = nodes.filter((node) => node.value !== null || node.isActive);
  const visibleNodeIndexes = new Set(visibleNodes.map((node) => node.index));
  const edges = visibleNodes
    .map((node) => {
      if (node.index === 0) return null;
      const parentIndex = Math.floor((node.index - 1) / 2);
      const parent = nodes.find((candidate) => candidate.index === parentIndex);
      if (parent === undefined || !visibleNodeIndexes.has(parentIndex)) return null;
      return { id: `${parentIndex}-${node.index}`, parent, child: node };
    })
    .filter((edge): edge is { id: string; parent: TreeLayoutNode; child: TreeLayoutNode } => edge !== null);
  const height = Math.max(220, Math.min(520, Math.max(1, getTreeLevelCount(frame?.data.cells.length ?? 0)) * 96));

  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="relative min-w-[720px]" style={{ height }}>
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
          {edges.map((edge) => (
            <line
              key={edge.id}
              stroke={edge.child.isActive || edge.parent.isActive ? '#67e8f9' : '#475569'}
              strokeLinecap="round"
              strokeWidth={edge.child.isActive || edge.parent.isActive ? 0.65 : 0.42}
              x1={edge.parent.x}
              x2={edge.child.x}
              y1={edge.parent.y + 3.5}
              y2={edge.child.y - 3.5}
            />
          ))}
        </svg>

        {visibleNodes.map((node) => (
          <div
            className={
              node.isActive
                ? 'absolute flex h-14 min-w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-300 bg-cyan-500 px-3 text-center text-sm font-bold text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.45)]'
                : 'absolute flex h-14 min-w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-600 bg-slate-900 px-3 text-center text-sm font-bold text-slate-100'
            }
            key={node.id}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            title={`Индекс массива: ${node.index}`}
          >
            {node.value ?? '·'}
          </div>
        ))}
      </div>
    </div>
  );
}

interface TreeLayoutNode {
  readonly id: string;
  readonly index: number;
  readonly value: number | null;
  readonly x: number;
  readonly y: number;
  readonly isActive: boolean;
}

const buildTreeLayout = (
  cells: readonly { id: string; value: number | null }[],
  activeIndex: number | undefined,
): readonly TreeLayoutNode[] => {
  const levelCount = Math.max(1, getTreeLevelCount(cells.length));
  const yStep = levelCount <= 1 ? 0 : 84 / (levelCount - 1);

  return cells.map((cell, index) => {
    const level = Math.floor(Math.log2(index + 1));
    const levelStart = 2 ** level - 1;
    const positionInLevel = index - levelStart;
    const nodesInLevel = 2 ** level;

    return {
      id: cell.id,
      index,
      value: cell.value,
      x: ((positionInLevel + 1) / (nodesInLevel + 1)) * 100,
      y: levelCount <= 1 ? 50 : 8 + level * yStep,
      isActive: activeIndex === index,
    };
  });
};

const getTreeLevelCount = (cellCount: number): number => {
  if (cellCount <= 0) return 1;
  return Math.floor(Math.log2(cellCount)) + 1;
};
