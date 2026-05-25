export interface AlgorithmLink {
  readonly id: string;
  readonly name: string;
  readonly route: string;
  readonly status: 'ready' | 'planned';
}

export interface AlgorithmCategory {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly items: readonly AlgorithmLink[];
}

export const algorithmCatalog: readonly AlgorithmCategory[] = [
  {
    id: 'basics',
    title: 'Базовые структуры данных',
    description: 'Линейные структуры и операции доступа.',
    items: [
      { id: 'stack-array', name: 'Стек: реализация на массивах', route: '/structures/stack-array', status: 'ready' },
      { id: 'stack-list', name: 'Стек: реализация на списках', route: '/structures/stack-list', status: 'ready' },
      { id: 'queue-array', name: 'Очередь: реализация на массивах', route: '/structures/queue-array', status: 'ready' },
      { id: 'queue-list', name: 'Очередь: реализация на списках', route: '/structures/queue-list', status: 'ready' },
      { id: 'indexing', name: 'Индексирование', route: '/structures/indexing', status: 'ready' },
    ],
  },
  {
    id: 'trees-hash',
    title: 'Деревья и хеш-таблицы',
    description: 'Нелинейные структуры поиска и адресации.',
    items: [
      { id: 'bst', name: 'Двоичное дерево поиска', route: '/trees/bst', status: 'ready' },
      { id: 'balanced-bst', name: 'Сбалансированное двоичное дерево поиска', route: '/trees/balanced-bst', status: 'ready' },
      { id: 'hash-open', name: 'Открытые хеш-таблицы (закрытая адресация)', route: '/hash/open-chaining', status: 'ready' },
      { id: 'hash-closed', name: 'Закрытые хеш-таблицы (открытая адресация)', route: '/hash/open-addressing', status: 'ready' },
      { id: 'hash-block', name: 'Закрытые хеш-таблицы (с использованием блоков)', route: '/hash/block-addressing', status: 'ready' },
    ],
  },
  {
    id: 'sorting',
    title: 'Сортировка',
    description: 'Алгоритмы упорядочивания и сравнения эффективности.',
    items: [
      { id: 'sorting-player', name: 'Визуализация сортировок (Bubble / Merge)', route: '/sorting/player', status: 'ready' },
      { id: 'sorting-compare', name: 'Сравнение разных алгоритмов сортировки (6 видов)', route: '/sorting/compare', status: 'ready' },
      { id: 'block-sort', name: 'Блочная сортировка', route: '/sorting/block', status: 'ready' },
      { id: 'counting-sort', name: 'Сортировка подсчётом', route: '/sorting/counting', status: 'ready' },
      { id: 'radix-sort', name: 'Поразрядная сортировка', route: '/sorting/radix', status: 'ready' },
    ],
  },
  {
    id: 'heaps',
    title: 'Кучи',
    description: 'Приоритетные структуры и их операции.',
    items: [
      { id: 'heap', name: 'Куча', route: '/heaps/heap', status: 'ready' },
      { id: 'binomial-heap', name: 'Биномиальная куча', route: '/heaps/binomial', status: 'ready' },
    ],
  },
  {
    id: 'graphs',
    title: 'Алгоритмы на графах',
    description: 'Обходы, компоненты связности и кратчайшие пути.',
    items: [
      { id: 'graph-player', name: 'Поиск в ширину / глубину', route: '/graphs/traversal', status: 'ready' },
      { id: 'connected-components', name: 'Компоненты связности', route: '/graphs/components', status: 'ready' },
      { id: 'dijkstra', name: 'Алгоритм Дейкстры (кратчайший путь)', route: '/graphs/dijkstra', status: 'ready' },
      { id: 'mst', name: 'Минимальное остовное дерево', route: '/graphs/mst', status: 'ready' },
    ],
  },
];
