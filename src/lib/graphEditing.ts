import { layoutGraph } from '@/lib/graphLayout';
import type { GraphEdge, GraphSnapshot, NodeId } from '@/types';

export const MAX_GRAPH_NODES = 16;

export interface GraphKind {
  readonly weighted: boolean;
  readonly directed: boolean;
  /** допускаются ли отрицательные веса (алгоритм Беллмана–Форда) */
  readonly negative?: boolean;
}

export const edgePairKey = (source: NodeId, target: NodeId, directed = false): string =>
  directed ? `${source}->${target}` : [source, target].sort().join('--');

export const isValidNodeLabel = (label: string): boolean => /^[A-Za-z0-9_-]{1,6}$/.test(label);

const weightRange = (kind: GraphKind): readonly [number, number] => (kind.negative === true ? [-99, 99] : [1, 99]);

export const clampWeight = (value: number, kind: GraphKind): number => {
  const [min, max] = weightRange(kind);
  const rounded = Math.round(value);
  if (kind.negative !== true && rounded < 1) return 1;
  return Math.min(max, Math.max(min, rounded));
};

/** Удаляет дубликаты вершин, петли и повторные рёбра, отбрасывает рёбра к несуществующим вершинам. */
export const normalizeGraph = (graph: GraphSnapshot, directed = false): GraphSnapshot => {
  const seenNodes = new Set<NodeId>();
  const nodes = graph.nodes.filter((node) => {
    if (seenNodes.has(node.id)) return false;
    seenNodes.add(node.id);
    return true;
  });
  const nodeIds = new Set(nodes.map((node) => node.id));
  const seenEdges = new Set<string>();
  const edges = graph.edges
    .filter((edge) => {
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target) || edge.source === edge.target) return false;
      const key = edgePairKey(edge.source, edge.target, directed);
      if (seenEdges.has(key)) return false;
      seenEdges.add(key);
      return true;
    })
    .map((edge) => (edge.directed === directed ? edge : { ...edge, directed }));
  return { nodes, edges };
};

export const getGraphStructureKey = (graph: GraphSnapshot): string => {
  const nodes = [...graph.nodes]
    .map((node) => node.id)
    .sort()
    .join('|');
  const edges = [...graph.edges]
    .map((edge) => `${edgePairKey(edge.source, edge.target, edge.directed)}:${edge.weight ?? ''}`)
    .sort()
    .join('|');
  return `${nodes}__${edges}`;
};

/**
 * Текстовое представление списка смежности.
 * Невзвешенный граф: «A: B, C». Взвешенный: «A: B(2), C(5)».
 * Для ориентированного графа в строке вершины перечислены только исходящие рёбра.
 */
export const serializeAdjacencyList = (graph: GraphSnapshot, kind: GraphKind): string => {
  const adjacency = new Map<NodeId, string[]>();
  for (const node of graph.nodes) adjacency.set(node.id, []);
  for (const edge of graph.edges) {
    const suffix = kind.weighted && edge.weight !== undefined ? `(${edge.weight})` : '';
    adjacency.get(edge.source)?.push(`${edge.target}${suffix}`);
    if (!kind.directed) adjacency.get(edge.target)?.push(`${edge.source}${suffix}`);
  }
  return graph.nodes.map((node) => `${node.id}: ${(adjacency.get(node.id) ?? []).join(', ')}`).join('\n');
};

export interface AdjacencyParseResult {
  readonly ok: boolean;
  readonly graph?: GraphSnapshot;
  readonly error?: string;
}

export const parseAdjacencyList = (source: string, kind: GraphKind): AdjacencyParseResult => {
  const lines = source
    .split(/\n|;/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) {
    return { ok: false, error: 'Список пуст. Каждая строка должна иметь вид «A: B, C» — вершина и её соседи.' };
  }

  const nodeIds: string[] = [];
  const nodeSet = new Set<string>();
  const edgeByKey = new Map<string, GraphEdge>();

  const registerNode = (id: string): void => {
    if (!nodeSet.has(id)) {
      nodeSet.add(id);
      nodeIds.push(id);
    }
  };

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    const rawNode = (colonIndex === -1 ? line : line.slice(0, colonIndex)).trim();
    const rawTargets = colonIndex === -1 ? '' : line.slice(colonIndex + 1);

    if (!isValidNodeLabel(rawNode)) {
      return { ok: false, error: `Недопустимая метка вершины «${rawNode}». Используйте до 6 символов: латинские буквы, цифры, _ и -.` };
    }
    registerNode(rawNode);

    const targets = rawTargets
      .split(',')
      .map((target) => target.trim())
      .filter((target) => target.length > 0);
    for (const targetToken of targets) {
      const match = /^([A-Za-z0-9_-]{1,6})(?:\((-?\d{1,2})\))?$/.exec(targetToken);
      if (match === null) {
        return { ok: false, error: `Не удалось разобрать «${targetToken}». Сосед записывается как B${kind.weighted ? ' или B(вес)' : ''}.` };
      }
      const target = match[1]!;
      if (target === rawNode) {
        return { ok: false, error: `Петля «${rawNode}—${rawNode}» не поддерживается: ребро должно соединять разные вершины.` };
      }
      registerNode(target);

      const key = edgePairKey(rawNode, target, kind.directed);
      if (edgeByKey.has(key)) continue;
      const rawWeight = Number(match[2] ?? '1');
      if (kind.weighted && kind.negative !== true && rawWeight < 1) {
        return { ok: false, error: `Вес ребра ${rawNode}—${target} должен быть положительным: алгоритм не работает с отрицательными весами.` };
      }
      edgeByKey.set(key, {
        id: `${rawNode}-${target}`,
        source: rawNode,
        target,
        directed: kind.directed,
        ...(kind.weighted ? { weight: clampWeight(rawWeight, kind) } : {}),
        payload: {},
      });
    }
  }

  if (nodeIds.length > MAX_GRAPH_NODES) {
    return { ok: false, error: `Слишком много вершин: ${nodeIds.length}. Максимум ${MAX_GRAPH_NODES}, чтобы граф оставался читаемым.` };
  }

  const nodes = nodeIds.map((id) => ({ id, label: id, position: { x: 0, y: 0 }, payload: {} }));
  const edges = [...edgeByKey.values()];
  return { ok: true, graph: { nodes: layoutGraph(nodes, edges), edges } };
};

/** Компактная запись графа для адресной строки: «A:B(2),C;B:D». */
export const encodeGraphParam = (graph: GraphSnapshot, kind: GraphKind): string =>
  serializeAdjacencyList(graph, kind)
    .split('\n')
    .map((line) => line.replace(/\s+/g, ''))
    .join(';');

export const decodeGraphParam = (raw: string, kind: GraphKind): GraphSnapshot | null => {
  const parsed = parseAdjacencyList(raw.replace(/;/g, '\n'), kind);
  return parsed.ok && parsed.graph !== undefined ? parsed.graph : null;
};

export interface MatrixView {
  readonly labels: readonly string[];
  /** вес ребра или null, если ребра нет; для невзвешенного графа вес равен 1 */
  readonly cells: readonly (readonly (number | null)[])[];
}

export const graphToMatrix = (graph: GraphSnapshot, directed = false): MatrixView => {
  const labels = graph.nodes.map((node) => node.id);
  const index = new Map(labels.map((label, i) => [label, i]));
  const cells: (number | null)[][] = labels.map(() => labels.map(() => null));

  for (const edge of graph.edges) {
    const i = index.get(edge.source);
    const j = index.get(edge.target);
    if (i === undefined || j === undefined) continue;
    const value = edge.weight ?? 1;
    cells[i]![j] = value;
    if (!directed) cells[j]![i] = value;
  }

  return { labels, cells };
};

/** Запись в ячейку матрицы: null удаляет ребро, число создаёт ребро или меняет вес. */
export const setMatrixCell = (graph: GraphSnapshot, sourceId: NodeId, targetId: NodeId, value: number | null, kind: GraphKind): GraphSnapshot => {
  if (sourceId === targetId) return graph;
  const pair = edgePairKey(sourceId, targetId, kind.directed);
  const withoutPair = graph.edges.filter((edge) => edgePairKey(edge.source, edge.target, kind.directed) !== pair);

  if (value === null || (!kind.weighted && value <= 0)) {
    return { nodes: graph.nodes, edges: withoutPair };
  }

  const newEdge: GraphEdge = {
    id: `${sourceId}-${targetId}`,
    source: sourceId,
    target: targetId,
    directed: kind.directed,
    ...(kind.weighted ? { weight: clampWeight(value, kind) } : {}),
    payload: {},
  };
  return { nodes: graph.nodes, edges: [...withoutPair, newEdge] };
};

export const generateRandomGraph = (nodeCount: number, density: number, kind: GraphKind & { readonly acyclic?: boolean }): GraphSnapshot => {
  const count = Math.max(2, Math.min(MAX_GRAPH_NODES, Math.floor(nodeCount)));
  const clampedDensity = Math.max(0, Math.min(1, density));
  const labels = Array.from({ length: count }, (_, i) => String.fromCharCode(65 + i));
  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();

  const randomWeight = (): number => {
    if (kind.negative === true && Math.random() < 0.2) return -1 - Math.floor(Math.random() * 3);
    return 1 + Math.floor(Math.random() * 9);
  };

  const makeEdge = (a: string, b: string): GraphEdge => {
    // в ациклическом графе рёбра идут только «вперёд» по порядку меток
    const [source, target] = kind.directed && (kind.acyclic === true || Math.random() < 0.5) ? (a < b ? [a, b] : [b, a]) : [b, a];
    return {
      id: `${source}-${target}`,
      source,
      target,
      directed: kind.directed,
      ...(kind.weighted ? { weight: randomWeight() } : {}),
      payload: {},
    };
  };

  // остовное дерево гарантирует связность
  for (let i = 1; i < count; i += 1) {
    const parent = Math.floor(Math.random() * i);
    const edge = makeEdge(labels[parent]!, labels[i]!);
    edges.push(edge);
    edgeSet.add(edgePairKey(edge.source, edge.target, false));
  }

  for (let i = 0; i < count; i += 1) {
    for (let j = i + 1; j < count; j += 1) {
      if (Math.random() > clampedDensity) continue;
      const key = edgePairKey(labels[i]!, labels[j]!, false);
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      edges.push(makeEdge(labels[i]!, labels[j]!));
    }
  }

  const nodes = labels.map((id) => ({ id, label: id, position: { x: 0, y: 0 }, payload: {} }));
  return { nodes: layoutGraph(nodes, edges), edges };
};
