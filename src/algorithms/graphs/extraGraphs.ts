import type { ColorName } from '@/content/catalog';
import type { AlgorithmPhase, EdgeId, GraphAlgorithmFrame, GraphAlgorithmMeta, GraphEdge, GraphSnapshot, NodeId } from '@/types';
import { buildAdjacencyList, createGraphFrame, getNeighbors, hasNode } from './utils';
import { countOf } from '@/lib/plural';

type GraphGenerator = Generator<GraphAlgorithmFrame, void, unknown>;
type EdgeTone = 'idle' | 'active' | 'tree' | 'rejected' | 'path' | 'muted';

const formatDistance = (value: number): string => (Number.isFinite(value) ? String(value) : '∞');

const node = (id: string) => ({ id, label: id, position: { x: 0, y: 0 }, payload: {} });
const edge = (source: string, target: string, weight: number | undefined, directed: boolean): GraphEdge => ({
  id: `${source}-${target}`,
  source,
  target,
  ...(weight === undefined ? {} : { weight }),
  directed,
  payload: {},
});

// ---------- графы по умолчанию ----------

/** Учебный план: курс можно начать, когда пройдены все предыдущие. */
export const defaultDagGraph: GraphSnapshot = {
  nodes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(node),
  edges: [
    ['A', 'C'],
    ['B', 'C'],
    ['B', 'D'],
    ['C', 'E'],
    ['D', 'E'],
    ['D', 'F'],
    ['E', 'G'],
    ['F', 'G'],
  ].map(([s, t]) => edge(s!, t!, undefined, true)),
};

/** Отрицательное ребро C → B делает путь A → C → B короче прямого A → B — Дейкстра бы ошиблась. */
export const defaultNegativeGraph: GraphSnapshot = {
  nodes: ['A', 'B', 'C', 'D', 'E'].map(node),
  edges: [
    ['A', 'B', 4],
    ['A', 'C', 5],
    ['C', 'B', -3],
    ['B', 'D', 3],
    ['C', 'D', 4],
    ['D', 'E', 2],
    ['B', 'E', 6],
  ].map(([s, t, w]) => edge(s as string, t as string, w as number, true)),
};

export const defaultAllPairsGraph: GraphSnapshot = {
  nodes: ['A', 'B', 'C', 'D'].map(node),
  edges: [
    ['A', 'B', 3],
    ['B', 'C', 2],
    ['A', 'C', 8],
    ['C', 'D', 1],
    ['D', 'A', 2],
    ['B', 'D', 6],
  ].map(([s, t, w]) => edge(s as string, t as string, w as number, true)),
};

export const defaultCycleGraph: GraphSnapshot = {
  nodes: ['A', 'B', 'C', 'D', 'E', 'F'].map(node),
  edges: [
    ['A', 'B'],
    ['A', 'E'],
    ['B', 'C'],
    ['C', 'D'],
    ['E', 'F'],
    ['F', 'C'],
    ['D', 'B'],
  ].map(([s, t]) => edge(s!, t!, undefined, true)),
};

export const defaultBipartiteGraph: GraphSnapshot = {
  nodes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(node),
  edges: [
    ['A', 'B'],
    ['B', 'C'],
    ['C', 'D'],
    ['D', 'E'],
    ['E', 'F'],
    ['F', 'A'],
    ['A', 'D'],
    ['C', 'G'],
  ].map(([s, t]) => edge(s!, t!, undefined, false)),
};

// ---------- общий конструктор кадров ----------

interface FrameState {
  start: NodeId;
  current?: NodeId | undefined;
  visited: Iterable<NodeId>;
  frontier: Iterable<NodeId>;
  traversed: Iterable<EdgeId>;
  extra?: Record<string, unknown>;
}

const makeFrame =
  (graph: GraphSnapshot) =>
  (step: number, phase: AlgorithmPhase, active: readonly string[], line: number, message: string, state: FrameState): GraphAlgorithmFrame => {
    const meta: GraphAlgorithmMeta = {
      startNodeId: state.start,
      visitedNodeIds: [...state.visited],
      frontierNodeIds: [...state.frontier],
      traversedEdgeIds: [...state.traversed],
      ...(state.current === undefined ? {} : { currentNodeId: state.current }),
      ...state.extra,
    };
    return createGraphFrame(step, phase, graph, active, line, message, meta);
  };

// ---------- алгоритм Прима ----------

export function* prim(graph: GraphSnapshot, startNodeId: NodeId): GraphGenerator {
  const frame = makeFrame(graph);
  let step = 0;
  if (!hasNode(graph, startNodeId)) {
    yield frame(step, 'complete', [], 5, `Стартовая вершина ${startNodeId} отсутствует в графе.`, {
      start: startNodeId,
      visited: [],
      frontier: [],
      traversed: [],
    });
    return;
  }
  const inTree = new Set<NodeId>([startNodeId]);
  const chosen: EdgeId[] = [];
  let total = 0;

  const crossing = (): GraphEdge[] => graph.edges.filter((item) => inTree.has(item.source) !== inTree.has(item.target));
  const outside = (): NodeId[] => [...new Set(crossing().map((item) => (inTree.has(item.source) ? item.target : item.source)))];
  const state = (extraTones: Record<string, EdgeTone> = {}, current?: NodeId): FrameState => ({
    start: startNodeId,
    current,
    visited: inTree,
    frontier: outside(),
    traversed: chosen,
    extra: {
      totalWeight: total,
      mstEdgeIds: [...chosen],
      edgeTones: {
        ...Object.fromEntries(crossing().map((item) => [item.id, 'path' as EdgeTone])),
        ...Object.fromEntries(chosen.map((id) => [id, 'tree' as EdgeTone])),
        ...extraTones,
      },
    },
  });

  yield frame(
    step++,
    'initial',
    [startNodeId],
    1,
    `Остов растёт из вершины ${startNodeId}: сначала в дереве только она. Оранжевые рёбра ведут из дерева наружу — среди них будем выбирать.`,
    state({}, startNodeId),
  );

  while (inTree.size < graph.nodes.length) {
    const candidates = crossing();
    if (candidates.length === 0) {
      const rest = graph.nodes.filter((item) => !inTree.has(item.id)).map((item) => item.id);
      yield frame(
        step++,
        'complete',
        [],
        5,
        `Из дерева больше нет рёбер наружу: вершины ${rest.join(', ')} недостижимы. Граф несвязный — построено остовное дерево только его компоненты, вес ${total}.`,
        state(),
      );
      return;
    }
    yield frame(
      step++,
      'inspect',
      candidates.map((item) => item.id),
      2,
      `Рёбра из дерева наружу: ${candidates.map((item) => `${item.source}—${item.target} (${item.weight ?? 1})`).join(', ')}.`,
      state(),
    );
    const best = candidates.reduce((min, item) => ((item.weight ?? 1) < (min.weight ?? 1) ? item : min), candidates[0]!);
    const added = inTree.has(best.source) ? best.target : best.source;
    yield frame(
      step++,
      'compare',
      [best.id],
      3,
      `Самое лёгкое из них — ${best.source}—${best.target} с весом ${best.weight ?? 1}. По свойству разреза оно обязательно входит в минимальный остов.`,
      state({ [best.id]: 'active' }),
    );
    inTree.add(added);
    chosen.push(best.id);
    total += best.weight ?? 1;
    yield frame(
      step++,
      'visit',
      [added, best.id],
      4,
      `Добавляем ребро и вершину ${added}. В дереве ${inTree.size} из ${countOf(graph.nodes.length, 'вершины', 'вершин', 'вершин')}, вес ${total}.`,
      state({}, added),
    );
  }

  yield frame(
    step,
    'complete',
    [],
    5,
    `Минимальное остовное дерево построено: ${countOf(chosen.length, 'ребро', 'ребра', 'рёбер')}, суммарный вес ${total}. Рёбра выбраны жадно — каждый раз самое лёгкое через границу дерева.`,
    {
      ...state(),
      frontier: [],
    },
  );
}

// ---------- топологическая сортировка (Кан) ----------

export function* topologicalSort(graph: GraphSnapshot): GraphGenerator {
  const frame = makeFrame(graph);
  let step = 0;
  const indegree = new Map(graph.nodes.map((item) => [item.id, 0]));
  for (const item of graph.edges) indegree.set(item.target, (indegree.get(item.target) ?? 0) + 1);
  const adjacency = buildAdjacencyList(graph);
  const order: NodeId[] = [];
  const done = new Set<NodeId>();
  const used = new Set<EdgeId>();
  let queue = graph.nodes.filter((item) => indegree.get(item.id) === 0).map((item) => item.id);
  const start = graph.nodes[0]?.id ?? '';

  const state = (current?: NodeId, extraTones: Record<string, EdgeTone> = {}): FrameState => ({
    start,
    current,
    visited: done,
    frontier: queue,
    traversed: [],
    extra: {
      order: [...order],
      orderLabel: 'Порядок',
      nodeBadges: Object.fromEntries(graph.nodes.filter((item) => !done.has(item.id)).map((item) => [item.id, `вх ${indegree.get(item.id)}`])),
      edgeTones: { ...Object.fromEntries([...used].map((id) => [id, 'muted' as EdgeTone])), ...extraTones },
    },
  });

  yield frame(
    step++,
    'initial',
    [],
    1,
    'Считаем для каждой вершины число входящих рёбер — сколько «предшественников» должно идти раньше неё. Числа показаны на вершинах.',
    state(),
  );
  yield frame(
    step++,
    'enqueue',
    queue,
    2,
    queue.length === 0
      ? 'Вершин без входящих рёбер нет — с чего начать, непонятно: в графе есть цикл.'
      : `Без предшественников: ${queue.join(', ')}. С них можно начинать — ставим в очередь.`,
    state(),
  );

  while (queue.length > 0) {
    const current = queue[0]!;
    queue = queue.slice(1);
    order.push(current);
    done.add(current);
    yield frame(step++, 'dequeue', [current], 3, `Берём ${current} из очереди и дописываем в ответ: ${order.join(' → ')}.`, state(current));

    const released: NodeId[] = [];
    for (const neighbor of getNeighbors(adjacency, current)) {
      indegree.set(neighbor.nodeId, (indegree.get(neighbor.nodeId) ?? 1) - 1);
      used.add(neighbor.edgeId);
      if (indegree.get(neighbor.nodeId) === 0) {
        released.push(neighbor.nodeId);
        queue = [...queue, neighbor.nodeId];
      }
    }
    if (getNeighbors(adjacency, current).length > 0) {
      yield frame(
        step++,
        'enqueue',
        [current, ...getNeighbors(adjacency, current).map((item) => item.edgeId)],
        4,
        `Убираем рёбра из ${current}: у ${getNeighbors(adjacency, current)
          .map((item) => item.nodeId)
          .join(', ')} стало на одного предшественника меньше.${released.length > 0 ? ` Освободились: ${released.join(', ')} — в очередь.` : ''}`,
        state(current, Object.fromEntries(getNeighbors(adjacency, current).map((item) => [item.edgeId, 'active' as EdgeTone]))),
      );
    }
  }

  if (order.length < graph.nodes.length) {
    const stuck = graph.nodes.filter((item) => !done.has(item.id)).map((item) => item.id);
    yield frame(
      step,
      'complete',
      [],
      5,
      `Очередь опустела, а вершины ${stuck.join(', ')} так и не освободились — они лежат на цикле. Топологического порядка у графа с циклом не существует.`,
      {
        ...state(),
        extra: { ...state().extra, outcome: 'miss', nodeColors: Object.fromEntries(stuck.map((id) => [id, 'red' as ColorName])) },
      },
    );
    return;
  }
  yield frame(
    step,
    'complete',
    [],
    5,
    `Топологический порядок: ${order.join(' → ')}. Каждое ребро ведёт слева направо — любую вершину можно обработать после всех её предшественников.`,
    state(),
  );
}

// ---------- Беллман — Форд ----------

export function* bellmanFord(graph: GraphSnapshot, startNodeId: NodeId): GraphGenerator {
  const frame = makeFrame(graph);
  let step = 0;
  const dist = new Map<NodeId, number>(graph.nodes.map((item) => [item.id, Number.POSITIVE_INFINITY]));
  const prevEdge = new Map<NodeId, EdgeId>();
  const prevNode = new Map<NodeId, NodeId>();
  if (!hasNode(graph, startNodeId)) {
    yield frame(step, 'complete', [], 6, `Стартовая вершина ${startNodeId} отсутствует в графе.`, {
      start: startNodeId,
      visited: [],
      frontier: [],
      traversed: [],
    });
    return;
  }
  dist.set(startNodeId, 0);
  // в неориентированном графе каждое ребро релаксируется в обе стороны
  const arcs = graph.edges.flatMap((item) =>
    item.directed
      ? [{ item, from: item.source, to: item.target }]
      : [
          { item, from: item.source, to: item.target },
          { item, from: item.target, to: item.source },
        ],
  );

  const path = (target: NodeId): string => {
    if (!Number.isFinite(dist.get(target)!)) return '—';
    const result = [target];
    let cursor = target;
    const guard = new Set<NodeId>();
    while (cursor !== startNodeId && !guard.has(cursor)) {
      guard.add(cursor);
      const prev = prevNode.get(cursor);
      if (prev === undefined) break;
      result.unshift(prev);
      cursor = prev;
    }
    return result.join(' → ');
  };
  const rows = () => graph.nodes.map((item) => ({ nodeId: item.id, distance: formatDistance(dist.get(item.id)!), path: path(item.id), isFinal: false }));
  const reached = () => graph.nodes.filter((item) => Number.isFinite(dist.get(item.id)!)).map((item) => item.id);
  const state = (round: number, current?: NodeId, extra: Record<string, unknown> = {}): FrameState => ({
    start: startNodeId,
    current,
    visited: [],
    frontier: reached(),
    traversed: [...prevEdge.values()],
    extra: { distanceRows: rows(), round, ...extra },
  });

  yield frame(
    step++,
    'initial',
    [startNodeId],
    1,
    `dist[${startNodeId}] = 0, до остальных — ∞. Беллман — Форд не выбирает «ближайшую» вершину, а просто ${countOf(graph.nodes.length - 1, 'раз', 'раза', 'раз')} проходит по всем рёбрам.`,
    state(0, startNodeId),
  );

  for (let round = 1; round < graph.nodes.length; round += 1) {
    let changed = false;
    yield frame(
      step++,
      'inspect',
      [],
      2,
      `Проход ${round} из ${graph.nodes.length - 1}: по очереди релаксируем все ${arcs.length} ${arcs.length === graph.edges.length ? 'рёбер' : 'направлений рёбер'}.`,
      state(round),
    );
    for (const arc of arcs) {
      const from = dist.get(arc.from)!;
      if (!Number.isFinite(from)) continue;
      const weight = arc.item.weight ?? 1;
      const alt = from + weight;
      const before = dist.get(arc.to)!;
      if (alt < before) {
        dist.set(arc.to, alt);
        prevEdge.set(arc.to, arc.item.id);
        prevNode.set(arc.to, arc.from);
        changed = true;
        yield frame(
          step++,
          'merge',
          [arc.from, arc.to, arc.item.id],
          3,
          `${arc.from} → ${arc.to}: ${from} + (${weight}) = ${alt} < ${formatDistance(before)} — улучшаем dist[${arc.to}].`,
          state(round, arc.to, { edgeTones: { [arc.item.id]: 'active' } }),
        );
      }
    }
    if (!changed) {
      yield frame(
        step++,
        'inspect',
        [],
        4,
        `За проход ${round} ничего не изменилось — расстояния уже окончательные, остальные проходы можно пропустить.`,
        state(round),
      );
      break;
    }
  }

  const bad = arcs.find((arc) => Number.isFinite(dist.get(arc.from)!) && dist.get(arc.from)! + (arc.item.weight ?? 1) < dist.get(arc.to)!);
  if (bad !== undefined) {
    yield frame(
      step,
      'complete',
      [bad.item.id],
      5,
      `Контрольный проход: ребро ${bad.from} → ${bad.to} всё ещё улучшает расстояние. Значит, есть цикл отрицательного веса — по нему можно ходить бесконечно, уменьшая путь, и кратчайших путей не существует.`,
      state(graph.nodes.length, undefined, { outcome: 'miss', edgeTones: { [bad.item.id]: 'rejected' } }),
    );
    return;
  }
  yield frame(
    step,
    'complete',
    [],
    6,
    `Контрольный проход ничего не улучшил — отрицательных циклов нет. Кратчайшие расстояния: ${graph.nodes
      .filter((item) => item.id !== startNodeId)
      .map((item) => `${item.id} = ${formatDistance(dist.get(item.id)!)}`)
      .join(', ')}.`,
    { ...state(graph.nodes.length), visited: reached() },
  );
}

// ---------- Флойд — Уоршелл ----------

export interface MatrixMeta {
  readonly labels: readonly string[];
  readonly matrix: readonly (readonly (number | null)[])[];
  readonly k?: number;
  readonly i?: number;
  readonly j?: number;
  readonly changed?: readonly [number, number];
}

export function* floydWarshall(graph: GraphSnapshot): GraphGenerator {
  const frame = makeFrame(graph);
  let step = 0;
  const labels = graph.nodes.map((item) => item.id);
  const n = labels.length;
  const index = new Map(labels.map((id, position) => [id, position]));
  const d: number[][] = labels.map((_, i) => labels.map((__, j) => (i === j ? 0 : Number.POSITIVE_INFINITY)));
  for (const item of graph.edges) {
    const a = index.get(item.source)!;
    const b = index.get(item.target)!;
    d[a]![b] = Math.min(d[a]![b]!, item.weight ?? 1);
    if (!item.directed) d[b]![a] = Math.min(d[b]![a]!, item.weight ?? 1);
  }
  const snapshotMatrix = () => d.map((row) => row.map((value) => (Number.isFinite(value) ? value : null)));
  const start = labels[0] ?? '';
  const state = (extra: Partial<MatrixMeta> & Record<string, unknown>, current?: NodeId, visited: NodeId[] = []): FrameState => ({
    start,
    current,
    visited,
    frontier: [],
    traversed: [],
    extra: { labels, matrix: snapshotMatrix(), ...extra },
  });

  yield frame(
    step++,
    'initial',
    [],
    1,
    `Матрица расстояний: на диагонали 0, для рёбер — их вес, остальное ∞. Будем по очереди разрешать путям проходить через каждую вершину.`,
    state({}),
  );

  for (let k = 0; k < n; k += 1) {
    const via = labels[k]!;
    const allowed = labels.slice(0, k + 1);
    yield frame(
      step++,
      'visit',
      [via],
      2,
      `Промежуточная вершина k = ${via}: проверим, не станет ли путь i → ${via} → j короче текущего i → j.`,
      state({ k }, via, allowed.slice(0, -1)),
    );
    let improved = 0;
    for (let i = 0; i < n; i += 1) {
      if (i === k || !Number.isFinite(d[i]![k]!)) continue;
      for (let j = 0; j < n; j += 1) {
        if (j === k || !Number.isFinite(d[k]![j]!)) continue;
        const through = d[i]![k]! + d[k]![j]!;
        if (through < d[i]![j]!) {
          const before = d[i]![j]!;
          d[i]![j] = through;
          improved += 1;
          yield frame(
            step++,
            'merge',
            [labels[i]!, via, labels[j]!],
            4,
            `${labels[i]} → ${via} → ${labels[j]}: ${d[i]![k]} + ${d[k]![j]} = ${through} < ${formatDistance(before)}. Записываем d[${labels[i]}][${labels[j]}] = ${through}.`,
            state({ k, i, j, changed: [i, j], nodeColors: { [labels[i]!]: 'brand', [labels[j]!]: 'brand' } }, via, allowed.slice(0, -1)),
          );
        }
      }
    }
    if (improved === 0) yield frame(step++, 'inspect', [via], 3, `Через ${via} ни один путь не стал короче.`, state({ k }, via, allowed.slice(0, -1)));
  }

  const negative = d.findIndex((row, i) => row[i]! < 0);
  if (negative >= 0) {
    yield frame(
      step,
      'complete',
      [],
      5,
      `На диагонали отрицательное число d[${labels[negative]}][${labels[negative]}] = ${d[negative]![negative]} — через ${labels[negative]} проходит цикл отрицательного веса. Кратчайшие пути не определены.`,
      {
        ...state({}),
        extra: { labels, matrix: snapshotMatrix(), outcome: 'miss' },
      },
    );
    return;
  }
  yield frame(
    step,
    'complete',
    [],
    5,
    `Готово: матрица содержит кратчайшие расстояния между всеми парами. Три вложенных цикла по ${n} вершинам — ${n}³ = ${n ** 3} проверок.`,
    state({}, undefined, labels),
  );
}

// ---------- поиск цикла в ориентированном графе ----------

export function* cycleDetection(graph: GraphSnapshot): GraphGenerator {
  const frame = makeFrame(graph);
  let step = 0;
  const adjacency = buildAdjacencyList(graph);
  const color = new Map<NodeId, 'white' | 'gray' | 'black'>(graph.nodes.map((item) => [item.id, 'white']));
  const stack: NodeId[] = [];
  const stackEdges: EdgeId[] = [];
  const start = graph.nodes[0]?.id ?? '';
  let cycle: { nodes: NodeId[]; edges: EdgeId[] } | null = null;

  const colors = (): Record<string, ColorName> =>
    Object.fromEntries(
      graph.nodes.filter((item) => color.get(item.id) !== 'white').map((item) => [item.id, color.get(item.id) === 'gray' ? 'yellow' : 'green']),
    ) as Record<string, ColorName>;
  const state = (current?: NodeId, extraTones: Record<string, EdgeTone> = {}, extra: Record<string, unknown> = {}): FrameState => ({
    start,
    current,
    visited: [],
    frontier: [],
    traversed: [],
    extra: {
      nodeColors: colors(),
      order: [...stack],
      orderLabel: 'Стек (серые)',
      edgeTones: { ...Object.fromEntries(stackEdges.map((id) => [id, 'tree' as EdgeTone])), ...extraTones },
      ...extra,
    },
  });

  yield frame(
    step++,
    'initial',
    [],
    1,
    'Все вершины белые — не посещены. Серым будем красить вершины на текущем пути обхода в глубину, чёрным (здесь — зелёным) — полностью обработанные.',
    state(),
  );

  function* dfs(v: NodeId): GraphGenerator {
    color.set(v, 'gray');
    stack.push(v);
    yield frame(step++, 'push', [v], 2, `Входим в ${v} и красим её в серый: она на текущем пути ${stack.join(' → ')}.`, state(v));
    for (const neighbor of getNeighbors(adjacency, v)) {
      if (cycle !== null) return;
      const u = neighbor.nodeId;
      const c = color.get(u);
      yield frame(
        step++,
        'inspect',
        [v, u, neighbor.edgeId],
        3,
        `Ребро ${v} → ${u}: вершина ${u} ${c === 'white' ? 'белая' : c === 'gray' ? 'серая' : 'уже обработана'}.`,
        state(v, { [neighbor.edgeId]: 'active' }),
      );
      if (c === 'gray') {
        const from = stack.indexOf(u);
        const nodes = stack.slice(from);
        const edges = [...stackEdges.slice(from), neighbor.edgeId];
        cycle = { nodes, edges };
        return;
      }
      if (c === 'white') {
        stackEdges.push(neighbor.edgeId);
        yield* dfs(u);
        if (cycle !== null) return;
        stackEdges.pop();
      }
    }
    color.set(v, 'black');
    stack.pop();
    yield frame(step++, 'pop', [v], 6, `Все рёбра из ${v} проверены — красим её в «чёрный» и возвращаемся.`, state(stack.at(-1)));
  }

  for (const item of graph.nodes) {
    if (cycle !== null) break;
    if (color.get(item.id) === 'white') yield* dfs(item.id);
  }

  if (cycle !== null) {
    const found = cycle as { nodes: NodeId[]; edges: EdgeId[] };
    yield frame(
      step,
      'complete',
      found.edges,
      4,
      `Ребро ведёт в серую вершину ${found.nodes[0]} — она ещё на текущем пути. Это обратное ребро, найден цикл: ${[...found.nodes, found.nodes[0]].join(' → ')}.`,
      state(undefined, Object.fromEntries(found.edges.map((id) => [id, 'path' as EdgeTone])), {
        nodeColors: Object.fromEntries(found.nodes.map((id) => [id, 'red'])),
        found: true,
      }),
    );
    return;
  }
  yield frame(
    step,
    'complete',
    [],
    6,
    'Обход завершён, обратных рёбер не встретилось — граф ациклический. Для такого графа существует топологический порядок.',
    state(),
  );
}

// ---------- проверка двудольности ----------

export function* bipartiteCheck(graph: GraphSnapshot): GraphGenerator {
  const frame = makeFrame(graph);
  let step = 0;
  const adjacency = buildAdjacencyList(graph);
  const side = new Map<NodeId, 0 | 1>();
  const start = graph.nodes[0]?.id ?? '';
  const parts: ColorName[] = ['brand', 'teal'];
  let queue: NodeId[] = [];
  const tree = new Set<EdgeId>();

  const state = (current?: NodeId, extraTones: Record<string, EdgeTone> = {}, extra: Record<string, unknown> = {}): FrameState => ({
    start,
    current,
    visited: [],
    frontier: queue,
    traversed: tree,
    extra: {
      nodeColors: Object.fromEntries([...side.entries()].map(([id, value]) => [id, parts[value]!])),
      nodeBadges: Object.fromEntries([...side.entries()].map(([id, value]) => [id, value === 0 ? 'Л' : 'П'])),
      edgeTones: extraTones,
      ...extra,
    },
  });

  yield frame(
    step++,
    'initial',
    [],
    1,
    'Попробуем раскрасить вершины в два цвета (левая доля Л и правая П) так, чтобы каждое ребро соединяло разные цвета.',
    state(),
  );

  for (const item of graph.nodes) {
    if (side.has(item.id)) continue;
    side.set(item.id, 0);
    queue = [item.id];
    yield frame(step++, 'enqueue', [item.id], 1, `${item.id} ещё без цвета — относим к левой доле и начинаем обход в ширину.`, state(item.id));
    while (queue.length > 0) {
      const v = queue[0]!;
      queue = queue.slice(1);
      yield frame(step++, 'dequeue', [v], 2, `Извлекаем ${v} (${side.get(v) === 0 ? 'левая' : 'правая'} доля) и смотрим соседей.`, state(v));
      for (const neighbor of getNeighbors(adjacency, v)) {
        const u = neighbor.nodeId;
        if (!side.has(u)) {
          side.set(u, side.get(v) === 0 ? 1 : 0);
          tree.add(neighbor.edgeId);
          queue = [...queue, u];
          yield frame(
            step++,
            'enqueue',
            [v, u, neighbor.edgeId],
            3,
            `${u} без цвета — красим в противоположный: ${side.get(u) === 0 ? 'левая' : 'правая'} доля.`,
            state(v, { [neighbor.edgeId]: 'active' }),
          );
        } else if (side.get(u) === side.get(v)) {
          yield frame(
            step,
            'complete',
            [neighbor.edgeId],
            4,
            `Ребро ${v} — ${u} соединяет вершины одного цвета. Значит, в графе есть цикл нечётной длины, и разбить вершины на две доли нельзя — граф не двудольный.`,
            state(v, { [neighbor.edgeId]: 'rejected' }, { outcome: 'miss' }),
          );
          return;
        }
      }
    }
  }

  const left = graph.nodes.filter((item) => side.get(item.id) === 0).map((item) => item.id);
  const right = graph.nodes.filter((item) => side.get(item.id) === 1).map((item) => item.id);
  yield frame(
    step,
    'complete',
    [],
    5,
    `Конфликтов нет — граф двудольный: Л = {${left.join(', ')}}, П = {${right.join(', ')}}. Каждое ребро идёт между долями.`,
    state(undefined, {}, { found: true }),
  );
}
