import { motion } from 'framer-motion';
import { Trash2, X } from 'lucide-react';
import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { ColorName } from '@/content/catalog';
import { clampWeight, edgePairKey, type GraphKind } from '@/lib/graphEditing';
import { GRAPH_CANVAS_HEIGHT, GRAPH_CANVAS_WIDTH } from '@/lib/graphLayout';
import { ease } from '@/lib/motion';
import type { GraphAlgorithmFrame, GraphEdge, GraphSnapshot, NodeId } from '@/types';

const NODE_RADIUS = 23;
const DRAG_THRESHOLD_PX = 5;

export type EdgeTone = 'idle' | 'active' | 'tree' | 'rejected' | 'path' | 'muted';

interface GraphCanvasProps {
  readonly graph: GraphSnapshot;
  readonly frame: GraphAlgorithmFrame | null;
  readonly editable: boolean;
  readonly kind: GraphKind;
  readonly startNodeId?: NodeId | undefined;
  readonly targetNodeId?: NodeId | undefined;
  readonly defaultEdgeWeight?: number;
  readonly onGraphChange?: (graph: GraphSnapshot) => void;
}

interface DragState {
  readonly nodeId: NodeId;
  readonly startX: number;
  readonly startY: number;
  readonly offsetX: number;
  readonly offsetY: number;
  moved: boolean;
}

const edgeColors: Record<EdgeTone, { stroke: string; width: number; dash?: string }> = {
  idle: { stroke: 'rgb(var(--viz-edge))', width: 3.5 },
  active: { stroke: 'rgb(var(--c-purple))', width: 6 },
  tree: { stroke: 'rgb(var(--c-green))', width: 5.5 },
  path: { stroke: 'rgb(var(--c-orange))', width: 6.5 },
  rejected: { stroke: 'rgb(var(--c-red))', width: 4, dash: '7 7' },
  muted: { stroke: 'rgb(var(--viz-node-line))', width: 2.5, dash: '3 7' },
};

const componentPalette: readonly ColorName[] = ['brand', 'orange', 'green', 'pink', 'teal', 'purple', 'yellow', 'cyan'];

interface NodeStyle {
  readonly fill: string;
  readonly press: string;
  readonly ink: string;
  readonly stroke: string;
}

const solid = (color: ColorName): NodeStyle => ({
  fill: `rgb(var(--c-${color}))`,
  press: `rgb(var(--c-${color}-press))`,
  ink: 'rgb(var(--c-on))',
  stroke: `rgb(var(--c-${color}-press))`,
});

const idleNode: NodeStyle = {
  fill: 'rgb(var(--viz-node))',
  press: 'rgb(var(--viz-node-line))',
  ink: 'rgb(var(--viz-node-ink))',
  stroke: 'rgb(var(--viz-node-line))',
};

const getNodeStyle = (nodeId: NodeId, frame: GraphAlgorithmFrame | null): NodeStyle => {
  const meta = frame?.meta;
  if (meta === undefined) return idleNode;
  const custom = (meta.nodeColors as Record<string, ColorName> | undefined)?.[nodeId];
  if (meta.currentNodeId === nodeId) return solid('purple');
  if (custom !== undefined) return solid(custom);
  if (Array.isArray(meta.components) && meta.components.length > 0) {
    const index = (meta.components as readonly (readonly string[])[]).findIndex((members) => members.includes(nodeId));
    if (index >= 0) return solid(componentPalette[index % componentPalette.length]!);
  }
  if (meta.frontierNodeIds.includes(nodeId)) return solid('cyan');
  if (meta.visitedNodeIds.includes(nodeId)) return solid('green');
  return idleNode;
};

const getEdgeTone = (edge: GraphEdge, frame: GraphAlgorithmFrame | null): EdgeTone => {
  const meta = frame?.meta;
  if (meta === undefined) return 'idle';
  const custom = (meta.edgeTones as Record<string, EdgeTone> | undefined)?.[edge.id];
  if (custom !== undefined) return custom;
  if (frame?.activeIds.includes(edge.id) === true) return 'active';
  if (meta.traversedEdgeIds.includes(edge.id)) return 'tree';
  return 'idle';
};

const getNodeBadge = (nodeId: NodeId, frame: GraphAlgorithmFrame | null): string | undefined => {
  const meta = frame?.meta;
  if (meta === undefined) return undefined;
  const badges = meta.nodeBadges as Record<string, string> | undefined;
  if (badges?.[nodeId] !== undefined) return badges[nodeId];
  if (Array.isArray(meta.distanceRows)) {
    const row = (meta.distanceRows as readonly { nodeId: string; distance: string }[]).find((item) => item.nodeId === nodeId);
    if (row !== undefined) return row.distance;
  }
  return undefined;
};

export function GraphCanvas({ graph, frame, editable, kind, startNodeId, targetNodeId, defaultEdgeWeight = 1, onGraphChange }: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<NodeId | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [edgeWeightDraft, setEdgeWeightDraft] = useState('');

  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const selectedEdge = graph.edges.find((edge) => edge.id === selectedEdgeId) ?? null;
  const pairCount = new Map<string, number>();
  for (const edge of graph.edges) {
    const key = edgePairKey(edge.source, edge.target, false);
    pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
  }

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

  const clampX = (x: number): number => Math.min(GRAPH_CANVAS_WIDTH - NODE_RADIUS - 6, Math.max(NODE_RADIUS + 6, x));
  const clampY = (y: number): number => Math.min(GRAPH_CANVAS_HEIGHT - NODE_RADIUS - 22, Math.max(NODE_RADIUS + 6, y));

  const handleNodePointerDown = (event: ReactPointerEvent<SVGGElement>, nodeId: NodeId): void => {
    if (!editable) return;
    event.stopPropagation();
    const node = nodeById.get(nodeId);
    if (node === undefined) return;
    const point = toSvgPoint(event.clientX, event.clientY);
    dragStateRef.current = {
      nodeId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: node.position.x - point.x,
      offsetY: node.position.y - point.y,
      moved: false,
    };
    try {
      svgRef.current?.setPointerCapture(event.pointerId);
    } catch {
      // указатель мог исчезнуть — перетаскивание продолжит работать без захвата
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>): void => {
    const dragState = dragStateRef.current;
    if (!editable || dragState === null || onGraphChange === undefined) return;
    if (!dragState.moved) {
      if (Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY) < DRAG_THRESHOLD_PX) return;
      dragState.moved = true;
    }
    const point = toSvgPoint(event.clientX, event.clientY);
    onGraphChange({
      nodes: graph.nodes.map((node) =>
        node.id === dragState.nodeId ? { ...node, position: { x: clampX(point.x + dragState.offsetX), y: clampY(point.y + dragState.offsetY) } } : node,
      ),
      edges: graph.edges,
    });
  };

  const toggleEdge = (a: NodeId, b: NodeId): void => {
    if (onGraphChange === undefined) return;
    const key = edgePairKey(a, b, kind.directed);
    const existing = graph.edges.find((edge) => edgePairKey(edge.source, edge.target, kind.directed) === key);
    if (existing !== undefined) {
      onGraphChange({ nodes: graph.nodes, edges: graph.edges.filter((edge) => edge.id !== existing.id) });
      return;
    }
    const newEdge: GraphEdge = {
      id: `${a}-${b}`,
      source: a,
      target: b,
      directed: kind.directed,
      ...(kind.weighted ? { weight: clampWeight(defaultEdgeWeight, kind) } : {}),
      payload: {},
    };
    onGraphChange({ nodes: graph.nodes, edges: [...graph.edges, newEdge] });
  };

  const handlePointerUp = (): void => {
    const dragState = dragStateRef.current;
    dragStateRef.current = null;
    if (!editable || dragState === null || dragState.moved) return;
    const clicked = dragState.nodeId;
    setSelectedEdgeId(null);
    if (selectedNodeId === null) setSelectedNodeId(clicked);
    else if (selectedNodeId === clicked) setSelectedNodeId(null);
    else {
      toggleEdge(selectedNodeId, clicked);
      setSelectedNodeId(null);
    }
  };

  const handleCanvasDoubleClick = (event: React.MouseEvent<SVGSVGElement>): void => {
    if (!editable || onGraphChange === undefined || graph.nodes.length >= 16) return;
    const point = toSvgPoint(event.clientX, event.clientY);
    const id = createNextNodeId(graph);
    onGraphChange({ nodes: [...graph.nodes, { id, label: id, position: { x: clampX(point.x), y: clampY(point.y) }, payload: {} }], edges: graph.edges });
  };

  const applyEdgeWeight = (): void => {
    if (onGraphChange === undefined || selectedEdge === null) return;
    const weight = Number(edgeWeightDraft);
    if (!Number.isInteger(weight) || (kind.negative !== true && weight < 1) || Math.abs(weight) > 99) return;
    onGraphChange({ nodes: graph.nodes, edges: graph.edges.map((edge) => (edge.id === selectedEdge.id ? { ...edge, weight } : edge)) });
    setSelectedEdgeId(null);
  };

  const removeSelectedEdge = (): void => {
    if (onGraphChange === undefined || selectedEdge === null) return;
    onGraphChange({ nodes: graph.nodes, edges: graph.edges.filter((edge) => edge.id !== selectedEdge.id) });
    setSelectedEdgeId(null);
  };

  /** Геометрия ребра: прямая или дуга, если есть встречное ребро; конец укорочен до границы вершины. */
  const edgeGeometry = (edge: GraphEdge) => {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (source === undefined || target === undefined) return null;
    const curved = kind.directed && (pairCount.get(edgePairKey(edge.source, edge.target, false)) ?? 0) > 1;
    const dx = target.position.x - source.position.x;
    const dy = target.position.y - source.position.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / length;
    const ny = dx / length;
    const bend = curved ? 28 : 0;
    const cx = (source.position.x + target.position.x) / 2 + nx * bend;
    const cy = (source.position.y + target.position.y) / 2 + ny * bend;
    const endGap = kind.directed ? NODE_RADIUS + 7 : 0;
    const toward = (fromX: number, fromY: number, toX: number, toY: number, gap: number) => {
      const ddx = toX - fromX;
      const ddy = toY - fromY;
      const dist = Math.max(1, Math.hypot(ddx, ddy));
      return { x: toX - (ddx / dist) * gap, y: toY - (ddy / dist) * gap };
    };
    const end = toward(cx, cy, target.position.x, target.position.y, endGap);
    const path = curved
      ? `M ${source.position.x} ${source.position.y} Q ${cx} ${cy} ${end.x} ${end.y}`
      : `M ${source.position.x} ${source.position.y} L ${end.x} ${end.y}`;
    const labelX = curved ? (source.position.x + 2 * cx + target.position.x) / 4 : cx;
    const labelY = curved ? (source.position.y + 2 * cy + target.position.y) / 4 : cy;
    return { path, labelX, labelY };
  };

  const editorPosition = selectedEdge === null ? null : edgeGeometry(selectedEdge);

  return (
    <div className="relative">
      <svg
        aria-label="Граф"
        className="viz-stage block w-full select-none"
        onDoubleClick={handleCanvasDoubleClick}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        ref={svgRef}
        role="img"
        style={{ touchAction: editable ? 'none' : 'pan-y' }}
        viewBox={`0 0 ${GRAPH_CANVAS_WIDTH} ${GRAPH_CANVAS_HEIGHT}`}
      >
        <defs>
          {(Object.keys(edgeColors) as EdgeTone[]).map((tone) => (
            <marker
              id={`arrow-${tone}`}
              key={tone}
              markerHeight="7"
              markerUnits="strokeWidth"
              markerWidth="7"
              orient="auto"
              refX="5"
              refY="3.5"
              viewBox="0 0 7 7"
            >
              <path d="M0,0 L7,3.5 L0,7 z" fill={edgeColors[tone].stroke} />
            </marker>
          ))}
        </defs>

        {graph.edges.map((edge) => {
          const geometry = edgeGeometry(edge);
          if (geometry === null) return null;
          const tone = getEdgeTone(edge, frame);
          const style = edgeColors[tone];
          const isSelected = edge.id === selectedEdgeId;
          const weightText = edge.weight?.toString();
          const pillWidth = weightText === undefined ? 0 : Math.max(26, weightText.length * 9 + 14);
          return (
            <g key={edge.id}>
              {tone !== 'idle' && tone !== 'rejected' && tone !== 'muted' && (
                <path d={geometry.path} fill="none" stroke={style.stroke} strokeLinecap="round" strokeOpacity={0.22} strokeWidth={style.width + 8} />
              )}
              <motion.path
                animate={{ stroke: isSelected ? 'rgb(var(--c-ink))' : style.stroke, strokeWidth: style.width }}
                d={geometry.path}
                fill="none"
                initial={false}
                markerEnd={kind.directed ? `url(#arrow-${tone})` : undefined}
                strokeDasharray={style.dash}
                strokeLinecap="round"
                transition={{ duration: 0.25, ease: ease.out }}
              />
              {editable && (
                <path
                  cursor="pointer"
                  d={geometry.path}
                  fill="none"
                  onClick={() => {
                    setSelectedNodeId(null);
                    setSelectedEdgeId(edge.id);
                    setEdgeWeightDraft(edge.weight?.toString() ?? '1');
                  }}
                  stroke="transparent"
                  strokeWidth={22}
                />
              )}
              {weightText !== undefined && (
                <g pointerEvents="none">
                  <rect
                    fill="rgb(var(--c-surface))"
                    height={22}
                    rx={11}
                    stroke={tone === 'idle' ? 'rgb(var(--viz-node-line))' : style.stroke}
                    strokeWidth={2}
                    width={pillWidth}
                    x={geometry.labelX - pillWidth / 2}
                    y={geometry.labelY - 11}
                  />
                  <text
                    dominantBaseline="central"
                    fill={edge.weight !== undefined && edge.weight < 0 ? 'rgb(var(--c-red))' : 'rgb(var(--c-ink))'}
                    fontFamily="JetBrains Mono Variable, monospace"
                    fontSize={12.5}
                    fontWeight={800}
                    textAnchor="middle"
                    x={geometry.labelX}
                    y={geometry.labelY + 1}
                  >
                    {weightText}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {graph.nodes.map((node) => {
          const style = getNodeStyle(node.id, frame);
          const isSelected = node.id === selectedNodeId;
          const isStart = node.id === startNodeId;
          const isTarget = node.id === targetNodeId;
          const isCurrent = frame?.meta.currentNodeId === node.id;
          const badge = getNodeBadge(node.id, frame);
          return (
            <g cursor={editable ? 'grab' : 'default'} key={node.id} onPointerDown={(event) => handleNodePointerDown(event, node.id)}>
              {(isStart || isTarget) && (
                <circle
                  cx={node.position.x}
                  cy={node.position.y}
                  fill="none"
                  r={NODE_RADIUS + 8}
                  stroke={isTarget ? 'rgb(var(--c-red))' : 'rgb(var(--c-yellow-press))'}
                  strokeDasharray="6 5"
                  strokeWidth={3}
                />
              )}
              {isCurrent && (
                <>
                  {/* текущая вершина: спокойное кольцо и одна «волна» в момент, когда обход пришёл сюда */}
                  <circle cx={node.position.x} cy={node.position.y} fill="none" r={NODE_RADIUS + 6} stroke="rgb(var(--c-purple))" strokeWidth={4} />
                  <circle
                    className="graph-node-ping"
                    cx={node.position.x}
                    cy={node.position.y}
                    fill="none"
                    r={NODE_RADIUS + 6}
                    stroke="rgb(var(--c-purple))"
                    strokeWidth={3}
                  />
                </>
              )}
              <circle cx={node.position.x} cy={node.position.y + 4} fill={style.press} r={NODE_RADIUS} />
              <motion.circle
                animate={{ fill: style.fill, stroke: isSelected ? 'rgb(var(--c-ink))' : style.stroke }}
                cx={node.position.x}
                cy={node.position.y}
                initial={false}
                r={NODE_RADIUS}
                strokeWidth={isSelected ? 4 : 2.5}
                transition={{ duration: 0.25, ease: ease.out }}
              />
              <text
                dominantBaseline="central"
                fill={style.ink}
                fontFamily="Nunito Variable, sans-serif"
                fontSize={node.label.length > 2 ? 13 : 16}
                fontWeight={900}
                pointerEvents="none"
                textAnchor="middle"
                x={node.position.x}
                y={node.position.y + 1}
              >
                {node.label}
              </text>
              {badge !== undefined && (
                <g pointerEvents="none">
                  <rect
                    fill="rgb(var(--c-ink))"
                    height={19}
                    rx={9.5}
                    width={Math.max(26, badge.length * 8 + 12)}
                    x={node.position.x - Math.max(26, badge.length * 8 + 12) / 2}
                    y={node.position.y + NODE_RADIUS + 6}
                  />
                  <text
                    dominantBaseline="central"
                    fill="rgb(var(--c-surface))"
                    fontFamily="JetBrains Mono Variable, monospace"
                    fontSize={11.5}
                    fontWeight={800}
                    textAnchor="middle"
                    x={node.position.x}
                    y={node.position.y + NODE_RADIUS + 16}
                  >
                    {badge}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {graph.nodes.length === 0 && (
          <text
            dominantBaseline="central"
            fill="rgb(var(--c-ink-3))"
            fontFamily="Nunito Variable, sans-serif"
            fontSize={16}
            fontWeight={800}
            textAnchor="middle"
            x={GRAPH_CANVAS_WIDTH / 2}
            y={GRAPH_CANVAS_HEIGHT / 2}
          >
            Граф пуст. Дважды щёлкните по полю, чтобы добавить вершину
          </text>
        )}
      </svg>

      {editable && selectedNodeId !== null && (
        <div className="pointer-events-none absolute left-3 top-3 max-w-[calc(100%-24px)] rounded-xl bg-ink px-3 py-2 text-[13px] font-bold text-surface">
          Вершина {selectedNodeId} выбрана — коснитесь другой, чтобы {kind.directed ? 'провести ребро к ней' : 'соединить их'} или убрать ребро
        </div>
      )}

      {editable && selectedEdge !== null && editorPosition !== null && (
        <div
          className="absolute z-10 flex -translate-x-1/2 -translate-y-[130%] items-center gap-1.5 rounded-2xl border-2 border-line bg-surface p-1.5 shadow-pop"
          style={{ left: `${(editorPosition.labelX / GRAPH_CANVAS_WIDTH) * 100}%`, top: `${(editorPosition.labelY / GRAPH_CANVAS_HEIGHT) * 100}%` }}
        >
          <span className="px-1.5 font-mono text-xs font-black text-ink-2">
            {selectedEdge.source}
            {kind.directed ? '→' : '—'}
            {selectedEdge.target}
          </span>
          {kind.weighted && (
            <form
              className="flex items-center gap-1.5"
              onSubmit={(event) => {
                event.preventDefault();
                applyEdgeWeight();
              }}
            >
              <input
                aria-label="Вес ребра"
                autoFocus
                className="input input-sm w-16 font-mono"
                inputMode="numeric"
                onChange={(event) => setEdgeWeightDraft(event.target.value)}
                value={edgeWeightDraft}
              />
              <button className="btn btn-primary btn-sm" type="submit">
                ОК
              </button>
            </form>
          )}
          <button aria-label="Удалить ребро" className="btn btn-ghost btn-sm btn-icon text-red" onClick={removeSelectedEdge} type="button">
            <Trash2 size={16} strokeWidth={2.5} />
          </button>
          <button aria-label="Закрыть" className="btn btn-ghost btn-sm btn-icon" onClick={() => setSelectedEdgeId(null)} type="button">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
}

export const createNextNodeId = (graph: GraphSnapshot): string => {
  const existing = new Set(graph.nodes.map((node) => node.id));
  for (let code = 65; code <= 90; code += 1) {
    const id = String.fromCharCode(code);
    if (!existing.has(id)) return id;
  }
  for (let index = 1; index < 100; index += 1) {
    const id = `V${index}`;
    if (!existing.has(id)) return id;
  }
  return `N${Date.now() % 1000}`;
};
