import type { ReactNode } from 'react';
import type { StructureAlgorithmFrame, StructureCell } from '@/types';

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
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-violet-300">Структура данных</p>
          <h2 className="mt-2 text-2xl font-bold text-white">{snapshot?.label ?? 'Визуализация структуры'}</h2>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-2 text-sm text-slate-400">
          Шаг: <span className="font-semibold text-violet-200">{frame?.step ?? '—'}</span>
        </div>
      </div>

      {isHashTable ? (
        <HashTableView frame={frame} />
      ) : isTreeLike ? (
        <TreeDiagram frame={frame} />
      ) : (
        <LinearCells frame={frame} />
      )}

      <p className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-300">{frame?.message ?? 'Запусти плеер для демонстрации.'}</p>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
        <Legend color="bg-violet-400" label="текущий элемент" />
        <Legend color="bg-cyan-400" label="сравнение / активная ячейка" />
        <Legend color="bg-emerald-400" label="размещено / посещено" />
        <Legend color="bg-slate-500" label="пустая позиция" />
      </div>
    </section>
  );
}

function TreeDiagram({ frame }: { readonly frame: StructureAlgorithmFrame | null }) {
  const cells = frame?.data.cells ?? [];
  const nodes = createTreeNodeViews(cells);
  const edges = createTreeEdges(nodes);
  const height = Math.max(260, (Math.max(0, ...nodes.map((node) => node.level)) + 1) * 92);

  if (cells.length === 0) {
    return <div className="mt-4 rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">Структура пока пуста. Нажмите «Следующий шаг», чтобы увидеть первую вставку.</div>;
  }

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="relative min-w-[720px]" style={{ height }}>
        <svg className="absolute inset-0 h-full w-full" role="img" aria-label="Связи между узлами дерева">
          {edges.map((edge) => (
            <line
              key={`${edge.parent.id}-${edge.child.id}`}
              x1={`${edge.parent.x}%`}
              x2={`${edge.child.x}%`}
              y1={edge.parent.y + 28}
              y2={edge.child.y - 8}
              stroke="#475569"
              strokeDasharray={edge.child.value === null ? '4 5' : undefined}
              strokeWidth="2"
            />
          ))}
        </svg>
        {nodes.map((node) => {
          const isActive = frame?.meta.activeIndex === node.index;
          const isFilled = node.value !== null;
          return (
            <div
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
              key={node.id}
              style={{ left: `${node.x}%`, top: node.y }}
            >
              <div
                className={
                  isActive
                    ? 'flex h-14 min-w-14 items-center justify-center rounded-full border border-violet-200 bg-violet-500/40 px-3 text-center font-bold text-violet-50 shadow-lg shadow-violet-500/30'
                    : isFilled
                      ? 'flex h-14 min-w-14 items-center justify-center rounded-full border border-emerald-400/50 bg-emerald-500/15 px-3 text-center font-bold text-emerald-100'
                      : 'flex h-10 min-w-10 items-center justify-center rounded-full border border-dashed border-slate-700 bg-slate-950 px-2 text-center text-slate-600'
                }
              >
                {node.value ?? '·'}
              </div>
              <span className="rounded bg-slate-950/80 px-1.5 py-0.5 text-[10px] text-slate-500">i={node.index}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LinearCells({ frame }: { readonly frame: StructureAlgorithmFrame | null }) {
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {frame?.data.cells.map((cell, index) => (
        <div className="relative" key={cell.id}>
          {Object.entries(frame?.meta.pointers ?? {}).filter(([, pointerIndex]) => pointerIndex === index).map(([label]) => (
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 rounded bg-violet-500 px-1.5 py-0.5 text-[10px] font-semibold text-white" key={label}>{label}</div>
          ))}
          <div
            className={
              frame?.meta.activeIndex === index
                ? 'h-16 w-16 rounded-xl border border-violet-300 bg-violet-500/30 text-center leading-[4rem] text-violet-100'
                : 'h-16 w-16 rounded-xl border border-slate-700 bg-slate-950 text-center leading-[4rem] text-slate-200'
            }
          >
            {cell.value ?? '·'}
          </div>
        </div>
      ))}
    </div>
  );
}

function HashTableView({ frame }: { readonly frame: StructureAlgorithmFrame | null }) {
  const label = frame?.data.label ?? '';
  const isBlockAddressing = label.includes('блочная');
  const isOpenAddressing = label.includes('открытая адресация');

  if (isBlockAddressing) {
    return <BlockHashTable frame={frame} />;
  }

  if (isOpenAddressing) {
    return <OpenAddressHashTable frame={frame} />;
  }

  return <ChainedHashTable frame={frame} />;
}

function ChainedHashTable({ frame }: { readonly frame: StructureAlgorithmFrame | null }) {
  const cells = frame?.data.cells ?? [];
  const tableSize = getTableSize(frame, 5);
  const activeBucket = frame?.meta.bucketIndex;
  const buckets = Array.from({ length: tableSize }, (_, index) => ({ index, values: [] as number[] }));

  for (const cell of cells) {
    if (cell.value === null) continue;
    const bucketIndex = Math.abs(cell.value) % tableSize;
    buckets[bucketIndex]?.values.push(cell.value);
  }

  return (
    <HashTableShell description={`Индекс считается как h(key) mod ${tableSize}. Если несколько ключей попали в один индекс, они образуют цепочку коллизий.`}>
      {buckets.map((bucket) => (
        <tr className={bucket.index === activeBucket ? 'bg-violet-500/10' : 'bg-slate-900/40'} key={bucket.index}>
          <td className="border border-slate-800 px-3 py-3 font-mono text-cyan-200">{bucket.index}</td>
          <td className="border border-slate-800 px-3 py-3">
            <BucketChain values={bucket.values} />
          </td>
          <td className="border border-slate-800 px-3 py-3 text-slate-400">bucket = key mod {tableSize}</td>
        </tr>
      ))}
    </HashTableShell>
  );
}

function OpenAddressHashTable({ frame }: { readonly frame: StructureAlgorithmFrame | null }) {
  const cells = frame?.data.cells ?? [];
  const tableSize = getTableSize(frame, cells.length || 7);
  const activeIndex = frame?.meta.activeIndex;
  const rows = Array.from({ length: tableSize }, (_, index) => cells[index]?.value ?? null);

  return (
    <HashTableShell description="Открытая адресация хранит ключ прямо в строке таблицы. При коллизии алгоритм пробирует следующую ячейку.">
      {rows.map((value, index) => (
        <tr className={index === activeIndex ? 'bg-violet-500/10' : 'bg-slate-900/40'} key={index}>
          <td className="border border-slate-800 px-3 py-3 font-mono text-cyan-200">{index}</td>
          <td className="border border-slate-800 px-3 py-3">
            {value === null ? <EmptyBucket /> : <HashValue value={value} />}
          </td>
          <td className="border border-slate-800 px-3 py-3 text-slate-400">ячейка массива</td>
        </tr>
      ))}
    </HashTableShell>
  );
}

function BlockHashTable({ frame }: { readonly frame: StructureAlgorithmFrame | null }) {
  const cells = frame?.data.cells ?? [];
  const blockCount = getTableSize(frame, 4);
  const blockSize = typeof frame?.meta.blockSize === 'number' ? frame.meta.blockSize : 2;
  const overflowStartIndex = typeof frame?.meta.overflowStartIndex === 'number' ? frame.meta.overflowStartIndex : blockCount * blockSize;
  const activeBucket = frame?.meta.bucketIndex;
  const overflowValues = cells.slice(overflowStartIndex).map((cell) => cell.value).filter((value): value is number => value !== null);

  return (
    <HashTableShell description={`Блочная адресация сначала выбирает блок h(key) mod ${blockCount}, затем свободную ячейку внутри блока. Переполненные ключи уходят в overflow.`}>
      {Array.from({ length: blockCount }, (_, blockIndex) => {
        const start = blockIndex * blockSize;
        const blockValues = cells.slice(start, start + blockSize).map((cell) => cell.value);
        return (
          <tr className={blockIndex === activeBucket ? 'bg-violet-500/10' : 'bg-slate-900/40'} key={blockIndex}>
            <td className="border border-slate-800 px-3 py-3 font-mono text-cyan-200">Блок {blockIndex}</td>
            <td className="border border-slate-800 px-3 py-3">
              <div className="flex flex-wrap gap-2">
                {blockValues.map((value, offset) => (
                  value === null
                    ? <EmptyBucket key={`${blockIndex}-${offset}`} label={`яч. ${start + offset}`} />
                    : <HashValue key={`${blockIndex}-${offset}`} label={`яч. ${start + offset}`} value={value} />
                ))}
              </div>
            </td>
            <td className="border border-slate-800 px-3 py-3 text-slate-400">локальный блок</td>
          </tr>
        );
      })}
      <tr className="bg-slate-950/60">
        <td className="border border-slate-800 px-3 py-3 font-mono text-amber-200">overflow</td>
        <td className="border border-slate-800 px-3 py-3"><BucketChain values={overflowValues} /></td>
        <td className="border border-slate-800 px-3 py-3 text-slate-400">зона переполнения</td>
      </tr>
    </HashTableShell>
  );
}

function HashTableShell({ children, description }: { readonly children: ReactNode; readonly description: string }) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800">
      <p className="border-b border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">{description}</p>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-950/80 text-left text-slate-300">
            <th className="w-28 border border-slate-800 px-3 py-2">Индекс</th>
            <th className="border border-slate-800 px-3 py-2">Корзина / ячейки</th>
            <th className="w-40 border border-slate-800 px-3 py-2">Пояснение</th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function BucketChain({ values }: { readonly values: readonly number[] }) {
  if (values.length === 0) {
    return <EmptyBucket />;
  }

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-2">
      {values.map((value, position) => (
        <span className="inline-flex items-center gap-2" key={`${value}-${position}`}>
          {position > 0 && <span className="text-slate-500">→</span>}
          <HashValue value={value} />
        </span>
      ))}
    </div>
  );
}

function HashValue({ label, value }: { readonly label?: string; readonly value: number }) {
  return <span className="rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-3 py-2 font-semibold text-emerald-100">{label === undefined ? value : `${label}: ${value}`}</span>;
}

function EmptyBucket({ label = 'пусто' }: { readonly label?: string }) {
  return <span className="rounded-xl border border-dashed border-slate-700 px-3 py-2 text-slate-500">{label}</span>;
}

function Legend({ color, label }: { readonly color: string; readonly label: string }) {
  return (<span className="inline-flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>);
}

interface TreeNodeView {
  readonly id: string;
  readonly index: number;
  readonly level: number;
  readonly value: number | null;
  readonly x: number;
  readonly y: number;
}

const createTreeNodeViews = (cells: readonly StructureCell[]): readonly TreeNodeView[] => {
  const lastMeaningfulIndex = Math.max(0, ...cells.map((cell, index) => (cell.value === null ? -1 : index)));
  return cells.slice(0, Math.max(lastMeaningfulIndex + 1, Math.min(cells.length, 1))).map((cell, index) => {
    const level = Math.floor(Math.log2(index + 1));
    const levelStart = 2 ** level - 1;
    const positionInLevel = index - levelStart;
    const slots = 2 ** level;
    return {
      id: cell.id,
      index,
      level,
      value: cell.value,
      x: ((positionInLevel + 1) / (slots + 1)) * 100,
      y: 48 + level * 92,
    };
  });
};

const createTreeEdges = (nodes: readonly TreeNodeView[]) => {
  const byIndex = new Map(nodes.map((node) => [node.index, node]));
  return nodes.flatMap((node) => {
    if (node.value === null) return [];
    return [2 * node.index + 1, 2 * node.index + 2]
      .map((childIndex) => byIndex.get(childIndex))
      .filter((child): child is TreeNodeView => child !== undefined);
  }).map((child) => ({ parent: byIndex.get(Math.floor((child.index - 1) / 2))!, child }));
};

const getTableSize = (frame: StructureAlgorithmFrame | null, fallback: number): number =>
  typeof frame?.meta.tableSize === 'number' && frame.meta.tableSize > 0 ? frame.meta.tableSize : fallback;
