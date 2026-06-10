import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { GRAPH_CANVAS_HEIGHT, GRAPH_CANVAS_WIDTH } from '@/lib/graphLayout';
import type { GraphAlgorithmFrame, GraphEdge, GraphSnapshot, NodeId } from '@/types';

const NODE_RADIUS = 24;

interface GraphCanvasProps {
  readonly graph: GraphSnapshot;
  readonly frame: GraphAlgorithmFrame | null;
  readonly editable: boolean;
  readonly weighted: boolean;
  readonly startNodeId?: NodeId | undefined;
  readonly defaultEdgeWeight?: number;
  readonly onGraphChange?: (graph: GraphSnapshot) => void;
}

interface DragState {
  readonly nodeId: NodeId;
  moved: boolean;
}

export function GraphCanvas({
  graph,
  frame,
  editable,
  weighted,
  startNodeId,
  defaultEdgeWeight = 1,
  onGraphChange,
}: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<NodeId | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [edgeWeightDraft, setEdgeWeightDraft] = useState('');

  const displayedGraph = frame?.data ?? graph;
  const nodeById = new Map(displayedGraph.nodes.map((node) => [node.id, node]));
  const selectedEdge = displayedGraph.edges.find((edge) => edge.id === selectedEdgeId) ?? null;

  const toSvgPoint = (clientX: number, clientY: number): { x: number; y: number } => {
    const svg = svgRef.current;
    if (svg === null) return { x: 0, y: 0 };
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const matrix = svg.getScreenCTM();
    if (matrix === null) return { x: clientX, y: clientY };
    const transformed = point.matrixTransform(matrix.inverse());
    return { x: transformed.x, y: transformed.y };
  };

  const clampX = (x: number): number => Math.min(GRAPH_CANVAS_WIDTH - NODE_RADIUS - 4, Math.max(NODE_RADIUS + 4, x));
  const clampY = (y: number): number => Math.min(GRAPH_CANVAS_HEIGHT - NODE_RADIUS - 4, Math.max(NODE_RADIUS + 4, y));

  const handleNodePointerDown = (event: ReactPointerEvent<SVGGElement>, nodeId: NodeId): void => {
    if (!editable) return;
    event.stopPropagation();
    dragStateRef.current = { nodeId, moved: false };
    (event.currentTarget.ownerSVGElement ?? event.currentTarget).setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>): void => {
    const dragState = dragStateRef.current;
    if (!editable || dragState === null || onGraphChange === undefined) return;

    const point = toSvgPoint(event.clientX, event.clientY);
    dragState.moved = true;
    onGraphChange({
      nodes: graph.nodes.map((node) =>
        node.id === dragState.nodeId
          ? { ...node, position: { x: clampX(point.x), y: clampY(point.y) } }
          : node,
      ),
      edges: graph.edges,
    });
  };

  const handlePointerUp = (): void => {
    const dragState = dragStateRef.current;
    dragStateRef.current = null;
    if (!editable || dragState === null || dragState.moved) return;

    // это был клик по вершине, а не перетаскивание
    const clickedNodeId = dragState.nodeId;
    setSelectedEdgeId(null);

    if (selectedNodeId === null) {
      setSelectedNodeId(clickedNodeId);
      return;
    }
    if (selectedNodeId === clickedNodeId) {
      setSelectedNodeId(null);
      return;
    }

    toggleEdge(selectedNodeId, clickedNodeId);
    setSelectedNodeId(null);
  };

  const toggleEdge = (a: NodeId, b: NodeId): void => {
    if (onGraphChange === undefined) return;
    const existing = graph.edges.find((edge) => connectsPair(edge, a, b));

    if (existing !== undefined) {
      onGraphChange({ nodes: graph.nodes, edges: graph.edges.filter((edge) => edge.id !== existing.id) });
      return;
    }

    const newEdge: GraphEdge = {
      id: `${a}-${b}`,
      source: a,
      target: b,
      directed: false,
      ...(weighted ? { weight: Math.max(1, Math.round(defaultEdgeWeight)) } : {}),
      payload: {},
    };
    onGraphChange({ nodes: graph.nodes, edges: [...graph.edges, newEdge] });
  };

  const handleCanvasDoubleClick = (event: ReactPointerEvent<SVGSVGElement> | React.MouseEvent<SVGSVGElement>): void => {
    if (!editable || onGraphChange === undefined) return;
    const point = toSvgPoint(event.clientX, event.clientY);
    const id = createNextNodeId(graph);
    onGraphChange({
      nodes: [...graph.nodes, { id, label: id, position: { x: clampX(point.x), y: clampY(point.y) }, payload: {} }],
      edges: graph.edges,
    });
  };

  const handleEdgeClick = (edgeId: string): void => {
    if (!editable) return;
    setSelectedNodeId(null);
    const edge = graph.edges.find((item) => item.id === edgeId) ?? null;
    setSelectedEdgeId(edgeId);
    setEdgeWeightDraft(edge?.weight?.toString() ?? '1');
  };

  const applyEdgeWeight = (): void => {
    if (onGraphChange === undefined || selectedEdge === null) return;
    const weight = Number(edgeWeightDraft);
    if (Number.isInteger(weight) === false || weight < 1 || weight > 99) return;
    onGraphChange({
      nodes: graph.nodes,
      edges: graph.edges.map((edge) => (edge.id === selectedEdge.id ? { ...edge, weight } : edge)),
    });
    setSelectedEdgeId(null);
  };

  const removeSelectedEdge = (): void => {
    if (onGraphChange === undefined || selectedEdge === null) return;
    onGraphChange({ nodes: graph.nodes, edges: graph.edges.filter((edge) => edge.id !== selectedEdge.id) });
    setSelectedEdgeId(null);
  };

  const edgeEditorPosition = selectedEdge === null ? null : edgeMidpoint(selectedEdge, nodeById);

  return (
    <div className="relative">
      <svg
        className="block w-full rounded-2xl border border-app bg-slate-950/60"
        onDoubleClick={handleCanvasDoubleClick}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        ref={svgRef}
        role="img"
        viewBox={`0 0 ${GRAPH_CANVAS_WIDTH} ${GRAPH_CANVAS_HEIGHT}`}
      >
        <defs>
          <pattern height="26" id="graph-grid" patternUnits="userSpaceOnUse" width="26">
            <circle cx="1" cy="1" fill="#334155" r="1" />
          </pattern>
          <filter height="160%" id="graph-node-shadow" width="160%" x="-30%" y="-30%">
            <feDropShadow dx="0" dy="2" floodColor="#020617" floodOpacity="0.55" stdDeviation="3" />
          </filter>
        </defs>
        <rect fill="url(#graph-grid)" height={GRAPH_CANVAS_HEIGHT} width={GRAPH_CANVAS_WIDTH} x="0" y="0" />

        {displayedGraph.edges.map((edge) => {
          const source = nodeById.get(edge.source);
          const target = nodeById.get(edge.target);
          if (source === undefined || target === undefined) return null;
          const tone = getEdgeTone(edge.id, frame);
          const isSelected = edge.id === selectedEdgeId;
          const midX = (source.position.x + target.position.x) / 2;
          const midY = (source.position.y + target.position.y) / 2;

          return (
            <g key={edge.id}>
              <line
                stroke={isSelected ? '#f8fafc' : tone.stroke}
                strokeLinecap="round"
                strokeWidth={tone.width}
                style={{ transition: 'stroke 0.3s ease, stroke-width 0.3s ease' }}
                x1={source.position.x}
                x2={target.position.x}
                y1={source.position.y}
                y2={target.position.y}
              />
              {editable && (
                <line
                  cursor="pointer"
                  onClick={() => handleEdgeClick(edge.id)}
                  stroke="transparent"
                  strokeWidth={18}
                  x1={source.position.x}
                  x2={target.position.x}
                  y1={source.position.y}
                  y2={target.position.y}
                />
              )}
              {edge.weight !== undefined && (
                <g pointerEvents="none">
                  <rect
                    fill="#0f172a"
                    height={20}
                    rx={6}
                    stroke={tone.stroke}
                    strokeWidth={1}
                    width={Math.max(24, edge.weight.toString().length * 9 + 12)}
                    x={midX - Math.max(24, edge.weight.toString().length * 9 + 12) / 2}
                    y={midY - 10}
                  />
                  <text dominantBaseline="central" fill="#e2e8f0" fontSize={12} fontWeight={700} textAnchor="middle" x={midX} y={midY + 1}>
                    {edge.weight}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {displayedGraph.nodes.map((node) => {
          const tone = getNodeTone(node.id, frame);
          const isSelected = node.id === selectedNodeId;
          const isStart = node.id === startNodeId;
          const isCurrent = frame?.meta.currentNodeId === node.id;

          return (
            <g
              cursor={editable ? 'grab' : 'default'}
              key={node.id}
              onPointerDown={(event) => handleNodePointerDown(event, node.id)}
            >
              {isStart && (
                <circle
                  cx={node.position.x}
                  cy={node.position.y}
                  fill="none"
                  r={NODE_RADIUS + 7}
                  stroke="#facc15"
                  strokeDasharray="5 4"
                  strokeWidth={2}
                />
              )}
              {isCurrent && (
                <circle
                  className="graph-node-pulse"
                  cx={node.position.x}
                  cy={node.position.y}
                  fill="none"
                  r={NODE_RADIUS + 5}
                  stroke="#a78bfa"
                  strokeWidth={3}
                />
              )}
              <circle
                cx={node.position.x}
                cy={node.position.y}
                fill={tone.fill}
                filter="url(#graph-node-shadow)"
                r={NODE_RADIUS}
                stroke={isSelected ? '#f8fafc' : tone.stroke}
                strokeWidth={isSelected ? 3 : 2}
                style={{ transition: 'fill 0.3s ease, stroke 0.3s ease' }}
              />
              <text
                dominantBaseline="central"
                fill="#f8fafc"
                fontSize={node.label.length > 2 ? 12 : 15}
                fontWeight={800}
                pointerEvents="none"
                textAnchor="middle"
                x={node.position.x}
                y={node.position.y + 1}
              >
                {node.label}
              </text>
              {isStart && (
                <text fill="#facc15" fontSize={10} fontWeight={700} pointerEvents="none" textAnchor="middle" x={node.position.x} y={node.position.y + NODE_RADIUS + 19}>
                  старт
                </text>
              )}
            </g>
          );
        })}

        {displayedGraph.nodes.length === 0 && (
          <text dominantBaseline="central" fill="#64748b" fontSize={15} textAnchor="middle" x={GRAPH_CANVAS_WIDTH / 2} y={GRAPH_CANVAS_HEIGHT / 2}>
            Граф пуст. Дважды кликните по холсту, чтобы добавить вершину, или сгенерируйте случайный граф.
          </text>
        )}
      </svg>

      {editable && selectedNodeId !== null && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-xl border border-app bg-slate-950/90 px-3 py-2 text-xs text-app-muted">
          Выбрана вершина <strong className="text-app-primary">{selectedNodeId}</strong>: кликните по другой вершине, чтобы добавить или удалить ребро между ними.
        </div>
      )}

      {editable && selectedEdge !== null && edgeEditorPosition !== null && (
        <div
          className="absolute z-10 flex -translate-x-1/2 flex-wrap items-center gap-2 rounded-xl border border-app bg-slate-950/95 p-2 text-xs"
          style={{
            left: `${(edgeEditorPosition.x / GRAPH_CANVAS_WIDTH) * 100}%`,
            top: `${(edgeEditorPosition.y / GRAPH_CANVAS_HEIGHT) * 100}%`,
          }}
        >
          <span className="text-app-muted">Ребро {selectedEdge.source}—{selectedEdge.target}</span>
          {weighted && (
            <>
              <input
                className="control-input !h-8 w-16 !text-xs"
                onChange={(event) => setEdgeWeightDraft(event.target.value)}
                value={edgeWeightDraft}
              />
              <button className="control-button !h-8 !px-2 !text-xs" onClick={applyEdgeWeight} type="button">Задать вес</button>
            </>
          )}
          <button className="control-button !h-8 !px-2 !text-xs" onClick={removeSelectedEdge} type="button">Удалить</button>
          <button className="control-button !h-8 !px-2 !text-xs" onClick={() => setSelectedEdgeId(null)} type="button">✕</button>
        </div>
      )}
    </div>
  );
}

const connectsPair = (edge: GraphEdge, a: NodeId, b: NodeId): boolean =>
  (edge.source === a && edge.target === b) || (edge.source === b && edge.target === a);

const edgeMidpoint = (
  edge: GraphEdge,
  nodeById: ReadonlyMap<NodeId, GraphSnapshot['nodes'][number]>,
): { x: number; y: number } | null => {
  const source = nodeById.get(edge.source);
  const target = nodeById.get(edge.target);
  if (source === undefined || target === undefined) return null;
  return {
    x: (source.position.x + target.position.x) / 2,
    y: (source.position.y + target.position.y) / 2,
  };
};

const getNodeTone = (nodeId: NodeId, frame: GraphAlgorithmFrame | null): { fill: string; stroke: string } => {
  if (frame?.meta.currentNodeId === nodeId) {
    return { fill: '#7c3aed', stroke: '#ddd6fe' };
  }
  if (frame?.meta.frontierNodeIds.includes(nodeId) === true) {
    return { fill: '#0891b2', stroke: '#67e8f9' };
  }
  if (frame?.meta.visitedNodeIds.includes(nodeId) === true) {
    return { fill: '#059669', stroke: '#6ee7b7' };
  }
  return { fill: '#475569', stroke: '#94a3b8' };
};

const getEdgeTone = (edgeId: string, frame: GraphAlgorithmFrame | null): { stroke: string; width: number } => {
  if (frame?.activeIds.includes(edgeId) === true) {
    return { stroke: '#a78bfa', width: 4.5 };
  }
  if (frame?.meta.traversedEdgeIds.includes(edgeId) === true) {
    return { stroke: '#10b981', width: 4 };
  }
  return { stroke: '#64748b', width: 2.5 };
};

export const createNextNodeId = (graph: GraphSnapshot): string => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const existingIds = new Set(graph.nodes.map((node) => node.id));

  for (let size = 1; size <= 3; size += 1) {
    const combinations = Math.pow(alphabet.length, size);
    for (let index = 0; index < combinations; index += 1) {
      let value = '';
      let cursor = index;
      for (let position = 0; position < size; position += 1) {
        value = alphabet[cursor % alphabet.length] + value;
        cursor = Math.floor(cursor / alphabet.length);
      }
      if (existingIds.has(value) === false) {
        return value;
      }
    }
  }

  return `N${Date.now() % 10000}`;
};
