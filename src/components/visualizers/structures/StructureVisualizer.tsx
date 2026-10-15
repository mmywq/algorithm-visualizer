import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import type { LegendItem } from '@/features/demo/Legend';
import type { StructureAlgorithmFrame } from '@/types';
import { nodesFromHeapCells, TreeDiagram, treeLegend, type TreeTone } from './TreeDiagram';

interface StructureVisualizerProps {
  readonly frame: StructureAlgorithmFrame | null;
}

type ViewKind = 'binomial' | 'chaining' | 'open-addressing' | 'block' | 'tree' | 'list' | 'stack' | 'cells';

export const detectView = (frame: StructureAlgorithmFrame | null): ViewKind => {
  const label = (frame?.data.label ?? '').toLowerCase();
  if (label.includes('биномиальная')) return 'binomial';
  if (frame?.data.buckets !== undefined) {
    if (label.includes('открытая адресация')) return 'open-addressing';
    if (label.includes('блочная')) return 'block';
    return 'chaining';
  }
  if (label.includes('открытая адресация')) return 'open-addressing';
  if (label.includes('дерево') || label.includes('bst') || label.includes('avl') || label.includes('куча')) return 'tree';
  if (label.includes('список')) return 'list';
  if (label.includes('стек')) return 'stack';
  return 'cells';
};

const pointerNames: Record<string, string> = {
  head: 'head',
  tail: 'tail',
  top: 'top',
  i: 'i',
  search: 'поиск',
  current: 'текущий',
  root: 'корень',
  min: 'минимум',
};

const cellTone = (active: boolean, empty: boolean): string =>
  active
    ? 'border-brand-press bg-brand text-on'
    : empty
      ? 'border-dashed border-line-strong bg-transparent text-ink-3'
      : 'border-line-strong bg-surface text-ink';

const cellShadow = (active: boolean, empty: boolean): string =>
  active ? 'inset 0 -4px 0 rgb(var(--c-brand-press))' : empty ? 'none' : 'inset 0 -4px 0 rgb(var(--viz-node-line))';

export const structureLegend = (frame: StructureAlgorithmFrame | null): readonly LegendItem[] => {
  const view = detectView(frame);
  if (view === 'tree' || view === 'binomial') return treeLegend;
  if (view === 'chaining' || view === 'block' || view === 'open-addressing') {
    return [
      { color: 'rgb(var(--c-brand))', label: 'активная корзина или ячейка' },
      { color: 'rgb(var(--c-pink))', label: 'ключи в таблице' },
      { color: 'rgb(var(--viz-node-line))', label: 'пустые места' },
    ];
  }
  return [
    { color: 'rgb(var(--c-brand))', label: 'текущая ячейка' },
    { color: 'rgb(var(--viz-node-line))', label: 'занятая ячейка' },
    { color: 'rgb(var(--c-ink))', label: 'указатель' },
  ];
};

export function StructureVisualizer({ frame }: StructureVisualizerProps) {
  const view = detectView(frame);
  switch (view) {
    case 'binomial':
      return <BinomialForestView frame={frame} />;
    case 'chaining':
      return <ChainingView frame={frame} />;
    case 'open-addressing':
      return <OpenAddressingView frame={frame} />;
    case 'block':
      return <BlockAddressingView frame={frame} />;
    case 'tree':
      return <TreeView frame={frame} />;
    case 'list':
      return <LinkedListView frame={frame} />;
    case 'stack':
      return <StackView frame={frame} />;
    default:
      return <CellsView frame={frame} />;
  }
}

function PointerTag({ name, direction = 'up' }: { readonly name: string; readonly direction?: 'up' | 'left' | 'down' }) {
  return (
    <motion.span
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-ink px-1.5 py-0.5 font-mono text-[11px] font-bold text-surface"
      initial={{ opacity: 0, scale: 0.6 }}
      layout
    >
      {direction === 'up' ? '▲' : direction === 'down' ? '▼' : '◀'} {pointerNames[name] ?? name}
    </motion.span>
  );
}

const pointersAt = (frame: StructureAlgorithmFrame | null, index: number): string[] =>
  Object.entries(frame?.meta.pointers ?? {})
    .filter(([, position]) => position === index)
    .map(([name]) => name);

function StackView({ frame }: StructureVisualizerProps) {
  const cells = frame?.data.cells ?? [];
  const rows = cells.map((cell, index) => ({ cell, index })).reverse();
  return (
    <div className="viz-stage flex flex-col items-center px-4 py-5">
      <div className="flex flex-col gap-1.5">
        {rows.map(({ cell, index }) => {
          const active = frame?.meta.activeIndex === index;
          const empty = cell.value === null;
          return (
            <div className="flex items-center gap-3" key={cell.id}>
              <span className="w-12 text-right font-mono text-xs font-bold text-ink-3">a[{index}]</span>
              <motion.div
                animate={{ scale: active ? 1.06 : 1 }}
                className={`flex h-11 w-28 items-center justify-center rounded-xl border-2 font-mono text-[17px] font-black ${cellTone(active, empty)}`}
                layout
                style={{ boxShadow: cellShadow(active, empty) }}
              >
                <AnimatePresence mode="popLayout">
                  <motion.span animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} initial={{ y: -12, opacity: 0 }} key={String(cell.value)}>
                    {cell.value ?? '·'}
                  </motion.span>
                </AnimatePresence>
              </motion.div>
              <span className="flex w-24 gap-1">
                {pointersAt(frame, index).map((name) => (
                  <PointerTag direction="left" key={name} name={name} />
                ))}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 h-2 w-48 rounded-full bg-line-strong" />
      <p className="mt-3 max-w-sm text-center text-[13px] font-bold text-ink-3">
        Основание стека внизу, вершина top — сверху. Добавлять и снимать элементы можно только через вершину.
      </p>
    </div>
  );
}

function CellsView({ frame }: StructureVisualizerProps) {
  const cells = frame?.data.cells ?? [];
  return (
    <div className="viz-stage overflow-x-auto px-4 py-6">
      <div className="mx-auto flex w-max gap-2">
        {cells.map((cell, index) => {
          const active = frame?.meta.activeIndex === index;
          const empty = cell.value === null;
          return (
            <div className="flex w-14 flex-col items-center gap-1.5" key={cell.id}>
              <span className="font-mono text-xs font-bold text-ink-3">{index}</span>
              <motion.div
                animate={{ y: active ? -5 : 0 }}
                className={`flex h-14 w-14 items-center justify-center rounded-xl border-2 font-mono text-[16px] font-black ${cellTone(active, empty)}`}
                style={{ boxShadow: cellShadow(active, empty) }}
              >
                {cell.value ?? '·'}
              </motion.div>
              <div className="flex min-h-12 flex-col items-center gap-1">
                {pointersAt(frame, index).map((name) => (
                  <PointerTag key={name} name={name} />
                ))}
              </div>
            </div>
          );
        })}
        {cells.length === 0 && <p className="text-sm font-bold text-ink-3">Структура пуста</p>}
      </div>
    </div>
  );
}

function LinkedListView({ frame }: StructureVisualizerProps) {
  const cells = frame?.data.cells ?? [];
  return (
    <div className="viz-stage overflow-x-auto px-4 pb-6 pt-10">
      <div className="mx-auto flex w-max items-center">
        {cells.length === 0 && <p className="rounded-xl bg-surface px-4 py-3 text-sm font-bold text-ink-3">Список пуст: head = null</p>}
        <AnimatePresence initial={false}>
          {cells.map((cell, index) => {
            const active = frame?.meta.activeIndex === index;
            return (
              <motion.div
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center"
                exit={{ opacity: 0, scale: 0.6 }}
                initial={{ opacity: 0, scale: 0.6 }}
                key={cell.id}
                layout
              >
                <div className="relative flex flex-col items-center">
                  <div className="absolute -top-8 flex gap-1">
                    {pointersAt(frame, index).map((name) => (
                      <PointerTag direction="down" key={name} name={name} />
                    ))}
                  </div>
                  <div
                    className={`flex h-14 overflow-hidden rounded-xl border-2 font-mono font-black ${active ? 'border-brand-press' : 'border-line-strong'}`}
                    style={{ boxShadow: cellShadow(active, false) }}
                  >
                    <span className={`flex w-14 items-center justify-center text-[16px] ${active ? 'bg-brand text-on' : 'bg-surface text-ink'}`}>
                      {cell.value ?? '·'}
                    </span>
                    <span
                      className={`flex w-6 items-center justify-center border-l-2 ${active ? 'border-brand-press bg-brand/80' : 'border-line-strong bg-surface-2'}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${active ? 'bg-white' : 'bg-ink-3'}`} />
                    </span>
                  </div>
                  <span className="mt-1 font-mono text-[11px] font-bold text-ink-3">узел {index}</span>
                </div>
                {index < cells.length - 1 ? (
                  <ArrowRight className="mx-1.5 shrink-0 text-ink-3" size={22} strokeWidth={2.75} />
                ) : (
                  <span className="ml-2 font-mono text-xs font-bold text-ink-3">null</span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ChainingView({ frame }: StructureVisualizerProps) {
  const buckets = frame?.data.buckets ?? [];
  const activeBucket = frame?.meta.bucketIndex;
  const activeKey = frame?.meta.key;
  return (
    <div className="viz-stage px-3 py-4 sm:px-4">
      <div className="flex flex-col gap-2">
        {buckets.map((bucket) => {
          const active = activeBucket === bucket.index;
          return (
            <motion.div animate={{ x: active ? 4 : 0 }} className="flex items-center gap-2" key={bucket.id}>
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 font-mono text-[15px] font-black ${active ? 'border-brand-press bg-brand text-on' : 'border-line-strong bg-surface text-ink-2'}`}
                style={{ boxShadow: cellShadow(active, false) }}
              >
                {bucket.index}
              </span>
              <div className="flex min-h-11 flex-1 flex-wrap items-center gap-1.5 overflow-x-auto rounded-xl bg-surface/60 px-2 py-1.5">
                {bucket.values.length === 0 && <span className="px-1 text-sm font-bold text-ink-3">пусто</span>}
                <AnimatePresence initial={false}>
                  {bucket.values.map((value, index) => (
                    <motion.span
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-1.5"
                      exit={{ opacity: 0, scale: 0.5 }}
                      initial={{ opacity: 0, scale: 0.5 }}
                      key={`${bucket.id}-${value}-${index}`}
                      layout
                    >
                      {index > 0 && <ArrowRight className="text-ink-3" size={16} strokeWidth={2.75} />}
                      <span
                        className={`rounded-lg border-2 px-2.5 py-1 font-mono text-[14px] font-black ${activeKey === value && active ? 'border-yellow-press bg-yellow text-on' : 'border-pink/50 bg-pink/12 text-ink'}`}
                      >
                        {value}
                      </span>
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
      <p className="mt-3 text-[13px] font-bold text-ink-3">
        Каждая корзина — связный список. Коллизия не теряет ключ: он просто дописывается в цепочку своей корзины.
      </p>
    </div>
  );
}

function OpenAddressingView({ frame }: StructureVisualizerProps) {
  const cells = frame?.data.cells ?? [];
  const activeIndex = frame?.meta.bucketIndex;
  return (
    <div className="viz-stage px-3 py-5 sm:px-4">
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))' }}>
        {cells.map((cell, index) => {
          const active = activeIndex === index;
          const empty = cell.value === null;
          return (
            <div className="flex flex-col items-center gap-1" key={cell.id}>
              <span className="font-mono text-[11px] font-bold text-ink-3">{index}</span>
              <motion.div
                animate={{ y: active ? -5 : 0 }}
                className={`flex h-14 w-full items-center justify-center rounded-xl border-2 font-mono text-[16px] font-black ${active ? 'border-brand-press bg-brand text-on' : empty ? 'border-dashed border-line-strong text-ink-3' : 'border-pink/50 bg-pink/12 text-ink'}`}
                style={{ boxShadow: active ? 'inset 0 -4px 0 rgb(var(--c-brand-press))' : 'none' }}
              >
                {cell.value ?? '·'}
              </motion.div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[13px] font-bold text-ink-3">
        Все ключи лежат прямо в массиве. При коллизии алгоритм пробует следующую ячейку, пока не найдёт свободную.
      </p>
    </div>
  );
}

function BlockAddressingView({ frame }: StructureVisualizerProps) {
  const buckets = frame?.data.buckets ?? [];
  const activeBucket = frame?.meta.bucketIndex;
  return (
    <div className="viz-stage px-3 py-4 sm:px-4">
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {buckets.map((bucket) => {
          const active = activeBucket === bucket.index;
          return (
            <div className={`rounded-2xl border-2 p-3 ${active ? 'border-brand bg-brand/8' : 'border-line bg-surface'}`} key={bucket.id}>
              <p className={`mb-2 text-[13px] font-black ${active ? 'text-brand' : 'text-ink-2'}`}>Блок {bucket.index}</p>
              <div className="flex min-h-10 flex-wrap gap-1.5">
                {bucket.values.length === 0 && <span className="text-sm font-bold text-ink-3">пусто</span>}
                {bucket.values.map((value, index) => (
                  <motion.span
                    animate={{ scale: 1 }}
                    className="rounded-lg border-2 border-pink/50 bg-pink/12 px-2.5 py-1 font-mono text-[14px] font-black text-ink"
                    initial={{ scale: 0.6 }}
                    key={`${bucket.id}-${index}-${value}`}
                  >
                    {value}
                  </motion.span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[13px] font-bold text-ink-3">
        Когда основной блок заполнен, ключ уходит в блок переполнения — поиск идёт по цепочке блоков одного адреса.
      </p>
    </div>
  );
}

function TreeView({ frame }: StructureVisualizerProps) {
  const cells = frame?.data.cells ?? [];
  const searchPath = Array.isArray(frame?.meta.searchPath) ? (frame.meta.searchPath as readonly number[]) : [];
  const activeIndex = frame?.meta.activeIndex;
  const found = frame?.meta.found === true;
  const isHeap = (frame?.data.label ?? '').toLowerCase().includes('куча');
  const toneOf = (index: number): TreeTone => {
    if (index === activeIndex) return found ? 'found' : 'active';
    if (searchPath.includes(index)) return 'path';
    return 'idle';
  };
  const nodes = nodesFromHeapCells(cells, toneOf);

  return (
    <div>
      <TreeDiagram emptyText="Дерево пока пусто — первый ключ станет корнем" nodes={nodes} />
      {isHeap && <HeapArrayStrip frame={frame} />}
    </div>
  );
}

function HeapArrayStrip({ frame }: StructureVisualizerProps) {
  const cells = (frame?.data.cells ?? []).filter((cell) => cell.value !== null);
  if (cells.length === 0) return null;
  return (
    <div className="mt-3 rounded-2xl bg-surface-2 p-3">
      <p className="mb-2 px-1 text-[13px] font-black text-ink-2">Та же куча в массиве: дети элемента i — в ячейках 2i+1 и 2i+2</p>
      <div className="flex flex-wrap gap-1.5">
        {cells.map((cell, index) => {
          const active = frame?.meta.activeIndex === index;
          return (
            <div className="flex flex-col items-center" key={cell.id}>
              <span
                className={`flex h-10 min-w-10 items-center justify-center rounded-lg border-2 px-2 font-mono text-[14px] font-black ${active ? 'border-brand-press bg-brand text-on' : 'border-line-strong bg-surface text-ink'}`}
              >
                {cell.value}
              </span>
              <span className="font-mono text-[10px] font-bold text-ink-3">{index}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface BinomialNode {
  readonly id: string;
  readonly value: number;
  readonly degree: number;
  readonly children: readonly BinomialNode[];
}

const isBinomialNode = (value: unknown): value is BinomialNode => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<BinomialNode>;
  return (
    typeof candidate.id === 'string' && typeof candidate.value === 'number' && Array.isArray(candidate.children) && candidate.children.every(isBinomialNode)
  );
};

function BinomialForestView({ frame }: StructureVisualizerProps) {
  const trees =
    Array.isArray(frame?.meta.binomialTrees) && frame.meta.binomialTrees.every(isBinomialNode) ? (frame.meta.binomialTrees as readonly BinomialNode[]) : [];
  const active = new Set(Array.isArray(frame?.meta.activeNodeIds) ? (frame.meta.activeNodeIds as string[]) : []);
  const nodes: { key: string; label: string; parentKey: string | null; tone: TreeTone; badge?: string }[] = [];
  const walk = (node: BinomialNode, parent: string | null, isRoot: boolean): void => {
    nodes.push({
      key: node.id,
      label: String(node.value),
      parentKey: parent,
      tone: active.has(node.id) ? 'active' : 'idle',
      ...(isRoot ? { badge: `B${node.degree}` } : {}),
    });
    node.children.forEach((child) => walk(child, node.id, false));
  };
  trees.forEach((tree) => walk(tree, null, true));

  return (
    <div>
      <TreeDiagram binary={false} emptyText="Корневой список пуст" nodes={nodes} />
      <p className="mt-3 text-[13px] font-bold text-ink-3">
        Куча — это лес биномиальных деревьев: у каждой степени B0, B1, B2… не больше одного дерева, минимум — среди корней.
      </p>
    </div>
  );
}
