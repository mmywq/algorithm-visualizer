import type { EdgeId, GraphAlgorithmFrame, GraphSnapshot, NodeId } from '@/types';
import { buildAdjacencyList, createGraphFrame, createGraphMeta, getNeighbors, hasNode } from './utils';

export const defaultWeightedGraph: GraphSnapshot = {
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

// Три компоненты разного размера: {A,B,C,D}, {E,F,G} и изолированная вершина H
export const defaultComponentsGraph: GraphSnapshot = {
  nodes: [
    { id: 'A', label: 'A', position: { x: 110, y: 110 }, payload: {} },
    { id: 'B', label: 'B', position: { x: 260, y: 70 }, payload: {} },
    { id: 'C', label: 'C', position: { x: 280, y: 210 }, payload: {} },
    { id: 'D', label: 'D', position: { x: 130, y: 260 }, payload: {} },
    { id: 'E', label: 'E', position: { x: 500, y: 100 }, payload: {} },
    { id: 'F', label: 'F', position: { x: 640, y: 160 }, payload: {} },
    { id: 'G', label: 'G', position: { x: 520, y: 260 }, payload: {} },
    { id: 'H', label: 'H', position: { x: 680, y: 350 }, payload: {} },
  ],
  edges: [
    { id: 'A-B', source: 'A', target: 'B', directed: false, payload: {} },
    { id: 'B-C', source: 'B', target: 'C', directed: false, payload: {} },
    { id: 'C-D', source: 'C', target: 'D', directed: false, payload: {} },
    { id: 'A-C', source: 'A', target: 'C', directed: false, payload: {} },
    { id: 'E-F', source: 'E', target: 'F', directed: false, payload: {} },
    { id: 'F-G', source: 'F', target: 'G', directed: false, payload: {} },
  ],
};

export function* connectedComponents(graph: GraphSnapshot): Generator<GraphAlgorithmFrame, void, unknown> {
  const adjacency = buildAdjacencyList(graph);
  const visited = new Set<NodeId>();
  const traversed = new Set<EdgeId>();
  const componentMembers: NodeId[][] = [];
  let step = 0;

  const liveMeta = () => ({
    components: componentMembers.map((members) => [...members]),
    componentCount: componentMembers.length,
  });

  if (graph.nodes.length === 0) {
    yield createGraphFrame(step, 'complete', graph, [], 4, 'Граф пуст: добавьте вершины, чтобы искать компоненты связности.', { ...createGraphMeta('', visited, [], traversed), ...liveMeta() });
    return;
  }

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
      `Вершина ${node.id} ещё не отнесена ни к одной компоненте — начинается компонента №${componentIndex}, вершина ${node.id} помещается в стек обхода.`,
      { ...createGraphMeta(node.id, visited, stack, traversed, node.id), ...liveMeta() },
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
          `Вершина ${current} уже включена в компоненту, второй раз её не обрабатываем.`,
          { ...createGraphMeta(node.id, visited, stack, traversed, current), ...liveMeta() },
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
        `Добавляем вершину ${current} в компоненту №${componentIndex}. Её состав теперь: [${members.join(', ')}].`,
        { ...createGraphMeta(node.id, visited, stack, traversed, current), ...liveMeta() },
      );

      for (const neighbor of getNeighbors(adjacency, current)) {
        const isNew = !visited.has(neighbor.nodeId);
        yield createGraphFrame(
          step++,
          'inspect',
          graph,
          [current, neighbor.nodeId, neighbor.edgeId],
          3,
          `Проверяется ребро ${current}—${neighbor.nodeId}: вершина ${neighbor.nodeId} ${isNew ? 'ещё не посещена и помещается в стек — она войдёт в эту же компоненту' : 'уже посещена и пропускается'}.`,
          { ...createGraphMeta(node.id, visited, stack, traversed, current), ...liveMeta() },
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
    `Все вершины распределены. Найдено компонент связности: ${componentMembers.length}. ${componentMembers.map((members, index) => `Компонента №${index + 1} содержит ${members.length} ${formatNodesWord(members.length)}: [${members.join(', ')}]`).join('; ')}. Между компонентами нет ни одного ребра — именно поэтому они не объединились в одну.`,
    { ...createGraphMeta(graph.nodes[0]?.id ?? '', visited, [], traversed), ...liveMeta() },
  );
}

export function* dijkstra(graph: GraphSnapshot, startNodeId: NodeId): Generator<GraphAlgorithmFrame, void, unknown> {
  const dist = new Map<NodeId, number>(graph.nodes.map((node) => [node.id, Number.POSITIVE_INFINITY]));
  const previousEdge = new Map<NodeId, EdgeId>();
  const previousNode = new Map<NodeId, NodeId>();
  const visited = new Set<NodeId>();
  const traversed = new Set<EdgeId>();
  const frontier: NodeId[] = [startNodeId];
  let step = 0;

  const buildPath = (nodeId: NodeId): string => {
    if (!Number.isFinite(dist.get(nodeId) ?? Number.POSITIVE_INFINITY)) return '—';
    const path: NodeId[] = [nodeId];
    let cursor = nodeId;
    while (cursor !== startNodeId) {
      const prev = previousNode.get(cursor);
      if (prev === undefined) break;
      path.unshift(prev);
      cursor = prev;
    }
    return path.join(' → ');
  };

  const distanceRows = () => graph.nodes.map((node) => ({
    nodeId: node.id,
    distance: formatDistance(dist.get(node.id) ?? Number.POSITIVE_INFINITY),
    path: buildPath(node.id),
    isFinal: visited.has(node.id),
  }));

  if (!hasNode(graph, startNodeId)) {
    yield createGraphFrame(step, 'complete', graph, [], 5, `Алгоритм не запущен: стартовая вершина ${startNodeId} отсутствует в графе.`, { ...createGraphMeta(startNodeId, visited, [], traversed), distanceRows: distanceRows() });
    return;
  }

  const adjacency = buildAdjacencyList(graph);
  dist.set(startNodeId, 0);

  yield createGraphFrame(
    step++,
    'initial',
    graph,
    [startNodeId],
    1,
    `Подготовка: расстояние до стартовой вершины ${startNodeId} равно 0, до всех остальных — ∞ (путь пока не найден).`,
    { ...createGraphMeta(startNodeId, visited, frontier, traversed, startNodeId), distanceRows: distanceRows() },
  );

  while (visited.size < graph.nodes.length) {
    const candidates = graph.nodes.filter((node) => !visited.has(node.id));
    const seed = candidates[0];
    if (seed === undefined) break;
    const currentNode = candidates.reduce(
      (best, node) => (dist.get(node.id)! < dist.get(best.id)! ? node : best),
      seed,
    );

    const currentDistance = dist.get(currentNode.id)!;
    if (currentDistance === Number.POSITIVE_INFINITY) {
      yield createGraphFrame(
        step++,
        'inspect',
        graph,
        [],
        2,
        `У всех необработанных вершин расстояние ∞ — из ${startNodeId} до них пути нет. Завершаем работу.`,
        { ...createGraphMeta(startNodeId, visited, [], traversed), distanceRows: distanceRows() },
      );
      break;
    }
    visited.add(currentNode.id);

    yield createGraphFrame(
      step++,
      'visit',
      graph,
      [currentNode.id],
      2,
      `Среди необработанных вершин минимальная оценка у ${currentNode.id}: ${currentDistance}. Фиксируем её — это расстояние окончательное.`,
      { ...createGraphMeta(startNodeId, visited, frontier.filter((id) => !visited.has(id)), traversed, currentNode.id), distanceRows: distanceRows() },
    );

    for (const neighbor of getNeighbors(adjacency, currentNode.id)) {
      const edge = graph.edges.find((item) => item.id === neighbor.edgeId);
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
        `Релаксация ребра ${currentNode.id}—${neighbor.nodeId}: путь через ${currentNode.id} стоит ${currentDistance} + ${weight} = ${alt}. Текущая оценка вершины ${neighbor.nodeId}: ${formatDistance(previous)}.`,
        { ...createGraphMeta(startNodeId, visited, frontier.filter((id) => !visited.has(id)), traversed, currentNode.id), distanceRows: distanceRows() },
      );

      if (alt < previous) {
        const oldEdge = previousEdge.get(neighbor.nodeId);
        if (oldEdge !== undefined) traversed.delete(oldEdge);
        previousEdge.set(neighbor.nodeId, neighbor.edgeId);
        previousNode.set(neighbor.nodeId, currentNode.id);
        dist.set(neighbor.nodeId, alt);
        traversed.add(neighbor.edgeId);
        if (!frontier.includes(neighbor.nodeId)) frontier.push(neighbor.nodeId);

        yield createGraphFrame(
          step++,
          'enqueue',
          graph,
          [neighbor.nodeId, neighbor.edgeId],
          4,
          `${alt} < ${formatDistance(previous)} — путь стал короче. Обновляем оценку вершины ${neighbor.nodeId} на ${alt}; лучший вход в неё теперь по ребру ${currentNode.id}—${neighbor.nodeId}.`,
          { ...createGraphMeta(startNodeId, visited, frontier.filter((id) => !visited.has(id)), traversed, neighbor.nodeId), distanceRows: distanceRows() },
        );
      }
    }
  }

  const summaryRows = graph.nodes
    .filter((node) => node.id !== startNodeId)
    .map((node) => {
      const distance = formatDistance(dist.get(node.id)!);
      return Number.isFinite(dist.get(node.id)!)
        ? `до ${node.id}: расстояние ${distance}, путь ${buildPath(node.id)}`
        : `до ${node.id}: пути не существует`;
    });
  yield createGraphFrame(
    step,
    'complete',
    graph,
    [],
    5,
    `Алгоритм Дейкстры завершён. Кратчайшие пути из вершины ${startNodeId}: ${summaryRows.join('; ')}. Выделенные рёбра образуют дерево кратчайших путей.`,
    { ...createGraphMeta(startNodeId, visited, [], traversed), distanceRows: distanceRows() },
  );
}

export function* mstKruskal(graph: GraphSnapshot): Generator<GraphAlgorithmFrame, void, unknown> {
  const parent = new Map<NodeId, NodeId>(graph.nodes.map((node) => [node.id, node.id]));
  const rank = new Map<NodeId, number>(graph.nodes.map((node) => [node.id, 0]));
  const traversed = new Set<EdgeId>();
  const visited = new Set<NodeId>();
  let totalWeight = 0;
  let step = 0;

  const liveMeta = () => ({
    mstEdgeIds: [...traversed],
    totalWeight,
  });

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

  if (graph.nodes.length === 0) {
    yield createGraphFrame(step, 'complete', graph, [], 4, 'Граф пуст: добавьте вершины и рёбра, чтобы строить остовное дерево.', { ...createGraphMeta('', visited, [], traversed), ...liveMeta() });
    return;
  }

  const edges = [...graph.edges].sort((a, b) => (a.weight ?? 1) - (b.weight ?? 1));
  const startId = graph.nodes[0]!.id;

  yield createGraphFrame(
    step++,
    'initial',
    graph,
    [],
    1,
    `Сортируем все рёбра по возрастанию веса: ${edges.map((edge) => `${edge.source}—${edge.target} (${edge.weight ?? 1})`).join(', ')}. Будем брать самые лёгкие, если они не создают цикл.`,
    { ...createGraphMeta(startId, visited, [], traversed), ...liveMeta() },
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
      `Рассматривается ребро ${edge.source}—${edge.target} с весом ${weight}. Вершина ${edge.source} принадлежит группе «${sourceRoot}», вершина ${edge.target} — группе «${targetRoot}». ${sourceRoot === targetRoot ? 'Группы совпадают: добавление ребра образовало бы цикл, ребро отклоняется.' : 'Группы различны: цикл не образуется, ребро можно добавить.'}`,
      { ...createGraphMeta(startId, visited, [], traversed, edge.source), ...liveMeta() },
    );

    if (union(edge.source, edge.target)) {
      traversed.add(edge.id);
      visited.add(edge.source);
      visited.add(edge.target);
      totalWeight += weight;

      yield createGraphFrame(
        step++,
        'enqueue',
        graph,
        [edge.id, edge.source, edge.target],
        3,
        `Ребро ${edge.source}—${edge.target} добавлено в остов. Выбрано ${traversed.size} из ${graph.nodes.length - 1} необходимых рёбер, суммарный вес: ${totalWeight}.`,
        { ...createGraphMeta(startId, visited, [], traversed, edge.target), ...liveMeta() },
      );

      if (traversed.size === graph.nodes.length - 1) {
        break;
      }
    }
  }

  const isComplete = traversed.size === graph.nodes.length - 1;
  const chosenEdges = graph.edges
    .filter((edge) => traversed.has(edge.id))
    .map((edge) => `${edge.source}—${edge.target} (вес ${edge.weight ?? 1})`);
  yield createGraphFrame(
    step,
    'complete',
    graph,
    [],
    4,
    isComplete
      ? `Минимальное остовное дерево построено. В остов вошли рёбра: ${chosenEdges.join(', ')} — это ${traversed.size} рёбер для ${graph.nodes.length} вершин, суммарный вес ${totalWeight}. Каждое ребро выбрано как самое лёгкое из не образующих цикл, поэтому полученное дерево соединяет все вершины с минимальной возможной суммой весов.`
      : `Рёбра закончились, а дерево охватило не все вершины: граф несвязный. Получен минимальный остовный лес из ${traversed.size} рёбер (${chosenEdges.join(', ') || '—'}) с суммарным весом ${totalWeight}.`,
    { ...createGraphMeta(startId, visited, [], traversed), ...liveMeta() },
  );
}

const formatDistance = (value: number): string => (Number.isFinite(value) ? value.toString() : '∞');

const formatNodesWord = (count: number): string => {
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'вершин';
  const mod10 = count % 10;
  if (mod10 === 1) return 'вершину';
  if (mod10 >= 2 && mod10 <= 4) return 'вершины';
  return 'вершин';
};
