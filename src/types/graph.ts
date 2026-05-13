import type { AlgorithmFrame } from './algorithm';

export type NodeId = string;
export type EdgeId = string;

export interface GraphPosition {
  readonly x: number;
  readonly y: number;
}

export interface GraphNode<TPayload extends Record<string, unknown> = Record<string, never>> {
  readonly id: NodeId;
  readonly label: string;
  readonly position: GraphPosition;
  readonly payload: TPayload;
}

export interface GraphEdge<TPayload extends Record<string, unknown> = Record<string, never>> {
  readonly id: EdgeId;
  readonly source: NodeId;
  readonly target: NodeId;
  readonly weight?: number;
  readonly directed: boolean;
  readonly payload: TPayload;
}

export interface GraphSnapshot<
  TNodePayload extends Record<string, unknown> = Record<string, never>,
  TEdgePayload extends Record<string, unknown> = Record<string, never>,
> {
  readonly nodes: readonly GraphNode<TNodePayload>[];
  readonly edges: readonly GraphEdge<TEdgePayload>[];
}

export interface GraphAlgorithmMeta extends Record<string, unknown> {
  readonly startNodeId: NodeId;
  readonly currentNodeId?: NodeId;
  readonly visitedNodeIds: readonly NodeId[];
  readonly frontierNodeIds: readonly NodeId[];
  readonly traversedEdgeIds: readonly EdgeId[];
}

export type GraphAlgorithmFrame = AlgorithmFrame<GraphSnapshot, GraphAlgorithmMeta>;

export interface GraphPreset {
  readonly id: string;
  readonly name: string;
  readonly graph: GraphSnapshot;
  readonly createdAt: string;
  readonly updatedAt: string;
}
