import { bfs, connectedComponents, defaultComponentsGraph, defaultWeightedGraph, dfs, dijkstra, mstKruskal } from '@/algorithms/graphs';
import { GraphDemo, type GraphDemoConfig } from '@/demos/shared/GraphDemo';
import type { LegendItem } from '@/features/demo/Legend';
import type { GraphSnapshot, PseudocodeLine } from '@/types';

const c = (name: string): string => `rgb(var(--c-${name}))`;

export const traversalLegend: readonly LegendItem[] = [
  { color: c('purple'), label: 'текущая вершина' },
  { color: c('cyan'), label: 'найдена, ждёт обработки' },
  { color: c('green'), label: 'посещена' },
  { color: 'rgb(var(--viz-node-line))', label: 'ещё не найдена' },
  { color: c('yellow-press'), label: 'старт', shape: 'ring' },
  { color: c('green'), label: 'ребро дерева обхода', shape: 'line' },
];

const traversalGraph: GraphSnapshot = {
  nodes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((id) => ({ id, label: id, position: { x: 0, y: 0 }, payload: {} })),
  edges: [
    ['A', 'B'],
    ['A', 'C'],
    ['B', 'D'],
    ['B', 'E'],
    ['C', 'F'],
    ['E', 'F'],
    ['D', 'G'],
    ['F', 'G'],
  ].map(([source, target]) => ({ id: `${source}-${target}`, source: source!, target: target!, directed: false, payload: {} })),
};

const bfsPseudocode: readonly PseudocodeLine[] = [
  { code: 'поместить старт в очередь и отметить найденным', note: 'Очередь работает по принципу FIFO: первым пришёл — первым обработан.' },
  { code: 'извлечь вершину из начала очереди', note: 'Раньше обрабатываются вершины, найденные раньше, — обход идёт слоями.' },
  { code: 'обработать извлечённую вершину', note: 'Здесь вершина окончательно посещается.' },
  { code: 'просмотреть всех соседей текущей вершины' },
  { code: 'непосещённого соседа отметить и поставить в конец очереди', note: 'Так формируется следующий слой обхода.' },
  { code: 'если очередь пуста — обход завершён', note: 'Все вершины, достижимые из старта, посещены.' },
];

const dfsPseudocode: readonly PseudocodeLine[] = [
  { code: 'положить старт в стек и отметить найденным', note: 'Стек работает по принципу LIFO: последним пришёл — первым обработан.' },
  { code: 'снять вершину с вершины стека', note: 'Снимается добавленная последней — алгоритм уходит вглубь.' },
  { code: 'обработать снятую вершину', note: 'Здесь вершина окончательно посещается.' },
  { code: 'просмотреть всех соседей текущей вершины' },
  { code: 'непосещённого соседа отметить и положить в стек', note: 'Новые вершины лягут поверх старых и обработаются раньше.' },
  { code: 'если стек пуст — обход завершён', note: 'Все вершины, достижимые из старта, посещены.' },
];

const traversalConfig: GraphDemoConfig = {
  kind: { weighted: false, directed: false },
  needsStart: true,
  defaultGraph: traversalGraph,
  legend: traversalLegend,
  algorithms: [
    { key: 'bfs', label: 'В ширину (BFS)', frontierName: 'Очередь', pseudocode: bfsPseudocode, run: (graph, start) => bfs({ graph, startNodeId: start }) },
    { key: 'dfs', label: 'В глубину (DFS)', frontierName: 'Стек', pseudocode: dfsPseudocode, run: (graph, start) => dfs({ graph, startNodeId: start }) },
  ],
};

const componentsConfig: GraphDemoConfig = {
  kind: { weighted: false, directed: false },
  needsStart: false,
  defaultGraph: defaultComponentsGraph,
  legend: [
    { color: c('purple'), label: 'текущая вершина' },
    { color: c('brand'), label: 'компонента 1' },
    { color: c('orange'), label: 'компонента 2' },
    { color: c('green'), label: 'компонента 3' },
    { color: 'rgb(var(--viz-node-line))', label: 'ещё не обработана' },
  ],
  algorithms: [
    {
      key: 'components',
      label: 'Поиск компонент',
      frontierName: 'Стек',
      pseudocode: [
        { code: 'взять непосещённую вершину — начало новой компоненты', note: 'Каждый такой выбор означает, что найдена ещё одна изолированная часть графа.' },
        { code: 'снять вершину со стека и добавить в текущую компоненту', note: 'Обход в глубину собирает все вершины, достижимые из начальной.' },
        { code: 'непосещённых соседей положить в стек', note: 'Так компонента «разрастается» по рёбрам.' },
        { code: 'когда вершин не осталось — вывести список компонент', note: 'Число запусков обхода равно числу компонент.' },
      ],
      run: (graph) => connectedComponents(graph),
    },
  ],
};

const dijkstraConfig: GraphDemoConfig = {
  kind: { weighted: true, directed: false },
  needsStart: true,
  defaultGraph: defaultWeightedGraph,
  legend: [
    { color: c('purple'), label: 'текущая вершина' },
    { color: c('cyan'), label: 'есть оценка расстояния' },
    { color: c('green'), label: 'расстояние окончательное' },
    { color: c('purple'), label: 'релаксируемое ребро', shape: 'line' },
    { color: c('green'), label: 'ребро кратчайшего пути', shape: 'line' },
  ],
  hint: 'Алгоритм Дейкстры работает только с неотрицательными весами — для отрицательных есть Беллман–Форд.',
  algorithms: [
    {
      key: 'dijkstra',
      label: 'Дейкстра',
      pseudocode: [
        { code: 'dist[старт] = 0, до остальных вершин = ∞', note: '∞ означает «путь пока не найден».' },
        {
          code: 'выбрать необработанную вершину с минимальной оценкой и зафиксировать',
          note: 'Её расстояние уже не уменьшится: любой другой путь шёл бы через более далёкие вершины.',
        },
        { code: 'для каждого соседа посчитать путь через текущую вершину', note: 'Это релаксация ребра: dist[u] + вес(u, v).' },
        { code: 'если новый путь короче — обновить оценку соседа', note: 'Запоминается и ребро, по которому пришёл лучший путь.' },
        { code: 'повторять, пока все вершины не зафиксированы' },
      ],
      run: (graph, start) => dijkstra(graph, start),
    },
  ],
};

const kruskalConfig: GraphDemoConfig = {
  kind: { weighted: true, directed: false },
  needsStart: false,
  defaultGraph: defaultWeightedGraph,
  legend: [
    { color: c('purple'), label: 'проверяемое ребро', shape: 'line' },
    { color: c('green'), label: 'ребро в остове', shape: 'line' },
    { color: c('green'), label: 'вершина в остове' },
    { color: 'rgb(var(--viz-node-line))', label: 'вершина вне остова' },
  ],
  algorithms: [
    {
      key: 'kruskal',
      label: 'Краскал',
      pseudocode: [
        { code: 'отсортировать рёбра по возрастанию веса', note: 'Жадная стратегия: сначала самые дешёвые рёбра.' },
        { code: 'взять очередное ребро и проверить, не создаст ли оно цикл', note: 'Цикл возникает, если концы ребра уже соединены выбранными рёбрами.' },
        { code: 'если цикла нет — добавить ребро в остов', note: 'Две группы вершин объединяются в одну.' },
        { code: 'остановиться, когда выбрано V − 1 рёбер', note: 'Дерево из V вершин всегда содержит ровно V − 1 ребро.' },
      ],
      run: (graph) => mstKruskal(graph),
    },
  ],
};

export const GraphTraversalDemo = () => <GraphDemo config={traversalConfig} />;
export const ConnectedComponentsDemo = () => <GraphDemo config={componentsConfig} />;
export const DijkstraDemo = () => <GraphDemo config={dijkstraConfig} />;
export const KruskalDemo = () => <GraphDemo config={kruskalConfig} />;
