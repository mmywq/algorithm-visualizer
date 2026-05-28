import type { EdgeId, GraphAlgorithmFrame, GraphSnapshot, NodeId } from '@/types';
import { buildAdjacencyList, createGraphFrame, createGraphMeta, getNeighbors } from './utils';

const weightedGraph: GraphSnapshot = {
  nodes: [
    { id: 'A', label: 'A', position: { x: 80, y: 210 }, payload: {} },
    { id: 'B', label: 'B', position: { x: 250, y: 80 }, payload: {} },
    { id: 'C', label: 'C', position: { x: 250, y: 330 }, payload: {} },
    { id: 'D', label: 'D', position: { x: 500, y: 80 }, payload: {} },
    { id: 'E', label: 'E', position: { x: 500, y: 330 }, payload: {} },
    { id: 'F', label: 'F', position: { x: 710, y: 210 }, payload: {} },
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
  const componentMembers: NodeId[][] = [];
  let step = 0;

  for (const node of graph.nodes) {
    if (visited.has(node.id)) continue;

    const componentIndex = componentMembers.length + 1;
    const members: NodeId[] = [];
    componentMembers.push(members);
    const stack: NodeId[] = [node.id];

    yield createGraphFrame(
      step++,
      'initial',
      graph,
      [node.id],
      1,
      `Компонента ${componentIndex}: стартуем из вершины ${node.id}. Стек обхода: [${stack.join(', ')}].`,
      createGraphMeta(node.id, visited, stack, traversed, node.id),
    );

    while (stack.length > 0) {
      const current = stack.pop();
      if (current === undefined) continue;

      if (visited.has(current)) {
        yield createGraphFrame(
          step++,
          'inspect',
          graph,
          [current],
          2,
          `Вершина ${current} уже относится к найденной компоненте, повторно её не обрабатываем.`,
          createGraphMeta(node.id, visited, stack, traversed, current),
        );
        continue;
      }

      visited.add(current);
      members.push(current);

      yield createGraphFrame(
        step++,
        'visit',
        graph,
        [current],
        2,
        `Компонента ${componentIndex}: добавляем вершину ${current}. Текущий состав компоненты: [${members.join(', ')}].`,
        createGraphMeta(node.id, visited, stack, traversed, current),
      );

      for (const neighbor of getNeighbors(adjacency, current)) {
        const isNew = !visited.has(neighbor.nodeId);
        yield createGraphFrame(
          step++,
          'inspect',
          graph,
          [current, neighbor.nodeId, neighbor.edgeId],
          3,
          `Проверяем ребро ${neighbor.edgeId}: ${current}—${neighbor.nodeId}. Вершина ${neighbor.nodeId} ${isNew ? 'ещё не посещена — кладём её в стек этой же компоненты' : 'уже посещена — пропускаем'}.`,
          createGraphMeta(node.id, visited, stack, traversed, current),
        );

        if (isNew) {
          traversed.add(neighbor.edgeId);
          stack.push(neighbor.nodeId);
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
    `Компоненты связности найдены: ${componentMembers.length}. Состав: ${componentMembers.map((members, index) => `#${index + 1}=[${members.join(', ')}]`).join('; ')}.`,
    createGraphMeta('A', visited, [], traversed),
  );
}

export function* dijkstraDemo(): Generator<GraphAlgorithmFrame, void, unknown> {
  const graph = weightedGraph;
  const start: NodeId = 'A';
  const adjacency = buildAdjacencyList(graph);
  const dist = new Map<NodeId, number>(graph.nodes.map((n) => [n.id, Number.POSITIVE_INFINITY]));
  const previousEdge = new Map<NodeId, EdgeId>();
  const visited = new Set<NodeId>();
  const traversed = new Set<EdgeId>();
  const frontier: NodeId[] = [start];
  let step = 0;

  dist.set(start, 0);

  yield createGraphFrame(
    step++,
    'initial',
    graph,
    [start],
    1,
    `Дейкстра стартует из ${start}: расстояние до ${start} равно 0, до остальных вершин пока ∞.`,
    createGraphMeta(start, visited, frontier, traversed, start),
  );

  while (visited.size < graph.nodes.length) {
    const candidates = graph.nodes.filter((n) => !visited.has(n.id));
    const seed = candidates[0];
    if (seed === undefined) break;
    const currentNode = candidates.reduce((best, node) =>
      dist.get(node.id)! < dist.get(best.id)! ? node : best,
    seed);

    const currentDistance = dist.get(currentNode.id)!;
    if (currentDistance === Number.POSITIVE_INFINITY) break;
    visited.add(currentNode.id);

    yield createGraphFrame(
      step++,
      'visit',
      graph,
      [currentNode.id],
      2,
      `Фиксируем вершину ${currentNode.id}: минимальное незафиксированное расстояние равно ${currentDistance}. Теперь оно окончательное.`,
      createGraphMeta(start, visited, frontier.filter((id) => !visited.has(id)), traversed, currentNode.id),
    );

    for (const neighbor of getNeighbors(adjacency, currentNode.id)) {
      const edge = graph.edges.find((e) => e.id === neighbor.edgeId);
      if (edge === undefined || visited.has(neighbor.nodeId)) continue;
      const weight = edge.weight ?? 1;
      const alt = currentDistance + weight;
      const previous = dist.get(neighbor.nodeId)!;

      yield createGraphFrame(
        step++,
        'inspect',
        graph,
        [currentNode.id, neighbor.nodeId, neighbor.edgeId],
        3,
        `Релаксация ребра ${neighbor.edgeId}: dist(${currentNode.id}) ${currentDistance} + вес ${weight} = ${alt}. Текущее dist(${neighbor.nodeId}) = ${formatDistance(previous)}.`,
        createGraphMeta(start, visited, frontier.filter((id) => !visited.has(id)), traversed, currentNode.id),
      );

      if (alt < previous) {
        const oldEdge = previousEdge.get(neighbor.nodeId);
        if (oldEdge !== undefined) traversed.delete(oldEdge);
        previousEdge.set(neighbor.nodeId, neighbor.edgeId);
        dist.set(neighbor.nodeId, alt);
        traversed.add(neighbor.edgeId);
        if (!frontier.includes(neighbor.nodeId)) frontier.push(neighbor.nodeId);

        yield createGraphFrame(
          step++,
          'enqueue',
          graph,
          [neighbor.nodeId, neighbor.edgeId],
          4,
          `Улучшаем путь до ${neighbor.nodeId}: новое расстояние ${alt}, предыдущее было ${formatDistance(previous)}. Ребро ${neighbor.edgeId} становится лучшим входом в вершину.`,
          createGraphMeta(start, visited, frontier.filter((id) => !visited.has(id)), traversed, neighbor.nodeId),
        );
      }
    }
  }

  const distances = graph.nodes.map((node) => `${node.id}=${formatDistance(dist.get(node.id)!)}`).join(', ');
  yield createGraphFrame(
    step,
    'complete',
    graph,
    [],
    5,
    `Дейкстра завершён: кратчайшие расстояния от ${start}: ${distances}.`,
    createGraphMeta(start, visited, [], traversed),
  );
}

export function* mstDemo(): Generator<GraphAlgorithmFrame, void, unknown> {
  const graph = weightedGraph;
  const parent = new Map<NodeId, NodeId>(graph.nodes.map((n) => [n.id, n.id]));
  const rank = new Map<NodeId, number>(graph.nodes.map((n) => [n.id, 0]));
  const traversed = new Set<EdgeId>();
  const visited = new Set<NodeId>();
  const frontier: NodeId[] = [];
  let totalWeight = 0;
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

  yield createGraphFrame(
    step++,
    'initial',
    graph,
    [],
    1,
    `Краскал сортирует рёбра по весу: ${edges.map((edge) => `${edge.id}:${edge.weight ?? 1}`).join(', ')}. Берём самые лёгкие, если они не создают цикл.`,
    createGraphMeta('A', visited, frontier, traversed),
  );

  for (const edge of edges) {
    const sourceRoot = find(edge.source);
    const targetRoot = find(edge.target);
    const weight = edge.weight ?? 1;

    yield createGraphFrame(
      step++,
      'inspect',
      graph,
      [edge.id, edge.source, edge.target],
      2,
      `Проверяем ребро ${edge.id} с весом ${weight}. Корень ${edge.source} = ${sourceRoot}, корень ${edge.target} = ${targetRoot}. ${sourceRoot === targetRoot ? 'Корни совпадают — добавление создаст цикл.' : 'Корни разные — ребро можно добавить.'}`,
      createGraphMeta('A', visited, frontier, traversed, edge.source),
    );

    if (union(edge.source, edge.target)) {
      traversed.add(edge.id);
      visited.add(edge.source);
      visited.add(edge.target);
      frontier.push(edge.source, edge.target);
      totalWeight += weight;

      yield createGraphFrame(
        step++,
        'enqueue',
        graph,
        [edge.id, edge.source, edge.target],
        3,
        `Ребро ${edge.id} добавлено в MST. Выбрано ${traversed.size}/${graph.nodes.length - 1} рёбер, текущий суммарный вес = ${totalWeight}.`,
        createGraphMeta('A', visited, frontier, traversed, edge.target),
      );

      if (traversed.size === graph.nodes.length - 1) {
        break;
      }
    }
  }

  yield createGraphFrame(
    step,
    'complete',
    graph,
    [],
    4,
    `MST завершено: выбраны рёбра [${[...traversed].join(', ')}], суммарный вес = ${totalWeight}.`,
    createGraphMeta('A', visited, [], traversed),
  );
}

const formatDistance = (value: number): string => Number.isFinite(value) ? value.toString() : '∞';
