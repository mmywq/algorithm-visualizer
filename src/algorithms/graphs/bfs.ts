import type { EdgeId, GraphAlgorithmFrame, NodeId } from '@/types';
import {
  buildAdjacencyList,
  createGraphFrame,
  createGraphMeta,
  getNeighbors,
  hasNode,
  type GraphTraversalInput,
} from './utils';

const bfsPseudocode = {
  initial: 1,
  dequeue: 2,
  visit: 3,
  inspectNeighbor: 4,
  enqueue: 5,
  complete: 6,
} as const;

export function* bfs({ graph, startNodeId }: GraphTraversalInput): Generator<GraphAlgorithmFrame, void, unknown> {
  let step = 0;
  const visitedNodeIds = new Set<NodeId>();
  const traversedEdgeIds = new Set<EdgeId>();
  const queue: NodeId[] = [];

  if (!hasNode(graph, startNodeId)) {
    yield createGraphFrame(
      step,
      'complete',
      graph,
      [],
      bfsPseudocode.complete,
      `BFS не запущен: стартовая вершина ${startNodeId} отсутствует в графе.`,
      createGraphMeta(startNodeId, visitedNodeIds, queue, traversedEdgeIds),
    );
    return;
  }

  const adjacencyList = buildAdjacencyList(graph);
  visitedNodeIds.add(startNodeId);
  queue.push(startNodeId);

  yield createGraphFrame(
    step++,
    'initial',
    graph,
    [startNodeId],
    bfsPseudocode.initial,
    `Добавляем стартовую вершину ${startNodeId} в очередь BFS.`,
    createGraphMeta(startNodeId, visitedNodeIds, queue, traversedEdgeIds, startNodeId),
  );

  while (queue.length > 0) {
    const currentNodeId = queue.shift();

    if (currentNodeId === undefined) {
      return;
    }

    yield createGraphFrame(
      step++,
      'dequeue',
      graph,
      [currentNodeId],
      bfsPseudocode.dequeue,
      `Извлекаем вершину ${currentNodeId} из очереди.`,
      createGraphMeta(startNodeId, visitedNodeIds, queue, traversedEdgeIds, currentNodeId),
    );

    yield createGraphFrame(
      step++,
      'visit',
      graph,
      [currentNodeId],
      bfsPseudocode.visit,
      `Посещаем вершину ${currentNodeId}.`,
      createGraphMeta(startNodeId, visitedNodeIds, queue, traversedEdgeIds, currentNodeId),
    );

    for (const neighbor of getNeighbors(adjacencyList, currentNodeId)) {
      yield createGraphFrame(
        step++,
        'inspect',
        graph,
        [currentNodeId, neighbor.nodeId, neighbor.edgeId],
        bfsPseudocode.inspectNeighbor,
        `Проверяем соседа ${neighbor.nodeId} вершины ${currentNodeId}.`,
        createGraphMeta(startNodeId, visitedNodeIds, queue, traversedEdgeIds, currentNodeId),
      );

      if (!visitedNodeIds.has(neighbor.nodeId)) {
        visitedNodeIds.add(neighbor.nodeId);
        traversedEdgeIds.add(neighbor.edgeId);
        queue.push(neighbor.nodeId);

        yield createGraphFrame(
          step++,
          'enqueue',
          graph,
          [currentNodeId, neighbor.nodeId, neighbor.edgeId],
          bfsPseudocode.enqueue,
          `Сосед ${neighbor.nodeId} ещё не посещён: добавляем его в очередь.`,
          createGraphMeta(startNodeId, visitedNodeIds, queue, traversedEdgeIds, neighbor.nodeId),
        );
      }
    }
  }

  yield createGraphFrame(
    step,
    'complete',
    graph,
    [],
    bfsPseudocode.complete,
    'BFS завершён: все достижимые вершины посещены.',
    createGraphMeta(startNodeId, visitedNodeIds, queue, traversedEdgeIds),
  );
}
