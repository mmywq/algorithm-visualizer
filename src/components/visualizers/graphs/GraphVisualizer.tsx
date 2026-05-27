import ReactFlow, {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  MarkerType,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from 'reactflow';
import type { GraphAlgorithmFrame, GraphEdge, GraphNode, GraphSnapshot } from '@/types';
import 'reactflow/dist/style.css';

interface GraphVisualizerProps {
  readonly frame: GraphAlgorithmFrame | null;
  readonly graph: GraphSnapshot;
  readonly editable?: boolean;
  readonly onGraphChange?: (graph: GraphSnapshot) => void;
}

export function GraphVisualizer({ frame, graph, editable = false, onGraphChange }: GraphVisualizerProps) {
  const sourceGraph = frame?.data ?? graph;
  const nodes = sourceGraph.nodes.map((node) => toReactFlowNode(node, frame));
  const edges = sourceGraph.edges.map((edge) => toReactFlowEdge(edge, frame));

  const onNodesChange = (changes: NodeChange[]): void => {
    if (editable !== true || onGraphChange === undefined) {
      return;
    }

    const nextNodes = applyNodeChanges(changes, nodes).map((node) => fromReactFlowNode(node));
    onGraphChange({ nodes: nextNodes, edges: sourceGraph.edges });
  };

  const onEdgesChange = (changes: EdgeChange[]): void => {
    if (editable !== true || onGraphChange === undefined) {
      return;
    }

    const nextEdges = applyEdgeChanges(changes, edges).map((edge) => fromReactFlowEdge(edge));
    onGraphChange({ nodes: sourceGraph.nodes, edges: nextEdges });
  };

  const onConnect = (connection: Connection): void => {
    if (editable !== true || onGraphChange === undefined || connection.source === null || connection.target === null) {
      return;
    }

    if (connection.source === connection.target) {
      return;
    }

    const duplicateEdge = sourceGraph.edges.some((edge) =>
      (edge.source === connection.source && edge.target === connection.target) ||
      (!edge.directed && edge.source === connection.target && edge.target === connection.source),
    );

    if (duplicateEdge) {
      return;
    }

    const candidateId = `${connection.source}-${connection.target}`;
    const defaultEdge: Edge = {
      id: candidateId,
      source: connection.source,
      target: connection.target,
      data: { directed: false },
    };

    const nextEdges = addEdge(defaultEdge, edges).map((edge) => fromReactFlowEdge(edge));
    onGraphChange({ nodes: sourceGraph.nodes, edges: nextEdges });
  };

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-violet-950/20">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-violet-300">
            Визуализация графа
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-50">Обход графа</h2>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
          Строка псевдокода: <span className="font-semibold text-violet-200">{frame?.pseudocode.line ?? '—'}</span>
        </div>
      </div>

      <div className="h-[460px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
        <ReactFlow
          edges={edges}
          fitView
          maxZoom={1.5}
          minZoom={0.5}
          nodes={nodes}
          nodesDraggable={editable}
          nodesConnectable={editable}
          onConnect={onConnect}
          onEdgesChange={onEdgesChange}
          onNodesChange={onNodesChange}
          panOnDrag
          preventScrolling
        >
          <Background color="#334155" gap={24} />
          <Controls />
        </ReactFlow>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
        <p className="min-h-12 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm leading-6 text-slate-300">
          {frame?.message ?? 'Загрузите BFS или DFS, чтобы увидеть пошаговый обход графа.'}
        </p>
        <GraphLegend />
      </div>
    </section>
  );
}

function GraphLegend() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-xs text-slate-300">
      <div className="mb-2 font-semibold uppercase tracking-[0.18em] text-slate-500">Легенда</div>
      <LegendItem color="bg-violet-400" label="текущая" />
      <LegendItem color="bg-emerald-400" label="посещена" />
      <LegendItem color="bg-cyan-400" label="граница обхода" />
      <LegendItem color="bg-slate-400" label="обычная вершина" />
      <div className="mt-2 text-[11px] text-slate-400">В режиме редактирования можно двигать узлы, удалять связи и создавать новые.</div>
    </div>
  );
}

interface LegendItemProps {
  readonly color: string;
  readonly label: string;
}

function LegendItem({ color, label }: LegendItemProps) {
  return (
    <div className="mt-1 flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  );
}

const toReactFlowNode = (node: GraphNode, frame: GraphAlgorithmFrame | null): Node => {
  const tone = getNodeTone(node.id, frame);

  return {
    id: node.id,
    data: { label: node.label },
    position: node.position,
    style: {
      width: 64,
      height: 64,
      alignItems: 'center',
      background: tone.background,
      border: `2px solid ${tone.border}`,
      borderRadius: 999,
      boxShadow: tone.shadow,
      color: '#f8fafc',
      display: 'flex',
      fontSize: 18,
      fontWeight: 800,
      justifyContent: 'center',
    },
  };
};

const toReactFlowEdge = (edge: GraphEdge, frame: GraphAlgorithmFrame | null): Edge => {
  const isActive = frame?.activeIds.includes(edge.id) === true;
  const isTraversed = frame?.meta.traversedEdgeIds.includes(edge.id) === true;
  const color = isActive ? '#a78bfa' : isTraversed ? '#10b981' : '#64748b';

  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    animated: isActive,
    ...(edge.weight === undefined ? {} : { label: edge.weight.toString() }),
    data: { directed: edge.directed, weight: edge.weight },
    ...(edge.directed ? { markerEnd: { type: MarkerType.ArrowClosed, color } } : {}),
    style: {
      stroke: color,
      strokeWidth: isActive || isTraversed ? 3 : 2,
    },
  };
};

const fromReactFlowNode = (node: Node): GraphNode => ({
  id: node.id,
  label: typeof node.data?.label === 'string' ? node.data.label : node.id,
  position: node.position,
  payload: {},
});

const fromReactFlowEdge = (edge: Edge): GraphEdge => ({
  id: edge.id,
  source: edge.source,
  target: edge.target,
  directed: edge.data?.directed === true,
  ...(typeof edge.data?.weight === 'number' ? { weight: edge.data.weight } : {}),
  payload: {},
});

const getNodeTone = (nodeId: string, frame: GraphAlgorithmFrame | null) => {
  if (frame?.meta.currentNodeId === nodeId) {
    return {
      background: '#7c3aed',
      border: '#ddd6fe',
      shadow: '0 0 28px rgba(124, 58, 237, 0.55)',
    };
  }

  if (frame?.meta.frontierNodeIds.includes(nodeId) === true) {
    return {
      background: '#0891b2',
      border: '#67e8f9',
      shadow: '0 0 22px rgba(6, 182, 212, 0.42)',
    };
  }

  if (frame?.meta.visitedNodeIds.includes(nodeId) === true) {
    return {
      background: '#059669',
      border: '#6ee7b7',
      shadow: '0 0 22px rgba(16, 185, 129, 0.38)',
    };
  }

  return {
    background: '#334155',
    border: '#64748b',
    shadow: '0 0 0 rgba(0, 0, 0, 0)',
  };
};
