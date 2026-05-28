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
    `Старт: отмечаем вершину ${startNodeId} как найденную и кладём её в очередь. Очередь сейчас: [${queue.join(', ')}].`,
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
      `Берём из начала очереди вершину ${currentNodeId}. Осталось в очереди: [${queue.join(', ') || 'пусто'}].`,
      createGraphMeta(startNodeId, visitedNodeIds, queue, traversedEdgeIds, currentNodeId),
    );

    yield createGraphFrame(
      step++,
      'visit',
      graph,
      [currentNodeId],
      bfsPseudocode.visit,
      `Обрабатываем вершину ${currentNodeId}. Посещённые вершины: [${[...visitedNodeIds].join(', ')}].`,
      createGraphMeta(startNodeId, visitedNodeIds, queue, traversedEdgeIds, currentNodeId),
    );

    for (const neighbor of getNeighbors(adjacencyList, currentNodeId)) {
      yield createGraphFrame(
        step++,
        'inspect',
        graph,
        [currentNodeId, neighbor.nodeId, neighbor.edgeId],
        bfsPseudocode.inspectNeighbor,
        `Смотрим ребро ${currentNodeId}—${neighbor.nodeId}. Вершина ${neighbor.nodeId} ${visitedNodeIds.has(neighbor.nodeId) ? 'уже была найдена, поэтому повторно не добавляем её в очередь' : 'ещё не найдена: добавим её в конец очереди для обхода следующего слоя'}.`,
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
          `Добавили ${neighbor.nodeId} в очередь. Новая очередь: [${queue.join(', ')}]. Ребро ${currentNodeId}—${neighbor.nodeId} стало частью дерева обхода BFS.`,
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
    `BFS завершён: из вершины ${startNodeId} достижимы ${visitedNodeIds.size} верш.: [${[...visitedNodeIds].join(', ')}]. Очередь пуста, обход успешен.`,
    createGraphMeta(startNodeId, visitedNodeIds, queue, traversedEdgeIds),
  );
}
