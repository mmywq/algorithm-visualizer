import { layoutGraph } from '@/lib/graphLayout';
import type { GraphEdge, GraphSnapshot, NodeId } from '@/types';

export const MAX_GRAPH_NODES = 16;

export const edgePairKey = (source: NodeId, target: NodeId): string => [source, target].sort().join('--');

export const isValidNodeLabel = (label: string): boolean => /^[A-Za-z0-9_-]{1,6}$/.test(label);

/** Удаляет дубликаты вершин, петли и повторные рёбра, отбрасывает рёбра к несуществующим вершинам. */
export const normalizeGraph = (graph: GraphSnapshot): GraphSnapshot => {
  const seenNodes = new Set<NodeId>();
  const nodes = graph.nodes.filter((node) => {
    if (seenNodes.has(node.id)) return false;
    seenNodes.add(node.id);
    return true;
  });
  const nodeIds = new Set(nodes.map((node) => node.id));
  const seenEdges = new Set<string>();
  const edges = graph.edges.filter((edge) => {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target) || edge.source === edge.target) return false;
    const key = edgePairKey(edge.source, edge.target);
    if (seenEdges.has(key)) return false;
    seenEdges.add(key);
    return true;
  });
  return { nodes, edges };
};

export const getGraphStructureKey = (graph: GraphSnapshot): string => {
  const nodes = [...graph.nodes].map((node) => node.id).sort().join('|');
  const edges = [...graph.edges]
    .map((edge) => `${edgePairKey(edge.source, edge.target)}:${edge.weight ?? ''}`)
    .sort()
    .join('|');
  return `${nodes}__${edges}`;
};

/**
 * Текстовое представление списка смежности.
 * Невзвешенный граф: «A: B, C». Взвешенный: «A: B(2), C(5)» — в скобках вес ребра.
 */
export const serializeAdjacencyList = (graph: GraphSnapshot, weighted: boolean): string => {
  const adjacency = new Map<NodeId, string[]>();
  for (const node of graph.nodes) adjacency.set(node.id, []);
  for (const edge of graph.edges) {
    const suffix = weighted && edge.weight !== undefined ? `(${edge.weight})` : '';
    adjacency.get(edge.source)?.push(`${edge.target}${suffix}`);
    adjacency.get(edge.target)?.push(`${edge.source}${suffix}`);
  }
  return graph.nodes.map((node) => `${node.id}: ${(adjacency.get(node.id) ?? []).join(', ')}`).join('\n');
};

export interface AdjacencyParseResult {
  readonly ok: boolean;
  readonly graph?: GraphSnapshot;
  readonly error?: string;
}

export const parseAdjacencyList = (source: string, weighted: boolean): AdjacencyParseResult => {
  const lines = source.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
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
      return { ok: false, error: `Недопустимая метка вершины «${rawNode}». Используйте до 6 символов: буквы, цифры, _ и -.` };
    }
    registerNode(rawNode);

    const targets = rawTargets.split(',').map((target) => target.trim()).filter((target) => target.length > 0);
    for (const targetToken of targets) {
      const match = /^([A-Za-z0-9_-]{1,6})(?:\((\d{1,2})\))?$/.exec(targetToken);
      if (match === null) {
        return { ok: false, error: `Не удалось разобрать «${targetToken}». Сосед записывается как B${weighted ? ' или B(вес)' : ''}.` };
      }
      const target = match[1]!;
      registerNode(target);
      if (target === rawNode) {
        return { ok: false, error: `Петля «${rawNode}—${rawNode}» не поддерживается: ребро должно соединять разные вершины.` };
      }

      const key = edgePairKey(rawNode, target);
      if (edgeByKey.has(key)) continue;
      const weight = weighted ? Number(match[2] ?? '1') : undefined;
      edgeByKey.set(key, {
        id: `${rawNode}-${target}`,
        source: rawNode,
        target,
        directed: false,
        ...(weight === undefined ? {} : { weight: Math.max(1, weight) }),
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

export interface MatrixView {
  readonly labels: readonly string[];
  readonly cells: readonly (readonly number[])[];
}

/** Матрица смежности (для взвешенного графа в ячейках стоят веса, 0 — ребра нет). */
export const graphToMatrix = (graph: GraphSnapshot): MatrixView => {
  const labels = graph.nodes.map((node) => node.id);
  const index = new Map(labels.map((label, i) => [label, i]));
  const cells = labels.map(() => labels.map(() => 0));

  for (const edge of graph.edges) {
    const i = index.get(edge.source);
    const j = index.get(edge.target);
    if (i === undefined || j === undefined) continue;
    const value = edge.weight ?? 1;
    cells[i]![j] = value;
    cells[j]![i] = value;
  }

  return { labels, cells };
};

/** Установка значения ячейки матрицы прямо в граф: 0 удаляет ребро, положительное число создаёт ребро или меняет вес. */
export const setMatrixCell = (
  graph: GraphSnapshot,
  sourceId: NodeId,
  targetId: NodeId,
  value: number,
  weighted: boolean,
): GraphSnapshot => {
  if (sourceId === targetId) return graph;
  const withoutPair = graph.edges.filter((edge) => edgePairKey(edge.source, edge.target) !== edgePairKey(sourceId, targetId));

  if (value <= 0) {
    return { nodes: graph.nodes, edges: withoutPair };
  }

  const newEdge: GraphEdge = {
    id: `${sourceId}-${targetId}`,
    source: sourceId,
    target: targetId,
    directed: false,
    ...(weighted ? { weight: Math.min(99, Math.round(value)) } : {}),
    payload: {},
  };
  return { nodes: graph.nodes, edges: [...withoutPair, newEdge] };
};

export const generateRandomGraph = (nodeCount: number, density: number, weighted: boolean): GraphSnapshot => {
  const count = Math.max(2, Math.min(MAX_GRAPH_NODES, Math.floor(nodeCount)));
  const clampedDensity = Math.max(0, Math.min(1, density));
  const labels = Array.from({ length: count }, (_, i) => `V${i + 1}`);
  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();

  const makeEdge = (source: string, target: string): GraphEdge => ({
    id: `${source}-${target}`,
    source,
    target,
    directed: false,
    ...(weighted ? { weight: 1 + Math.floor(Math.random() * 9) } : {}),
    payload: {},
  });

  // остовное дерево гарантирует связность
  for (let i = 1; i < count; i += 1) {
    const parent = Math.floor(Math.random() * i);
    const source = labels[parent]!;
    const target = labels[i]!;
    edges.push(makeEdge(source, target));
    edgeSet.add(edgePairKey(source, target));
  }

  for (let i = 0; i < count; i += 1) {
    for (let j = i + 1; j < count; j += 1) {
      if (Math.random() > clampedDensity) continue;
      const a = labels[i]!;
      const b = labels[j]!;
      const key = edgePairKey(a, b);
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      edges.push(makeEdge(a, b));
    }
  }

  const nodes = labels.map((id) => ({ id, label: id, position: { x: 0, y: 0 }, payload: {} }));
  return { nodes: layoutGraph(nodes, edges), edges };
};
