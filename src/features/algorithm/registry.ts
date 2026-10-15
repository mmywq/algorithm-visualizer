import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/** Ленивый импорт именованного экспорта: каждая демонстрация — отдельный файл сборки. */
const named = <M, K extends keyof M>(loader: () => Promise<M>, name: K): LazyExoticComponent<ComponentType> =>
  lazy(() => loader().then((module) => ({ default: module[name] as ComponentType })));

const linear = () => import('@/demos/structures/LinearDemos');
const hashing = () => import('@/demos/hashing/HashingDemos');
const heaps = () => import('@/demos/heaps/HeapDemos');
const graphs = () => import('@/demos/graphs/ClassicGraphDemos');
const extraGraphs = () => import('@/demos/graphs/ExtraGraphDemos');
const classicSorts = () => import('@/demos/sorting/ClassicSortDemos');
const searches = () => import('@/demos/search/SearchDemos');
const treeExtras = () => import('@/demos/trees/TreeExtraDemos');
const treeAdvanced = () => import('@/demos/trees/TreeAdvancedDemos');
const dp = () => import('@/demos/dp/DpDemos');
const strings = () => import('@/demos/strings/StringDemos');

export const demoRegistry: Readonly<Record<string, LazyExoticComponent<ComponentType>>> = {
  // линейные структуры
  indexing: named(linear, 'IndexingDemo'),
  'stack-array': named(linear, 'StackArrayDemo'),
  'stack-list': named(linear, 'StackListDemo'),
  'queue-array': named(linear, 'QueueArrayDemo'),
  'queue-list': named(linear, 'QueueListDemo'),
  'linked-list': lazy(() => import('@/demos/structures/LinkedListDemo')),
  deque: lazy(() => import('@/demos/structures/DequeDemo')),

  // сортировка
  'bubble-sort': lazy(() => import('@/demos/sorting/BubbleSortDemo')),
  'merge-sort': lazy(() => import('@/demos/sorting/MergeSortDemo')),
  'counting-sort': lazy(() => import('@/demos/sorting/CountingSortDemo')),
  'radix-sort': lazy(() => import('@/demos/sorting/RadixSortDemo')),
  'block-sort': lazy(() => import('@/demos/sorting/BlockSortDemo')),
  'sort-race': lazy(() => import('@/demos/sorting/SortRaceDemo')),
  'linear-search': named(searches, 'LinearSearchDemo'),
  'binary-search': named(searches, 'BinarySearchDemo'),
  'interpolation-search': named(searches, 'InterpolationSearchDemo'),
  'jump-search': named(searches, 'JumpSearchDemo'),
  'insertion-sort': named(classicSorts, 'InsertionSortDemo'),
  'selection-sort': named(classicSorts, 'SelectionSortDemo'),
  'shell-sort': named(classicSorts, 'ShellSortDemo'),
  'quick-sort': named(classicSorts, 'QuickSortDemo'),
  'heap-sort': named(classicSorts, 'HeapSortDemo'),

  // хеш-таблицы
  'hash-chaining': named(hashing, 'ChainingDemo'),
  'hash-open-addressing': named(hashing, 'OpenAddressingDemo'),
  'hash-block': named(hashing, 'BlockAddressingDemo'),

  // деревья
  bst: lazy(() => import('@/demos/trees/BstDemo')),
  avl: lazy(() => import('@/demos/trees/AvlDemo')),
  'tree-traversals': named(treeExtras, 'TraversalsDemo'),
  'bst-delete': named(treeExtras, 'BstDeleteDemo'),
  'red-black': named(treeAdvanced, 'RedBlackDemo'),
  trie: named(treeAdvanced, 'TrieDemo'),
  'segment-tree': named(treeAdvanced, 'SegmentTreeDemo'),

  // кучи
  'binary-heap': named(heaps, 'BinaryHeapDemo'),
  'binomial-heap': named(heaps, 'BinomialHeapDemo'),
  dsu: lazy(() => import('@/demos/heaps/DsuDemo')),

  // графы
  'graph-traversal': named(graphs, 'GraphTraversalDemo'),
  'connected-components': named(graphs, 'ConnectedComponentsDemo'),
  dijkstra: named(graphs, 'DijkstraDemo'),
  kruskal: named(graphs, 'KruskalDemo'),
  prim: named(extraGraphs, 'PrimDemo'),
  'topological-sort': named(extraGraphs, 'TopologicalSortDemo'),
  'bellman-ford': named(extraGraphs, 'BellmanFordDemo'),
  'floyd-warshall': named(extraGraphs, 'FloydWarshallDemo'),
  'cycle-detection': named(extraGraphs, 'CycleDetectionDemo'),
  bipartite: named(extraGraphs, 'BipartiteDemo'),
  'a-star': lazy(() => import('@/demos/graphs/AStarDemo')),

  // динамическое программирование
  fibonacci: named(dp, 'FibonacciDemo'),
  'coin-change': named(dp, 'CoinChangeDemo'),
  knapsack: named(dp, 'KnapsackDemo'),
  lcs: named(dp, 'LcsDemo'),
  'edit-distance': named(dp, 'EditDistanceDemo'),

  // строки
  'naive-search': named(strings, 'NaiveSearchDemo'),
  kmp: named(strings, 'KmpDemo'),
  'rabin-karp': named(strings, 'RabinKarpDemo'),
};
