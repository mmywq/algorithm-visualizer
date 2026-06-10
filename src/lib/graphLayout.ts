import type { GraphEdge, GraphNode, GraphSnapshot } from '@/types';

export const GRAPH_CANVAS_WIDTH = 760;
export const GRAPH_CANVAS_HEIGHT = 430;
const CANVAS_PADDING = 52;
const IDEAL_EDGE_LENGTH = 150;
const ITERATIONS = 220;

interface MutablePoint {
  x: number;
  y: number;
}

/**
 * Раскладывает вершины графа по холсту: начальное размещение по окружности,
 * затем итерации сил (отталкивание вершин, притяжение по рёбрам), в конце
 * результат масштабируется так, чтобы граф заполнял холст с отступами.
 */
export const layoutGraph = (
  nodes: GraphSnapshot['nodes'],
  edges: readonly GraphEdge[] = [],
): GraphNode[] => {
  if (nodes.length === 0) {
    return [];
  }
  if (nodes.length === 1) {
    const single = nodes[0]!;
    return [{ ...single, position: { x: GRAPH_CANVAS_WIDTH / 2, y: GRAPH_CANVAS_HEIGHT / 2 } }];
  }

  const centerX = GRAPH_CANVAS_WIDTH / 2;
  const centerY = GRAPH_CANVAS_HEIGHT / 2;
  const radius = Math.min(GRAPH_CANVAS_WIDTH, GRAPH_CANVAS_HEIGHT) / 2 - CANVAS_PADDING;

  const points = new Map<string, MutablePoint>();
  nodes.forEach((node, index) => {
    const angle = (index / nodes.length) * Math.PI * 2 - Math.PI / 2;
    // лёгкое случайное смещение, чтобы симметричные графы не «застревали»
    const jitter = (index % 3) * 6;
    points.set(node.id, {
      x: centerX + Math.cos(angle) * (radius - jitter),
      y: centerY + Math.sin(angle) * (radius - jitter),
    });
  });

  const nodeIds = nodes.map((node) => node.id);
  const validEdges = edges.filter((edge) => points.has(edge.source) && points.has(edge.target));

  for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
    const temperature = 1 - iteration / ITERATIONS;

    for (let i = 0; i < nodeIds.length; i += 1) {
      for (let j = i + 1; j < nodeIds.length; j += 1) {
        const a = points.get(nodeIds[i]!)!;
        const b = points.get(nodeIds[j]!)!;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        if (dx === 0 && dy === 0) {
          dx = (Math.random() - 0.5) * 2;
          dy = (Math.random() - 0.5) * 2;
        }
        const distance = Math.max(24, Math.hypot(dx, dy));
        const repulsion = (IDEAL_EDGE_LENGTH * IDEAL_EDGE_LENGTH) / distance / distance * 6 * temperature;
        const fx = (dx / distance) * repulsion;
        const fy = (dy / distance) * repulsion;
        a.x -= fx;
        a.y -= fy;
        b.x += fx;
        b.y += fy;
      }
    }

    for (const edge of validEdges) {
      const source = points.get(edge.source)!;
      const target = points.get(edge.target)!;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const attraction = ((distance - IDEAL_EDGE_LENGTH) / distance) * 0.06 * temperature;
      const fx = dx * attraction;
      const fy = dy * attraction;
      source.x += fx;
      source.y += fy;
      target.x -= fx;
      target.y -= fy;
    }
  }

  // вписываем результат в холст с сохранением пропорций
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const point of points.values()) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const scale = Math.min(
    (GRAPH_CANVAS_WIDTH - CANVAS_PADDING * 2) / spanX,
    (GRAPH_CANVAS_HEIGHT - CANVAS_PADDING * 2) / spanY,
  );
  const offsetX = (GRAPH_CANVAS_WIDTH - spanX * scale) / 2;
  const offsetY = (GRAPH_CANVAS_HEIGHT - spanY * scale) / 2;

  return nodes.map((node) => {
    const point = points.get(node.id)!;
    return {
      ...node,
      position: {
        x: Math.round(offsetX + (point.x - minX) * scale),
        y: Math.round(offsetY + (point.y - minY) * scale),
      },
    };
  });
};
