import type { EdgeId, GraphAlgorithmFrame, NodeId } from '@/types';
import {
  buildAdjacencyList,
  createGraphFrame,
  createGraphMeta,
  getNeighbors,
  hasNode,
  type GraphTraversalInput,
} from './utils';

const dfsPseudocode = {
  initial: 1,
  pop: 2,
  visit: 3,
  inspectNeighbor: 4,
  push: 5,
  complete: 6,
} as const;

export function* dfs({ graph, startNodeId }: GraphTraversalInput): Generator<GraphAlgorithmFrame, void, unknown> {
  let step = 0;
  const visitedNodeIds = new Set<NodeId>();
  const traversedEdgeIds = new Set<EdgeId>();
  const stack: NodeId[] = [];

  if (!hasNode(graph, startNodeId)) {
    yield createGraphFrame(
      step,
      'complete',
      graph,
      [],
      dfsPseudocode.complete,
      `DFS не запущен: стартовая вершина ${startNodeId} отсутствует в графе.`,
      createGraphMeta(startNodeId, visitedNodeIds, stack, traversedEdgeIds),
    );
    return;
  }

  const adjacencyList = buildAdjacencyList(graph);
  visitedNodeIds.add(startNodeId);
  stack.push(startNodeId);

  yield createGraphFrame(
    step++,
    'initial',
    graph,
    [startNodeId],
    dfsPseudocode.initial,
    `Начало обхода: вершина ${startNodeId} отмечается как найденная и помещается в стек. Содержимое стека: [${stack.join(', ')}].`,
    createGraphMeta(startNodeId, visitedNodeIds, stack, traversedEdgeIds, startNodeId),
  );

  while (stack.length > 0) {
    const currentNodeId = stack.pop();

    if (currentNodeId === undefined) {
      return;
    }

    yield createGraphFrame(
      step++,
      'pop',
      graph,
      [currentNodeId],
      dfsPseudocode.pop,
      `С вершины стека снимается ${currentNodeId}. В стеке остаётся: [${stack.join(', ') || 'пусто'}].`,
      createGraphMeta(startNodeId, visitedNodeIds, stack, traversedEdgeIds, currentNodeId),
    );

    yield createGraphFrame(
      step++,
      'visit',
      graph,
      [currentNodeId],
      dfsPseudocode.visit,
      `Обрабатывается вершина ${currentNodeId}. Посещённые вершины: [${[...visitedNodeIds].join(', ')}].`,
      createGraphMeta(startNodeId, visitedNodeIds, stack, traversedEdgeIds, currentNodeId),
    );

    const neighbors = [...getNeighbors(adjacencyList, currentNodeId)].reverse();

    for (const neighbor of neighbors) {
      yield createGraphFrame(
        step++,
        'inspect',
        graph,
        [currentNodeId, neighbor.nodeId, neighbor.edgeId],
        dfsPseudocode.inspectNeighbor,
        `Проверяется сосед ${neighbor.nodeId} вершины ${currentNodeId}: непосещённые соседи помещаются в стек и обрабатываются раньше остальных.`,
        createGraphMeta(startNodeId, visitedNodeIds, stack, traversedEdgeIds, currentNodeId),
      );

      if (!visitedNodeIds.has(neighbor.nodeId)) {
        visitedNodeIds.add(neighbor.nodeId);
        traversedEdgeIds.add(neighbor.edgeId);
        stack.push(neighbor.nodeId);

        yield createGraphFrame(
          step++,
          'push',
          graph,
          [currentNodeId, neighbor.nodeId, neighbor.edgeId],
          dfsPseudocode.push,
          `Вершина ${neighbor.nodeId} отмечается как найденная и помещается в стек. Стек: [${stack.join(', ')}].`,
          createGraphMeta(startNodeId, visitedNodeIds, stack, traversedEdgeIds, neighbor.nodeId),
        );
      }
    }
  }

  yield createGraphFrame(
    step,
    'complete',
    graph,
    [],
    dfsPseudocode.complete,
    `Обход в глубину завершён: стек пуст. Из вершины ${startNodeId} достижимы ${visitedNodeIds.size} вершин, порядок обнаружения: ${[...visitedNodeIds].join(' → ')}. Выделенные рёбра образуют дерево обхода.`,
    createGraphMeta(startNodeId, visitedNodeIds, stack, traversedEdgeIds),
  );
}
