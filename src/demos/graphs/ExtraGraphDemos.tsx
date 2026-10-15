import { motion } from 'framer-motion';
import {
  bellmanFord,
  bipartiteCheck,
  cycleDetection,
  defaultAllPairsGraph,
  defaultBipartiteGraph,
  defaultCycleGraph,
  defaultDagGraph,
  defaultNegativeGraph,
  floydWarshall,
  prim,
  topologicalSort,
  type MatrixMeta,
} from '@/algorithms/graphs/extraGraphs';
import { defaultWeightedGraph } from '@/algorithms/graphs';
import theory from '@/content/theory/graphs';
import { GraphDemo, GraphStatePanel, type GraphDemoConfig } from '@/demos/shared/GraphDemo';
import type { GraphAlgorithmFrame } from '@/types';

const c = (name: string): string => `rgb(var(--c-${name}))`;
const idle = 'rgb(var(--viz-node-line))';
const pseudo = (id: string) => theory[id]?.pseudocode ?? [];

const primConfig: GraphDemoConfig = {
  kind: { weighted: true, directed: false },
  needsStart: true,
  defaultGraph: defaultWeightedGraph,
  legend: [
    { color: c('purple'), label: 'добавлена только что' },
    { color: c('green'), label: 'в дереве' },
    { color: c('cyan'), label: 'граничит с деревом' },
    { color: c('orange'), label: 'ребро через границу', shape: 'line' },
    { color: c('green'), label: 'ребро остова', shape: 'line' },
  ],
  algorithms: [{ key: 'prim', label: 'Прим', frontierName: 'Соседи дерева', pseudocode: pseudo('prim'), run: (graph, start) => prim(graph, start) }],
};

const topoConfig: GraphDemoConfig = {
  kind: { weighted: false, directed: true, acyclic: true },
  needsStart: false,
  defaultGraph: defaultDagGraph,
  hint: 'Рёбра задают зависимости: A → C значит «A раньше C». Добавьте обратное ребро, чтобы увидеть, как цикл ломает сортировку.',
  legend: [
    { color: c('purple'), label: 'обрабатывается' },
    { color: c('cyan'), label: 'в очереди — без предшественников' },
    { color: c('green'), label: 'уже в ответе' },
    { color: c('red'), label: 'на цикле' },
    { color: idle, label: 'учтённое ребро', shape: 'line' },
  ],
  algorithms: [
    { key: 'kahn', label: 'Алгоритм Кана', frontierName: 'Очередь', pseudocode: pseudo('topological-sort'), run: (graph) => topologicalSort(graph) },
  ],
};

const bellmanConfig: GraphDemoConfig = {
  kind: { weighted: true, directed: true, negative: true },
  needsStart: true,
  defaultGraph: defaultNegativeGraph,
  hint: 'Веса могут быть отрицательными. Попробуйте замкнуть цикл с отрицательной суммой весов.',
  legend: [
    { color: c('purple'), label: 'только что улучшена' },
    { color: c('cyan'), label: 'достижима' },
    { color: c('green'), label: 'итог' },
    { color: c('purple'), label: 'улучшающее ребро', shape: 'line' },
    { color: c('green'), label: 'дерево кратчайших путей', shape: 'line' },
  ],
  algorithms: [
    {
      key: 'bellman-ford',
      label: 'Беллман — Форд',
      frontierName: 'Достижимы',
      pseudocode: pseudo('bellman-ford'),
      run: (graph, start) => bellmanFord(graph, start),
    },
  ],
};

/** Матрица расстояний: строка i и столбец j текущей пары, крест промежуточной вершины k. */
function DistanceMatrix({ frame }: { readonly frame: GraphAlgorithmFrame | null }) {
  if (frame === null) return null;
  const meta = frame.meta as unknown as MatrixMeta;
  if (!Array.isArray(meta.labels)) return null;
  const { labels, matrix, k, changed } = meta;
  return (
    <section className="card flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-black text-ink">Матрица расстояний</h3>
        {k !== undefined && <span className="tag border-purple text-purple">k = {labels[k]}</span>}
      </div>
      <div className="overflow-x-auto">
        <table className="mx-auto border-separate border-spacing-1 text-center font-mono text-[14px]">
          <thead>
            <tr>
              <th className="h-8 w-8" scope="col">
                <span className="sr-only">из \ в</span>
              </th>
              {labels.map((label, j) => (
                <th className={`h-8 w-11 rounded-lg font-black ${j === k ? 'bg-purple/16 text-purple' : 'text-ink-3'}`} key={label} scope="col">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={labels[i]}>
                <th className={`h-9 w-8 rounded-lg font-black ${i === k ? 'bg-purple/16 text-purple' : 'text-ink-3'}`} scope="row">
                  {labels[i]}
                </th>
                {row.map((value, j) => {
                  const isChanged = changed !== undefined && changed[0] === i && changed[1] === j;
                  const onCross = i === k || j === k;
                  return (
                    <td
                      className={`h-9 w-11 rounded-lg font-black ${
                        isChanged
                          ? 'bg-brand text-on'
                          : i === j
                            ? 'bg-surface-2 text-ink-3'
                            : onCross
                              ? 'bg-purple/12 text-ink'
                              : value === null
                                ? 'bg-surface-2 text-ink-3'
                                : 'bg-surface-2 text-ink'
                      }`}
                      key={`${i}-${j}`}
                    >
                      <motion.span animate={{ scale: isChanged ? [1.35, 1] : 1 }} className="inline-block" key={`${value}`} transition={{ duration: 0.3 }}>
                        {value === null ? '∞' : value}
                      </motion.span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[13px] font-semibold leading-5 text-ink-3">
        Строка — откуда, столбец — куда. Фиолетовый крест — расстояния до и от промежуточной вершины k: только они участвуют в проверке d[i][k] + d[k][j].
      </p>
    </section>
  );
}

const floydConfig: GraphDemoConfig = {
  kind: { weighted: true, directed: true },
  needsStart: false,
  defaultGraph: defaultAllPairsGraph,
  legend: [
    { color: c('purple'), label: 'промежуточная вершина k' },
    { color: c('green'), label: 'уже была промежуточной' },
    { color: c('brand'), label: 'обновлённая ячейка' },
  ],
  hint: 'Алгоритм считает расстояния сразу между всеми парами — удобно для небольших плотных графов.',
  statePanel: (frame) => <DistanceMatrix frame={frame} />,
  algorithms: [{ key: 'floyd', label: 'Флойд — Уоршелл', pseudocode: pseudo('floyd-warshall'), run: (graph) => floydWarshall(graph) }],
};

const cycleConfig: GraphDemoConfig = {
  kind: { weighted: false, directed: true },
  needsStart: false,
  defaultGraph: defaultCycleGraph,
  legend: [
    { color: c('purple'), label: 'текущая' },
    { color: c('yellow'), label: 'серая — на текущем пути' },
    { color: c('green'), label: 'обработана' },
    { color: c('red'), label: 'вершины цикла' },
    { color: c('orange'), label: 'рёбра цикла', shape: 'line' },
  ],
  algorithms: [{ key: 'three-colors', label: 'Три цвета', pseudocode: pseudo('cycle-detection'), run: (graph) => cycleDetection(graph) }],
};

const bipartiteConfig: GraphDemoConfig = {
  kind: { weighted: false, directed: false },
  needsStart: false,
  defaultGraph: defaultBipartiteGraph,
  hint: 'Соедините две вершины одного цвета — появится нечётный цикл, и граф перестанет быть двудольным.',
  legend: [
    { color: c('purple'), label: 'текущая' },
    { color: c('brand'), label: 'доля Л' },
    { color: c('teal'), label: 'доля П' },
    { color: c('red'), label: 'конфликтное ребро', shape: 'line' },
  ],
  statePanel: (frame, algorithm) => <GraphStatePanel algorithm={algorithm} frame={frame} needsStart={false} />,
  algorithms: [
    { key: 'bfs-colors', label: 'Раскраска обходом', frontierName: 'Очередь', pseudocode: pseudo('bipartite'), run: (graph) => bipartiteCheck(graph) },
  ],
};

export const PrimDemo = () => <GraphDemo config={primConfig} />;
export const TopologicalSortDemo = () => <GraphDemo config={topoConfig} />;
export const BellmanFordDemo = () => <GraphDemo config={bellmanConfig} />;
export const FloydWarshallDemo = () => <GraphDemo config={floydConfig} />;
export const CycleDetectionDemo = () => <GraphDemo config={cycleConfig} />;
export const BipartiteDemo = () => <GraphDemo config={bipartiteConfig} />;
