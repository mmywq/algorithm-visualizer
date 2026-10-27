import { AnimatePresence, motion } from 'framer-motion';
import { useElementWidth } from '@/hooks/useElementSize';

import { spring } from '@/lib/motion';
import type { TreeDiagramNode, TreeTone } from '@/types/tree';

export type { TreeDiagramNode, TreeTone };

const tones: Record<TreeTone, { fill: string; stroke: string; ink: string; press: string }> = {
  idle: { fill: 'rgb(var(--viz-node))', stroke: 'rgb(var(--viz-node-line))', ink: 'rgb(var(--viz-node-ink))', press: 'rgb(var(--viz-node-line))' },
  active: { fill: 'rgb(var(--c-brand))', stroke: 'rgb(var(--c-brand-press))', ink: 'rgb(var(--c-on))', press: 'rgb(var(--c-brand-press))' },
  path: { fill: 'rgb(var(--c-brand) / 0.14)', stroke: 'rgb(var(--c-brand))', ink: 'rgb(var(--viz-node-ink))', press: 'rgb(var(--c-brand) / 0.5)' },
  found: { fill: 'rgb(var(--c-yellow))', stroke: 'rgb(var(--c-yellow-press))', ink: 'rgb(var(--c-on))', press: 'rgb(var(--c-yellow-press))' },
  done: { fill: 'rgb(var(--c-green))', stroke: 'rgb(var(--c-green-press))', ink: 'rgb(var(--c-on))', press: 'rgb(var(--c-green-press))' },
  red: { fill: 'rgb(var(--c-red))', stroke: 'rgb(var(--c-red-press))', ink: 'rgb(var(--c-on))', press: 'rgb(var(--c-red-press))' },
  black: { fill: 'rgb(14 10 24)', stroke: 'rgb(var(--c-ink-3))', ink: 'rgb(247 242 255)', press: 'rgb(var(--c-ink-3))' },
  muted: { fill: 'rgb(var(--viz-empty))', stroke: 'rgb(var(--viz-node-line))', ink: 'rgb(var(--c-ink-3))', press: 'rgb(var(--viz-node-line))' },
  new: { fill: 'rgb(var(--c-orange))', stroke: 'rgb(var(--c-orange-press))', ink: 'rgb(var(--c-on))', press: 'rgb(var(--c-orange-press))' },
};

export const treeLegend = [
  { color: tones.active.fill, label: 'текущий узел' },
  { color: 'rgb(var(--c-brand) / 0.35)', label: 'пройденный путь' },
  { color: tones.found.fill, label: 'найден' },
  { color: tones.idle.stroke, label: 'остальные узлы' },
] as const;

interface PositionedNode extends TreeDiagramNode {
  readonly x: number;
  readonly y: number;
  readonly depth: number;
}

/**
 * Раскладка «по симметричному обходу»: x — порядковый номер узла при обходе
 * лево → узел → право, y — глубина. Поддеревья никогда не пересекаются,
 * а для n-арных деревьев родитель ставится над серединой своих детей.
 */
const layout = (nodes: readonly TreeDiagramNode[], binary: boolean): { placed: PositionedNode[]; columns: number; depth: number } => {
  const children = new Map<string | null, TreeDiagramNode[]>();
  for (const node of nodes) {
    const list = children.get(node.parentKey) ?? [];
    list.push(node);
    children.set(node.parentKey, list);
  }
  for (const list of children.values()) list.sort((a, b) => (a.side ?? 0) - (b.side ?? 0));

  const placed: PositionedNode[] = [];
  let column = 0;
  let maxDepth = 0;

  const visitBinary = (node: TreeDiagramNode, depth: number): void => {
    const kids = children.get(node.key) ?? [];
    const left = kids.find((kid) => kid.side === 0);
    const right = kids.find((kid) => kid.side === 1);
    if (left !== undefined) visitBinary(left, depth + 1);
    placed.push({ ...node, x: column, y: depth, depth });
    column += 1;
    maxDepth = Math.max(maxDepth, depth);
    if (right !== undefined) visitBinary(right, depth + 1);
  };

  const visitNary = (node: TreeDiagramNode, depth: number): number => {
    const kids = children.get(node.key) ?? [];
    maxDepth = Math.max(maxDepth, depth);
    if (kids.length === 0) {
      const x = column;
      column += 1;
      placed.push({ ...node, x, y: depth, depth });
      return x;
    }
    const xs = kids.map((kid) => visitNary(kid, depth + 1));
    const x = (xs[0]! + xs[xs.length - 1]!) / 2;
    placed.push({ ...node, x, y: depth, depth });
    return x;
  };

  for (const root of children.get(null) ?? []) {
    if (binary) visitBinary(root, 0);
    else visitNary(root, 0);
    column += binary ? 0.6 : 0.6;
  }
  return { placed, columns: Math.max(1, column), depth: maxDepth };
};

interface TreeDiagramProps {
  readonly nodes: readonly TreeDiagramNode[];
  readonly binary?: boolean;
  readonly emptyText?: string;
  readonly minHeight?: number;
  readonly radius?: number;
}

export function TreeDiagram({ nodes, binary = true, emptyText = 'Дерево пусто', minHeight = 220, radius: radiusProp }: TreeDiagramProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const { placed, columns, depth } = layout(nodes, binary);
  const byKey = new Map(placed.map((node) => [node.key, node]));
  const longest = Math.max(1, ...nodes.map((node) => node.label.length));
  const radius = radiusProp ?? (longest > 3 ? 23 : 21);
  const levelGap = 74;
  const padding = radius + 14;
  const naturalStep = radius * 2 + 12;
  const available = Math.max(320, width - 8);
  const step = Math.max(radius * 2 + 4, Math.min(naturalStep * 1.5, (available - padding * 2) / Math.max(1, columns - 1 || 1)));
  const contentWidth = Math.max(available, padding * 2 + (columns - 1) * step);
  const height = Math.max(minHeight, padding * 2 + depth * levelGap + 18);
  const offsetX = (contentWidth - (columns - 1) * step) / 2;
  const toX = (column: number): number => offsetX + column * step;
  const toY = (level: number): number => padding + level * levelGap;

  return (
    <div className="viz-stage overflow-x-auto" ref={ref}>
      {nodes.length === 0 ? (
        <p className="flex items-center justify-center text-sm font-bold text-ink-3" style={{ height: minHeight }}>
          {emptyText}
        </p>
      ) : (
        <svg aria-label="Схема дерева" className="block" height={height} role="img" style={{ minWidth: contentWidth }} width={contentWidth}>
          <g>
            {placed.map((node) => {
              if (node.parentKey === null) return null;
              const parent = byKey.get(node.parentKey);
              if (parent === undefined) return null;
              const highlighted =
                (node.tone === 'active' || node.tone === 'path' || node.tone === 'found') &&
                (parent.tone === 'path' || parent.tone === 'active' || parent.tone === 'found');
              return (
                <motion.line
                  animate={{ x1: toX(parent.x), y1: toY(parent.y), x2: toX(node.x), y2: toY(node.y) }}
                  initial={false}
                  key={`edge-${node.key}`}
                  stroke={highlighted ? 'rgb(var(--c-brand))' : 'rgb(var(--viz-edge))'}
                  strokeLinecap="round"
                  strokeWidth={highlighted ? 4 : 3}
                  transition={spring.viz}
                />
              );
            })}
          </g>
          <AnimatePresence>
            {placed.map((node) => {
              const tone = tones[node.tone ?? 'idle'];
              return (
                <motion.g
                  animate={{ x: toX(node.x), y: toY(node.y), opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.4 }}
                  initial={{ x: toX(node.x), y: toY(node.y) - 18, opacity: 0, scale: 0.4 }}
                  key={node.key}
                  transition={spring.viz}
                >
                  {node.ring !== undefined && (
                    <motion.circle
                      animate={{ opacity: [0.95, 0.45, 0.95], scale: [1, 1.1, 1] }}
                      fill="none"
                      r={radius + 7}
                      stroke={`rgb(var(--c-${node.ring}))`}
                      strokeWidth={3.5}
                      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                  <circle cy={3.5} fill={tone.press} r={radius} />
                  <motion.circle
                    animate={{ fill: tone.fill, stroke: tone.stroke }}
                    initial={false}
                    r={radius}
                    strokeWidth={2.5}
                    transition={{ duration: 0.25 }}
                  />
                  <text
                    dominantBaseline="central"
                    fill={tone.ink}
                    fontFamily="JetBrains Mono Variable, monospace"
                    fontSize={node.label.length > 3 ? 12 : 14}
                    fontWeight={800}
                    textAnchor="middle"
                    y={1}
                  >
                    {node.label}
                  </text>
                  {node.badge !== undefined && (
                    <g transform={`translate(${radius - 4}, ${-radius + 2})`}>
                      <rect fill="rgb(var(--c-ink))" height={16} rx={8} width={Math.max(16, node.badge.length * 7 + 8)} x={-4} y={-8} />
                      <text
                        dominantBaseline="central"
                        fill="rgb(var(--c-surface))"
                        fontFamily="JetBrains Mono Variable, monospace"
                        fontSize={10}
                        fontWeight={800}
                        x={Math.max(16, node.badge.length * 7 + 8) / 2 - 4}
                        textAnchor="middle"
                      >
                        {node.badge}
                      </text>
                    </g>
                  )}
                  {node.sublabel !== undefined && (
                    <text
                      fill="rgb(var(--c-ink-3))"
                      fontFamily="Nunito Variable, sans-serif"
                      fontSize={11}
                      fontWeight={800}
                      textAnchor="middle"
                      y={radius + 16}
                    >
                      {node.sublabel}
                    </text>
                  )}
                </motion.g>
              );
            })}
          </AnimatePresence>
        </svg>
      )}
    </div>
  );
}

/** Узлы дерева, хранящегося в массиве «как куча»: дети i — 2i+1 и 2i+2. */
export const nodesFromHeapCells = (cells: readonly { readonly value: number | null }[], toneOf: (index: number) => TreeTone): TreeDiagramNode[] => {
  const counts = new Map<number, number>();
  const keys = new Map<number, string>();
  cells.forEach((cell, index) => {
    if (cell.value === null) return;
    const seen = counts.get(cell.value) ?? 0;
    counts.set(cell.value, seen + 1);
    keys.set(index, `v${cell.value}-${seen}`);
  });
  const nodes: TreeDiagramNode[] = [];
  cells.forEach((cell, index) => {
    if (cell.value === null) return;
    const parentIndex = index === 0 ? -1 : Math.floor((index - 1) / 2);
    nodes.push({
      key: keys.get(index)!,
      label: String(cell.value),
      parentKey: parentIndex < 0 ? null : (keys.get(parentIndex) ?? null),
      side: index % 2 === 1 ? 0 : 1,
      tone: toneOf(index),
    });
  });
  return nodes;
};
