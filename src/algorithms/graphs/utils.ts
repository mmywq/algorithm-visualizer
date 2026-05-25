import type {
  EdgeId,
  GraphAlgorithmFrame,
  GraphAlgorithmMeta,
  GraphEdge,
  GraphSnapshot,
  NodeId,
} from '@/types';

export interface GraphTraversalInput {
  readonly graph: GraphSnapshot;
  readonly startNodeId: NodeId;
}

export interface AdjacencyEntry {
  readonly nodeId: NodeId;
  readonly edgeId: EdgeId;
}

export type AdjacencyList = ReadonlyMap<NodeId, readonly AdjacencyEntry[]>;

export const createGraphFrame = (
  step: number,
  phase: GraphAlgorithmFrame['phase'],
  graph: GraphSnapshot,
  activeIds: readonly string[],
  pseudocodeLine: number,
  message: string,
  meta: GraphAlgorithmMeta,
): GraphAlgorithmFrame => ({
  step,
  domain: 'graph',
  phase,
  status: phase === 'complete' ? 'completed' : 'running',
  data: cloneGraphSnapshot(graph),
  activeIds,
  pseudocode: { line: pseudocodeLine },
  message,
  meta,
});

export const buildAdjacencyList = (graph: GraphSnapshot): AdjacencyList => {
  const adjacency = new Map<NodeId, AdjacencyEntry[]>();

  for (const node of graph.nodes) {
    adjacency.set(node.id, []);
  }

  for (const edge of graph.edges) {
    adjacency.get(edge.source)?.push({ nodeId: edge.target, edgeId: edge.id });

    if (!edge.directed) {
      adjacency.get(edge.target)?.push({ nodeId: edge.source, edgeId: edge.id });
    }
  }

  return adjacency;
};

export const createGraphMeta = (
  startNodeId: NodeId,
  visitedNodeIds: ReadonlySet<NodeId>,
  frontierNodeIds: readonly NodeId[],
  traversedEdgeIds: ReadonlySet<EdgeId>,
  currentNodeId?: NodeId,
): GraphAlgorithmMeta => {
  const baseMeta = {
    startNodeId,
    visitedNodeIds: [...visitedNodeIds],
    frontierNodeIds: [...frontierNodeIds],
    traversedEdgeIds: [...traversedEdgeIds],
  };

  return currentNodeId === undefined ? baseMeta : { ...baseMeta, currentNodeId };
};

export const getNeighbors = (adjacencyList: AdjacencyList, nodeId: NodeId): readonly AdjacencyEntry[] =>
  adjacencyList.get(nodeId) ?? [];

export const hasNode = (graph: GraphSnapshot, nodeId: NodeId): boolean =>
  graph.nodes.some((node) => node.id === nodeId);

const cloneGraphSnapshot = (graph: GraphSnapshot): GraphSnapshot => ({
  nodes: graph.nodes.map((node) => ({
    ...node,
    position: { ...node.position },
    payload: { ...node.payload },
  })),
  edges: graph.edges.map((edge) => cloneGraphEdge(edge)),
});

const cloneGraphEdge = (edge: GraphEdge): GraphEdge => {
  const clonedEdge = {
    ...edge,
    payload: { ...edge.payload },
  };

  return edge.weight === undefined ? clonedEdge : { ...clonedEdge, weight: edge.weight };
};
