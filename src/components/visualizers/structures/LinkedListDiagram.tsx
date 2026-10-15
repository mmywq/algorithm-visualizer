import { AnimatePresence, motion } from 'framer-motion';
import { useId } from 'react';
import { useElementWidth } from '@/hooks/useElementSize';
import type { LinkedListFrame, ListNode } from '@/types';

const NODE_W = 82;
const NODE_H = 48;
const PORT_W = 26;
const GAP_X = 42;
const GAP_Y = 38;
const PAD = 20;
const TAG_ROW = 24;

type Orientation = 'row' | 'column';
type Tone = 'idle' | 'active' | 'found' | 'new' | 'removed';

const toneClass: Record<Tone, string> = {
  idle: 'border-[rgb(var(--viz-node-line))] bg-surface text-ink',
  active: 'border-brand-press bg-brand text-on',
  found: 'border-yellow-press bg-yellow text-on',
  new: 'border-green-press bg-green text-on',
  removed: 'border-dashed border-red bg-red/10 text-ink-3',
};

const toneOf = (frame: LinkedListFrame, id: string): Tone => {
  const meta = frame.meta;
  if (meta.removedId === id) return 'removed';
  if (meta.foundId === id) return 'found';
  if (meta.newId === id) return 'new';
  if (meta.activeId === id) return 'active';
  return 'idle';
};

interface Box {
  readonly x: number;
  readonly y: number;
}

/** Все указатели (включая head), сгруппированные по узлам; указатели в ∅ — отдельно. */
const collectPointers = (frame: LinkedListFrame): { byNode: Map<string, string[]>; empty: string[] } => {
  const byNode = new Map<string, string[]>();
  const empty: string[] = [];
  const entries: [string, string | null][] = [['head', frame.data.head], ...Object.entries(frame.meta.pointers ?? {})];
  for (const [name, id] of entries) {
    if (id === null) empty.push(name);
    else byNode.set(id, [...(byNode.get(id) ?? []), name]);
  }
  return { byNode, empty };
};

interface Link {
  readonly key: string;
  readonly d: string;
  readonly changed: boolean;
}

const cubic = (x1: number, y1: number, c1x: number, c1y: number, c2x: number, c2y: number, x2: number, y2: number): string =>
  `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`;

const line = (x1: number, y1: number, x2: number, y2: number): string =>
  cubic(x1, y1, x1 + (x2 - x1) / 3, y1 + (y2 - y1) / 3, x1 + ((x2 - x1) * 2) / 3, y1 + ((y2 - y1) * 2) / 3, x2, y2);

const linkPath = (orientation: Orientation, from: Box, to: Box, fromIndex: number, toIndex: number): string => {
  const adjacent = Math.abs(fromIndex - toIndex) === 1;
  if (orientation === 'row') {
    const midY = from.y + NODE_H / 2;
    if (adjacent && toIndex > fromIndex) return line(from.x + NODE_W - PORT_W / 2, midY, to.x - 3, midY);
    if (adjacent) return line(from.x - 3, midY, to.x + NODE_W + 3, midY);
    // ссылка через узел — дугой под рядом
    const startX = from.x + NODE_W - PORT_W / 2;
    const endX = to.x + NODE_W / 2 - 10;
    const bottom = from.y + NODE_H;
    return cubic(startX, bottom - 4, startX + 10, bottom + 46, endX - 10, bottom + 46, endX, bottom + 4);
  }
  const midX = from.x + NODE_W / 2;
  if (adjacent && toIndex > fromIndex) return line(midX, from.y + NODE_H, midX, to.y - 3);
  if (adjacent) return line(midX, from.y - 3, midX, to.y + NODE_H + 3);
  const right = from.x + NODE_W;
  return cubic(right - 4, from.y + NODE_H / 2, right + 52, from.y + NODE_H / 2 + 10, right + 52, to.y + NODE_H / 2 - 10, right + 4, to.y + NODE_H / 2);
};

export function LinkedListDiagram({ frame }: { readonly frame: LinkedListFrame | null }) {
  const markerId = useId().replace(/:/g, '');
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const nodes: readonly ListNode[] = frame?.data.nodes ?? [];
  const count = nodes.length;

  const rowWidth = count * NODE_W + Math.max(0, count - 1) * GAP_X + PAD * 2;
  const fitScale = width === 0 ? 1 : Math.min(1, width / rowWidth);
  const orientation: Orientation = fitScale >= 0.8 ? 'row' : 'column';
  const scale = orientation === 'row' ? fitScale : 1;

  const pointers = frame === null ? { byNode: new Map<string, string[]>(), empty: [] } : collectPointers(frame);
  const maxTags = Math.max(1, ...[...pointers.byNode.values()].map((names) => names.length));
  const tagSpace = orientation === 'row' ? maxTags * TAG_ROW + 6 : 0;

  const boxes = new Map<string, Box>();
  nodes.forEach((node, index) => {
    boxes.set(
      node.id,
      orientation === 'row'
        ? { x: PAD + index * (NODE_W + GAP_X), y: PAD + tagSpace }
        : { x: Math.max(110, width / 2 - NODE_W / 2), y: PAD + index * (NODE_H + GAP_Y) },
    );
  });

  const indexOf = new Map(nodes.map((node, index) => [node.id, index]));
  const links: Link[] = [];
  for (const node of nodes) {
    if (node.next === null) continue;
    const from = boxes.get(node.id);
    const to = boxes.get(node.next);
    if (from === undefined || to === undefined) continue;
    links.push({
      key: `${node.id}->${node.next}`,
      d: linkPath(orientation, from, to, indexOf.get(node.id)!, indexOf.get(node.next)!),
      changed: frame?.meta.changedLink === node.id,
    });
  }

  const hasArc = links.some((link) => {
    const [from, to] = link.key.split('->');
    return Math.abs(indexOf.get(from!)! - indexOf.get(to!)!) > 1;
  });
  const innerWidth = orientation === 'row' ? rowWidth : Math.max(width, 320);
  const innerHeight = orientation === 'row' ? PAD * 2 + tagSpace + NODE_H + (hasArc ? 48 : 0) : PAD * 2 + count * NODE_H + Math.max(0, count - 1) * GAP_Y;

  return (
    <div className="viz-stage overflow-hidden px-2 py-3" ref={ref}>
      {count === 0 ? (
        <div className="flex h-[160px] flex-col items-center justify-center gap-2 font-mono text-sm font-bold text-ink-3">
          <span className="rounded-md bg-ink px-1.5 py-0.5 text-[11px] text-surface">head</span>
          <span>∅ — список пуст</span>
        </div>
      ) : (
        <div className="mx-auto" style={{ width: innerWidth * scale, height: innerHeight * scale }}>
          <div className="relative origin-top-left" style={{ width: innerWidth, height: innerHeight, transform: `scale(${scale})` }}>
            <svg aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-visible" height={innerHeight} width={innerWidth}>
              <defs>
                {(['idle', 'changed'] as const).map((kind) => (
                  <marker
                    id={`${markerId}-${kind}`}
                    key={kind}
                    markerHeight="9"
                    markerUnits="userSpaceOnUse"
                    markerWidth="9"
                    orient="auto"
                    refX="7"
                    refY="4.5"
                    viewBox="0 0 9 9"
                  >
                    <path d="M0 0 L9 4.5 L0 9 Z" fill={kind === 'changed' ? 'rgb(var(--c-orange))' : 'rgb(var(--viz-edge))'} />
                  </marker>
                ))}
              </defs>
              <AnimatePresence>
                {links.map((link) => (
                  <motion.path
                    animate={{ d: link.d, pathLength: 1, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    fill="none"
                    initial={{ d: link.d, pathLength: 0, opacity: 0 }}
                    key={link.key}
                    markerEnd={`url(#${markerId}-${link.changed ? 'changed' : 'idle'})`}
                    stroke={link.changed ? 'rgb(var(--c-orange))' : 'rgb(var(--viz-edge))'}
                    strokeLinecap="round"
                    strokeWidth={link.changed ? 4 : 3}
                    transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
                  />
                ))}
              </AnimatePresence>
            </svg>

            <AnimatePresence initial={false}>
              {nodes.map((node) => {
                const box = boxes.get(node.id)!;
                const tone = frame === null ? 'idle' : toneOf(frame, node.id);
                const names = pointers.byNode.get(node.id) ?? [];
                return (
                  <motion.div
                    animate={{ left: box.x, top: box.y, opacity: tone === 'removed' ? 0.75 : 1, scale: 1 }}
                    className="absolute"
                    exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                    initial={{ left: box.x, top: box.y - 16, opacity: 0, scale: 0.6 }}
                    key={node.id}
                    style={{ width: NODE_W, height: NODE_H }}
                    transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                  >
                    <div
                      className={`flex h-full overflow-hidden rounded-xl border-2 font-mono font-black transition-colors duration-200 ${toneClass[tone]}`}
                      style={{ boxShadow: tone === 'removed' ? 'none' : 'inset 0 -4px 0 rgb(0 0 0 / 0.18)' }}
                    >
                      <span className="flex flex-1 items-center justify-center text-[18px]">{node.value}</span>
                      <span
                        className="flex items-center justify-center border-l-2 text-[13px] opacity-80"
                        style={{ width: PORT_W, borderColor: 'color-mix(in srgb, currentColor 35%, transparent)' }}
                      >
                        {node.next === null ? '∅' : <span className="h-2 w-2 rounded-full bg-current" />}
                      </span>
                    </div>
                    {names.length > 0 && (
                      <div
                        className={
                          orientation === 'row'
                            ? 'absolute bottom-full left-0 mb-1.5 flex w-[calc(100%-26px)] flex-col items-center gap-1'
                            : 'absolute right-full top-1/2 mr-2.5 flex -translate-y-1/2 flex-col items-end gap-1'
                        }
                      >
                        {names.map((name) => (
                          <PointerTag key={name} name={name} orientation={orientation} />
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {pointers.empty.length > 0 && count > 0 && (
        <div className="mt-2 flex flex-wrap justify-center gap-2 font-mono text-[12px] font-bold text-ink-3">
          {pointers.empty.map((name) => (
            <span className="rounded-md border-2 border-dashed border-line-strong px-1.5 py-0.5" key={name}>
              {name} = ∅
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const pointerColors: Record<string, string> = {
  head: 'bg-ink text-surface',
  curr: 'bg-brand text-on',
  prev: 'bg-purple text-on',
  next: 'bg-teal text-on',
  node: 'bg-green text-on',
};

function PointerTag({ name, orientation }: { readonly name: string; readonly orientation: Orientation }) {
  return (
    <motion.span
      animate={{ opacity: 1, y: 0 }}
      className={`whitespace-nowrap rounded-md px-1.5 py-0.5 font-mono text-[11px] font-black leading-[14px] ${pointerColors[name] ?? 'bg-ink text-surface'}`}
      initial={{ opacity: 0, y: -4 }}
      layout
    >
      {name} {orientation === 'row' ? '▼' : '▶'}
    </motion.span>
  );
}

export const linkedListLegend = [
  { color: 'rgb(var(--c-brand))', label: 'текущий узел' },
  { color: 'rgb(var(--c-green))', label: 'новый узел' },
  { color: 'rgb(var(--c-yellow))', label: 'найден' },
  { color: 'rgb(var(--c-orange))', label: 'изменённая ссылка', shape: 'line' as const },
];
