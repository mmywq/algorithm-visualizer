import type { StructureAlgorithmFrame } from '@/types';

interface StructureVisualizerProps {
  readonly frame: StructureAlgorithmFrame | null;
}

interface BinomialTreeViewNode {
  readonly id: string;
  readonly value: number;
  readonly degree: number;
  readonly children: readonly BinomialTreeViewNode[];
}

const isBinomialTreeViewNode = (value: unknown): value is BinomialTreeViewNode => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<BinomialTreeViewNode>;
  return typeof candidate.id === 'string' &&
    typeof candidate.value === 'number' &&
    typeof candidate.degree === 'number' &&
    Array.isArray(candidate.children) &&
    candidate.children.every(isBinomialTreeViewNode);
};

const getBinomialTrees = (frame: StructureAlgorithmFrame | null): readonly BinomialTreeViewNode[] => {
  const trees = frame?.meta.binomialTrees;
  return Array.isArray(trees) && trees.every(isBinomialTreeViewNode) ? trees : [];
};

export function StructureVisualizer({ frame }: StructureVisualizerProps) {
  const snapshot = frame?.data;
  const label = snapshot?.label ?? '';
  const lowerLabel = label.toLowerCase();
  const isTreeLike =
    lowerLabel.includes('дерево') === true ||
    lowerLabel.includes('bst') === true ||
    lowerLabel.includes('avl') === true ||
    lowerLabel.includes('куча') === true;
  const isLinkedListLike = lowerLabel.includes('список') === true;
  const isBinomialHeap = lowerLabel.includes('биномиальная') === true;
  const isStackArray = lowerLabel.includes('стек') === true && !isLinkedListLike;
  const binomialTrees = getBinomialTrees(frame);

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <h2 className="text-2xl font-bold text-white">{snapshot?.label ?? 'Визуализация структуры'}</h2>

      {isBinomialHeap ? (
        <BinomialForestView frame={frame} trees={binomialTrees} />
      ) : snapshot?.buckets !== undefined ? (
        <HashTableView frame={frame} />
      ) : isTreeLike ? (
        <TreeView frame={frame} />
      ) : isLinkedListLike ? (
        <LinkedListView frame={frame} />
      ) : isStackArray ? (
        <StackArrayView frame={frame} />
      ) : (
        <ArrayCellsView frame={frame} />
      )}

      <p className="mt-4 min-h-[72px] rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm leading-6 text-slate-300">{frame?.message ?? 'Нажмите «Старт» или листайте шаги кнопками — здесь появится описание текущего действия.'}</p>
    </section>
  );
}

function StackArrayView({ frame }: { readonly frame: StructureAlgorithmFrame | null }) {
  const cells = frame?.data.cells ?? [];
  const pointers = frame?.meta.pointers ?? {};
  const reversed = [...cells].map((cell, index) => ({ cell, index })).reverse();

  return (
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="flex flex-col items-center gap-1.5">
        {reversed.map(({ cell, index }) => {
          const isActive = frame?.meta.activeIndex === index;
          const pointerLabels = Object.entries(pointers).filter(([, pointerIndex]) => pointerIndex === index).map(([name]) => name);
          const isEmpty = cell.value === null;
          return (
            <div className="flex w-full items-center justify-center gap-3" key={cell.id}>
              <span className="w-16 text-right font-mono text-xs text-slate-500">a[{index}]</span>
              <div
                className={
                  isActive
                    ? 'flex h-11 w-28 items-center justify-center rounded-lg border-2 border-cyan-300 bg-cyan-500/30 text-base font-bold text-cyan-100'
                    : isEmpty
                      ? 'flex h-11 w-28 items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-950 text-base text-slate-600'
                      : 'flex h-11 w-28 items-center justify-center rounded-lg border border-slate-600 bg-slate-900 text-base font-bold text-slate-100'
                }
              >
                {cell.value ?? '∅'}
              </div>
              <span className="flex w-32 flex-wrap items-center gap-1">
                {pointerLabels.map((name) => (
                  <span className="rounded bg-violet-500 px-1.5 py-0.5 text-[10px] font-semibold text-white" key={name}>
                    ← {getPointerLabel(name)}
                  </span>
                ))}
              </span>
            </div>
          );
        })}
        <div className="mt-1 h-1 w-44 rounded bg-slate-600" />
      </div>
      <p className="mt-3 text-center text-xs leading-5 text-slate-400">
        Стек растёт снизу вверх: основание — внизу, вершина (top) — вверху. Добавление и удаление выполняются только через вершину.
      </p>
    </div>
  );
}

function ArrayCellsView({ frame }: { readonly frame: StructureAlgorithmFrame | null }) {
  const cells = frame?.data.cells ?? [];
  const pointers = frame?.meta.pointers ?? {};

  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="flex items-start justify-center gap-2">
        {cells.map((cell, index) => {
          const isActive = frame?.meta.activeIndex === index;
          const pointerLabels = Object.entries(pointers).filter(([, pointerIndex]) => pointerIndex === index).map(([name]) => name);
          const isEmpty = cell.value === null;
          return (
            <div className="flex w-16 shrink-0 flex-col items-center gap-1.5" key={cell.id}>
              <span className="font-mono text-xs text-slate-500">{index}</span>
              <div
                className={
                  isActive
                    ? 'flex h-14 w-full items-center justify-center rounded-xl border-2 border-cyan-300 bg-cyan-500/30 text-base font-bold text-cyan-100'
                    : isEmpty
                      ? 'flex h-14 w-full items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950 text-base text-slate-600'
                      : 'flex h-14 w-full items-center justify-center rounded-xl border border-slate-600 bg-slate-900 text-base font-bold text-slate-100'
                }
              >
                {cell.value ?? '∅'}
              </div>
              <div className="flex min-h-10 flex-col items-center gap-1">
                {pointerLabels.map((name) => (
                  <span className="whitespace-nowrap rounded bg-violet-500 px-1.5 py-0.5 text-center text-[10px] font-semibold text-white" key={name}>
                    ↑ {getPointerLabel(name)}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
        {cells.length === 0 && <p className="self-center text-sm text-slate-400">Структура пуста.</p>}
      </div>
    </div>
  );
}



function HashTableView({ frame }: { readonly frame: StructureAlgorithmFrame | null }) {
  const label = frame?.data.label?.toLowerCase() ?? '';

  if (label.includes('открытая адресация')) {
    return <OpenAddressingView frame={frame} />;
  }

  if (label.includes('блочная адресация')) {
    return <BlockAddressingView frame={frame} />;
  }

  return <ChainingView frame={frame} />;
}

function ChainingView({ frame }: { readonly frame: StructureAlgorithmFrame | null }) {
  const buckets = frame?.data.buckets ?? [];
  const activeBucketIndex = frame?.meta.bucketIndex;
  const activeKey = frame?.meta.key;

  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/50">
      <table className="min-w-full border-collapse text-left text-sm text-slate-300">
        <caption className="px-4 py-3 text-left text-sm leading-6 text-slate-300">
          Метод цепочек показывает каждую корзину как список. Коллизия не теряет ключи: они сохраняются в цепочке внутри одной ячейки таблицы.
        </caption>
        <thead className="bg-slate-900 text-xs uppercase tracking-[0.16em] text-slate-400">
          <tr>
            <th className="border-t border-slate-800 px-4 py-3">Индекс</th>
            <th className="border-t border-slate-800 px-4 py-3">Корзина</th>
            <th className="border-t border-slate-800 px-4 py-3">Цепочка</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((bucket) => {
            const isActive = activeBucketIndex === bucket.index;
            return (
              <tr className={isActive ? 'bg-cyan-500/10 text-cyan-100' : 'odd:bg-slate-900/40'} key={bucket.id}>
                <th className="border-t border-slate-800 px-4 py-3 font-mono text-base text-slate-100">{bucket.index}</th>
                <td className="border-t border-slate-800 px-4 py-3">{isActive && activeKey !== undefined ? `ключ ${activeKey}` : 'ожидает ключ'}</td>
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

function OpenAddressingView({ frame }: { readonly frame: StructureAlgorithmFrame | null }) {
  const cells = frame?.data.cells ?? [];
  const activeIndex = frame?.meta.bucketIndex;
  const activeKey = frame?.meta.key;

  return (
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
      <p className="mb-4 text-sm leading-6 text-slate-300">
        Открытая адресация хранит каждый ключ в отдельной ячейке массива. При коллизии алгоритм не создаёт список, а пробует следующую позицию по цепочке пробирования.
      </p>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(84px, 1fr))' }}>
        {cells.map((cell, index) => {
          const isActive = activeIndex === index;
          return (
            <div className={isActive ? 'rounded-2xl border border-cyan-300 bg-cyan-500/10 p-3 text-cyan-100' : 'rounded-2xl border border-slate-700 bg-slate-900 p-3 text-slate-200'} key={cell.id}>
              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">{index}</div>
              <div className="flex h-14 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-lg font-bold">
                {cell.value ?? '∅'}
              </div>
              <div className="mt-2 text-center text-[11px] text-slate-400">
                {isActive && activeKey !== undefined ? `проба ${activeKey}` : 'ячейка'}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-400">
        Визуализация показывает именно массив ячеек, поэтому видно, как линейное пробирование переходит от одного индекса к другому, пока не встретит свободное место.
      </p>
    </div>
  );
}

function BlockAddressingView({ frame }: { readonly frame: StructureAlgorithmFrame | null }) {
  const buckets = frame?.data.buckets ?? [];
  const activeBucketIndex = frame?.meta.bucketIndex;
  const activeKey = frame?.meta.key;

  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
      <p className="mb-4 text-sm leading-6 text-slate-300">
        Блочная адресация делит таблицу на основные блоки. Когда основной блок заполнен, появляются overflow-блоки, которые хранят переполнение и сохраняют возможность поиска по цепочке блоков.
      </p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {buckets.map((bucket) => {
          const isActive = activeBucketIndex === bucket.index;
          return (
            <div className={isActive ? 'rounded-2xl border border-cyan-300 bg-cyan-500/10 p-4 text-cyan-100' : 'rounded-2xl border border-slate-700 bg-slate-900 p-4 text-slate-200'} key={bucket.id}>
              <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-400">
                <span>Блок {bucket.index}</span>
                <span>{isActive && activeKey !== undefined ? `ключ ${activeKey}` : 'готов к записи'}</span>
              </div>
              <div className="flex min-h-16 flex-wrap gap-2 rounded-xl border border-slate-700 bg-slate-950 p-3">
                {bucket.values.length === 0 ? (
                  <span className="text-sm text-slate-500">пусто</span>
                ) : (
                  bucket.values.map((value, valueIndex) => (
                    <span className="rounded-xl border border-cyan-700/60 bg-cyan-500/15 px-3 py-2 font-semibold text-cyan-100" key={`${bucket.id}-${valueIndex}-${value}`}>
                      {value}
                    </span>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-400">
        Здесь видно, что при переполнении создаётся новый блок вместо линейного пробирования, а основной блок остаётся точкой входа для поиска.
      </p>
    </div>
  );
}

function LinkedListView({ frame }: { readonly frame: StructureAlgorithmFrame | null }) {
  const cells = frame?.data.cells ?? [];
  const pointers = frame?.meta.pointers ?? {};

  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="flex min-h-28 items-center gap-3">
        {cells.length === 0 ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4 text-sm text-slate-400">
            Список пуст: head не указывает на узел.
          </div>
        ) : cells.map((cell, index) => {
          const isActive = frame?.meta.activeIndex === index;
          const pointerLabels = Object.entries(pointers).filter(([, pointerIndex]) => pointerIndex === index).map(([label]) => label);
          return (
            <div className="flex items-center gap-3" key={cell.id}>
              <div className="relative flex flex-col items-center gap-2">
                {pointerLabels.length > 0 && (
                  <div className="absolute -top-8 flex flex-wrap justify-center gap-1">
                    {pointerLabels.map((label) => <PointerBadge label={label} key={label} />)}
                  </div>
                )}
                <div className={isActive ? 'flex h-16 min-w-16 items-center justify-center rounded-2xl border border-cyan-300 bg-cyan-500/30 px-4 text-lg font-bold text-cyan-100' : 'flex h-16 min-w-16 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 px-4 text-lg font-bold text-slate-100'}>
                  {cell.value ?? '·'}
                </div>
                <span className="text-xs text-slate-500">узел {index}</span>
              </div>
              {index < cells.length - 1 && <span className="text-2xl text-slate-500">→</span>}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-400">
        Стрелка показывает ссылку на следующий узел. В стеке добавление и удаление идут через head; в очереди добавление идёт через tail, а удаление — через head.
      </p>
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
    search: 'поиск search',
    current: 'текущий узел',
    root: 'корень root',
    left: 'левый ребёнок',
    right: 'правый ребёнок',
    min: 'минимум',
  };
  return labels[label] ?? label;
};

function BinomialForestView({ frame, trees }: { readonly frame: StructureAlgorithmFrame | null; readonly trees: readonly BinomialTreeViewNode[] }) {
  const activeNodeIds = Array.isArray(frame?.meta.activeNodeIds)
    ? new Set(frame.meta.activeNodeIds.filter((id): id is string => typeof id === 'string'))
    : new Set<string>();

  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="flex min-w-[720px] items-start gap-6">
        {trees.length === 0 ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4 text-sm text-slate-400">
            Корневой список пуст: биномиальных деревьев пока нет.
          </div>
        ) : trees.map((tree) => (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4" key={tree.id}>
            <div className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              B{tree.degree}: степень {tree.degree}
            </div>
            <BinomialTreeNodeView activeNodeIds={activeNodeIds} node={tree} />
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-400">
        Биномиальная куча изображается как корневой список деревьев. В корректной куче для каждой степени B0, B1, B2 и так далее хранится не более одного дерева, а минимальный ключ находится среди корней.
      </p>
    </div>
  );
}

function BinomialTreeNodeView({ activeNodeIds, node }: { readonly activeNodeIds: ReadonlySet<string>; readonly node: BinomialTreeViewNode }) {
  const isActive = activeNodeIds.has(node.id);

  return (
    <div className="flex flex-col items-center">
      <div className={isActive ? 'flex h-12 min-w-12 items-center justify-center rounded-full border border-cyan-300 bg-cyan-500 px-3 text-sm font-bold text-slate-950 shadow-[0_0_22px_rgba(34,211,238,0.45)]' : 'flex h-12 min-w-12 items-center justify-center rounded-full border border-slate-600 bg-slate-950 px-3 text-sm font-bold text-slate-100'}>
        {node.value}
      </div>
      {node.children.length > 0 && (
        <>
          <div className="h-5 w-px bg-slate-600" />
          <div className="flex items-start gap-3 border-t border-slate-600 pt-5">
            {node.children.map((child) => (
              <BinomialTreeNodeView activeNodeIds={activeNodeIds} key={child.id} node={child} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TreeView({ frame }: { readonly frame: StructureAlgorithmFrame | null }) {
  const searchPath = Array.isArray(frame?.meta.searchPath)
    ? (frame?.meta.searchPath as readonly number[])
    : [];
  const nodes = buildTreeLayout(frame?.data.cells ?? [], frame?.meta.activeIndex, searchPath);
  const visibleNodes = nodes.filter((node) => node.value !== null || node.isActive || node.isInSearchPath);
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

        {visibleNodes.map((node) => {
          const pointerLabels = Object.entries(frame?.meta.pointers ?? {}).filter(([, pointerIndex]) => pointerIndex === node.index).map(([label]) => label);
          return (
            <div key={node.id}>
              {pointerLabels.length > 0 && (
                <div className="absolute z-10 -translate-x-1/2 -translate-y-full" style={{ left: `${node.x}%`, top: `${node.y}%` }}>
                  <div className="mb-1 flex flex-wrap justify-center gap-1">
                    {pointerLabels.map((label) => <PointerBadge label={label} key={label} />)}
                  </div>
                </div>
              )}
              <div
                className={
                  node.isActive
                    ? 'absolute flex h-14 min-w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-300 bg-cyan-500 px-3 text-center text-sm font-bold text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.45)]'
                    : node.isInSearchPath
                      ? 'absolute flex h-14 min-w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-400 bg-cyan-950/80 px-3 text-center text-sm font-bold text-cyan-100'
                      : 'absolute flex h-14 min-w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-600 bg-slate-900 px-3 text-center text-sm font-bold text-slate-100'
                }
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
                title={`Индекс массива: ${node.index}`}
              >
                {node.value ?? '·'}
              </div>
            </div>
          );
        })}
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
  readonly isInSearchPath: boolean;
}

const buildTreeLayout = (
  cells: readonly { id: string; value: number | null }[],
  activeIndex: number | undefined,
  searchPath: readonly number[] = [],
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
      isInSearchPath: searchPath.includes(index),
    };
  });
};

const getTreeLevelCount = (cellCount: number): number => {
  if (cellCount <= 0) return 1;
  return Math.floor(Math.log2(cellCount)) + 1;
};
