import type { EdgeId, GraphAlgorithmFrame, GraphSnapshot, NodeId } from '@/types';
import { buildAdjacencyList, createGraphFrame, createGraphMeta, getNeighbors } from './utils';

const weightedGraph: GraphSnapshot = {
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
    { id: 'A-C', source: 'A', target: 'C', weight: 5, directed: false, payload: {} },
    { id: 'B-C', source: 'B', target: 'C', weight: 1, directed: false, payload: {} },
    { id: 'B-D', source: 'B', target: 'D', weight: 4, directed: false, payload: {} },
    { id: 'C-E', source: 'C', target: 'E', weight: 3, directed: false, payload: {} },
    { id: 'D-F', source: 'D', target: 'F', weight: 2, directed: false, payload: {} },
    { id: 'E-F', source: 'E', target: 'F', weight: 1, directed: false, payload: {} },
  ],
};

const disconnectedGraph: GraphSnapshot = {
  ...weightedGraph,
  edges: weightedGraph.edges.filter((edge) => edge.id !== 'C-E' && edge.id !== 'E-F'),
};

export function* connectedComponentsDemo(): Generator<GraphAlgorithmFrame, void, unknown> {
  const graph = disconnectedGraph;
  const adjacency = buildAdjacencyList(graph);
  const visited = new Set<NodeId>();
  const traversed = new Set<EdgeId>();
  const frontier: NodeId[] = [];
  let step = 0;
  let component = 0;

  for (const node of graph.nodes) {
    if (visited.has(node.id)) continue;

    component += 1;
    const stack: NodeId[] = [node.id];
    frontier.push(node.id);

    yield createGraphFrame(
      step++,
      'initial',
      graph,
      [node.id],
      1,
      `Компонента ${component}: стартуем обход из вершины ${node.id}.`,
      createGraphMeta(node.id, visited, frontier, traversed, node.id),
    );

    while (stack.length > 0) {
      const current = stack.pop();
      if (current === undefined || visited.has(current)) continue;
      visited.add(current);

      yield createGraphFrame(
        step++,
        'visit',
        graph,
        [current],
        2,
        `Компонента ${component}: посещаем вершину ${current}.`,
        createGraphMeta(node.id, visited, frontier, traversed, current),
      );

      for (const neighbor of getNeighbors(adjacency, current)) {
        yield createGraphFrame(
          step++,
          'inspect',
          graph,
          [current, neighbor.nodeId, neighbor.edgeId],
          3,
          `Проверяем ребро ${neighbor.edgeId} (${current}→${neighbor.nodeId}).`,
          createGraphMeta(node.id, visited, frontier, traversed, current),
        );

        if (!visited.has(neighbor.nodeId)) {
          traversed.add(neighbor.edgeId);
          stack.push(neighbor.nodeId);
          frontier.push(neighbor.nodeId);
        }
      }
    }
  }

  yield createGraphFrame(
    step,
    'complete',
    graph,
    [],
    4,
    `Компоненты связности найдены: ${component}.`,
    createGraphMeta('A', visited, frontier, traversed),
  );
}

export function* dijkstraDemo(): Generator<GraphAlgorithmFrame, void, unknown> {
  const graph = weightedGraph;
  const start: NodeId = 'A';
  const adjacency = buildAdjacencyList(graph);
  const dist = new Map<NodeId, number>(graph.nodes.map((n) => [n.id, Number.POSITIVE_INFINITY]));
  const visited = new Set<NodeId>();
  const traversed = new Set<EdgeId>();
  dist.set(start, 0);
  const frontier: NodeId[] = [start];
  let step = 0;

  while (visited.size < graph.nodes.length) {
    const candidates = graph.nodes.filter((n) => !visited.has(n.id));
    const currentNode = candidates.reduce((best, node) =>
      dist.get(node.id)! < dist.get(best.id)! ? node : best,
    candidates[0]);

    if (currentNode === undefined || dist.get(currentNode.id) === Number.POSITIVE_INFINITY) break;
    visited.add(currentNode.id);

    yield createGraphFrame(
      step++,
      'visit',
      graph,
      [currentNode.id],
      1,
      `Дейкстра: фиксируем вершину ${currentNode.id} (dist=${dist.get(currentNode.id)}).`,
      createGraphMeta(start, visited, frontier, traversed, currentNode.id),
    );

    for (const neighbor of getNeighbors(adjacency, currentNode.id)) {
      const edge = graph.edges.find((e) => e.id === neighbor.edgeId);
      if (edge === undefined) continue;
      const alt = dist.get(currentNode.id)! + (edge.weight ?? 1);

      yield createGraphFrame(
        step++,
        'inspect',
        graph,
        [currentNode.id, neighbor.nodeId, neighbor.edgeId],
        2,
        `Релаксация ${neighbor.edgeId}: candidate=${alt}, current=${dist.get(neighbor.nodeId)}.`,
        createGraphMeta(start, visited, frontier, traversed, currentNode.id),
      );

      if (alt < dist.get(neighbor.nodeId)!) {
        dist.set(neighbor.nodeId, alt);
        traversed.add(neighbor.edgeId);
        frontier.push(neighbor.nodeId);
        yield createGraphFrame(
          step++,
          'enqueue',
          graph,
          [neighbor.nodeId, neighbor.edgeId],
          3,
          `Обновили dist(${neighbor.nodeId}) = ${alt}.`,
          createGraphMeta(start, visited, frontier, traversed, neighbor.nodeId),
        );
      }
    }
  }

  yield createGraphFrame(
    step,
    'complete',
    graph,
    [],
    4,
    'Дейкстра завершён: кратчайшие расстояния вычислены.',
    createGraphMeta(start, visited, frontier, traversed),
  );
}

export function* mstDemo(): Generator<GraphAlgorithmFrame, void, unknown> {
  const graph = weightedGraph;
  const parent = new Map<NodeId, NodeId>(graph.nodes.map((n) => [n.id, n.id]));
  const rank = new Map<NodeId, number>(graph.nodes.map((n) => [n.id, 0]));
  const traversed = new Set<EdgeId>();
  const visited = new Set<NodeId>();
  const frontier: NodeId[] = [];
  let step = 0;

  const find = (x: NodeId): NodeId => {
    const p = parent.get(x)!;
    if (p === x) return x;
    const root = find(p);
    parent.set(x, root);
    return root;
  };

  const union = (a: NodeId, b: NodeId): boolean => {
    let ra = find(a);
    let rb = find(b);
    if (ra === rb) return false;
    if (rank.get(ra)! < rank.get(rb)!) [ra, rb] = [rb, ra];
    parent.set(rb, ra);
    if (rank.get(ra) === rank.get(rb)) rank.set(ra, rank.get(ra)! + 1);
    return true;
  };

  const edges = [...graph.edges].sort((a, b) => (a.weight ?? 1) - (b.weight ?? 1));

  for (const edge of edges) {
    yield createGraphFrame(
      step++,
      'inspect',
      graph,
      [edge.id, edge.source, edge.target],
      1,
      `Проверяем ребро ${edge.id} (w=${edge.weight ?? 1}).`,
      createGraphMeta('A', visited, frontier, traversed, edge.source),
    );

    if (union(edge.source, edge.target)) {
      traversed.add(edge.id);
      visited.add(edge.source);
      visited.add(edge.target);
      frontier.push(edge.source, edge.target);
      yield createGraphFrame(
        step++,
        'enqueue',
        graph,
        [edge.id, edge.source, edge.target],
        2,
        `Ребро ${edge.id} добавлено в MST.`,
        createGraphMeta('A', visited, frontier, traversed, edge.target),
      );
    }
  }

  yield createGraphFrame(
    step,
    'complete',
    graph,
    [],
    3,
    `MST завершено: выбрано рёбер ${traversed.size}.`,
    createGraphMeta('A', visited, frontier, traversed),
  );
}
