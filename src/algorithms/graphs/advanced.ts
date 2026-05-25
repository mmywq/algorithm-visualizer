import type { GraphAlgorithmFrame, GraphSnapshot } from '@/types';
import { createGraphFrame, createGraphMeta } from './utils';

const baseGraph: GraphSnapshot = {
  nodes: [
    { id: 'A', label: 'A', position: { x: 0, y: 120 }, payload: {} },
    { id: 'B', label: 'B', position: { x: 180, y: 20 }, payload: {} },
    { id: 'C', label: 'C', position: { x: 180, y: 220 }, payload: {} },
    { id: 'D', label: 'D', position: { x: 380, y: 20 }, payload: {} },
    { id: 'E', label: 'E', position: { x: 380, y: 220 }, payload: {} },
    { id: 'F', label: 'F', position: { x: 580, y: 120 }, payload: {} },
  ],
  edges: [
    { id: 'A-B', source: 'A', target: 'B', weight: 2, directed: false, payload: {} },
    { id: 'A-C', source: 'A', target: 'C', weight: 3, directed: false, payload: {} },
    { id: 'B-D', source: 'B', target: 'D', weight: 4, directed: false, payload: {} },
    { id: 'C-E', source: 'C', target: 'E', weight: 1, directed: false, payload: {} },
    { id: 'D-F', source: 'D', target: 'F', weight: 2, directed: false, payload: {} },
    { id: 'E-F', source: 'E', target: 'F', weight: 5, directed: false, payload: {} },
  ],
};

function* graphScenario(title: string, messages: readonly string[]): Generator<GraphAlgorithmFrame, void, unknown> {
  const visited = new Set<string>();
  const traversed = new Set<string>();
  const frontier: string[] = [];
  let step = 0;
  for (const node of baseGraph.nodes.slice(0, messages.length)) {
    visited.add(node.id);
    frontier.push(node.id);
    const edge = baseGraph.edges[step];
    if (edge !== undefined) {
      traversed.add(edge.id);
    }
    yield createGraphFrame(
      step,
      step === 0 ? 'initial' : 'inspect',
      baseGraph,
      [node.id, edge?.id ?? ''].filter(Boolean),
      step + 1,
      `${title}: ${messages[step]}`,
      createGraphMeta('A', visited, frontier, traversed, node.id),
    );
    step += 1;
  }
  yield createGraphFrame(step, 'complete', baseGraph, [], step + 1, `${title}: завершено.`, createGraphMeta('A', visited, frontier, traversed));
}

export const connectedComponentsDemo = () => graphScenario('Компоненты связности', ['Запускаем DFS из непосещённой вершины', 'Отмечаем вершины компоненты', 'Переходим к следующей компоненте']);
export const dijkstraDemo = () => graphScenario('Алгоритм Дейкстры', ['Инициализируем расстояния', 'Выбираем вершину с минимумом', 'Релаксируем рёбра']);
export const mstDemo = () => graphScenario('Минимальное остовное дерево', ['Сортируем рёбра по весу', 'Проверяем цикл DSU', 'Добавляем ребро в MST']);
