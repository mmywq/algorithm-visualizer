import { ChartNoAxesColumnIncreasing, Grid3x3, Hash, Layers, ListTree, Pyramid, ScanSearch, TextSearch, Waypoints, type LucideIcon } from 'lucide-react';
import type { CategoryId } from '@/content/catalog';

export const categoryIcons: Record<CategoryId, LucideIcon> = {
  linear: Layers,
  search: ScanSearch,
  sorting: ChartNoAxesColumnIncreasing,
  hashing: Hash,
  trees: ListTree,
  heaps: Pyramid,
  graphs: Waypoints,
  dp: Grid3x3,
  strings: TextSearch,
};

export function CategoryIcon({ category, size = 20, className }: { readonly category: CategoryId; readonly size?: number; readonly className?: string }) {
  const Icon = categoryIcons[category];
  return <Icon aria-hidden="true" className={className} size={size} strokeWidth={2.5} />;
}

// Палитра иллюстраций: цвет категории, его «тень», белые детали и жёлтый акцент.
const C = 'rgb(var(--cat))';
const CP = 'rgb(var(--cat-press))';
const SOFT = 'rgb(var(--cat) / 0.16)';
const W = '#FFF4FA';
const LINE = 'rgb(var(--c-line-strong))';
const Y = 'rgb(var(--c-yellow))';
const YP = 'rgb(var(--c-yellow-press))';

/** Блок с «объёмной» тенью снизу. */
function Block({ x, y, w, h, r = 6, fill = C, press = CP }: { x: number; y: number; w: number; h: number; r?: number; fill?: string; press?: string }) {
  return (
    <g>
      <rect fill={press} height={h} rx={r} width={w} x={x} y={y + 4} />
      <rect fill={fill} height={h} rx={r} width={w} x={x} y={y} />
    </g>
  );
}

function Node({ cx, cy, r = 11, fill = C, press = CP }: { cx: number; cy: number; r?: number; fill?: string; press?: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy + 3.5} fill={press} r={r} />
      <circle cx={cx} cy={cy} fill={fill} r={r} />
    </g>
  );
}

function Edge({ x1, y1, x2, y2, color = LINE, width = 4 }: { x1: number; y1: number; x2: number; y2: number; color?: string; width?: number }) {
  return <line stroke={color} strokeLinecap="round" strokeWidth={width} x1={x1} x2={x2} y1={y1} y2={y2} />;
}

const arts: Record<CategoryId, () => JSX.Element> = {
  linear: () => (
    <g>
      <Block fill={W} h={16} press={LINE} w={74} x={43} y={82} />
      <Block h={16} w={74} x={43} y={60} />
      <Block fill={W} h={16} press={LINE} w={74} x={43} y={38} />
      <g transform="rotate(-8 80 22)">
        <Block fill={Y} h={16} press={YP} w={74} x={50} y={12} />
      </g>
      <path d="M128 22 q12 10 0 26" fill="none" stroke={CP} strokeLinecap="round" strokeWidth={4} />
      <path d="M122 45 l6 4 l4 -7" fill="none" stroke={CP} strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} />
    </g>
  ),
  search: () => (
    <g>
      {[0, 1, 2, 3, 4].map((i) => (
        <Block fill={i === 2 ? C : W} h={26} key={i} press={i === 2 ? CP : LINE} r={7} w={22} x={22 + i * 24} y={58} />
      ))}
      <circle cx={80} cy={50} fill="none" r={22} stroke={Y} strokeWidth={7} />
      <circle cx={80} cy={50} fill="rgb(var(--c-yellow) / 0.12)" r={18} />
      <line stroke={YP} strokeLinecap="round" strokeWidth={9} x1={96} x2={112} y1={66} y2={84} />
    </g>
  ),
  sorting: () => (
    <g>
      <Block fill={W} h={22} press={LINE} w={18} x={26} y={76} />
      <Block fill={W} h={38} press={LINE} w={18} x={50} y={60} />
      <Block h={54} w={18} x={74} y={44} />
      <Block fill={W} h={64} press={LINE} w={18} x={98} y={34} />
      <Block fill={Y} h={80} press={YP} w={18} x={122} y={18} />
      <path d="M38 64 C 44 36, 70 30, 80 36" fill="none" stroke={CP} strokeDasharray="2 7" strokeLinecap="round" strokeWidth={4} />
    </g>
  ),
  hashing: () => (
    <g>
      <Block h={34} r={9} w={34} x={18} y={40} />
      <text fill={W} fontFamily="Nunito Variable, sans-serif" fontSize={26} fontWeight={900} textAnchor="middle" x={35} y={66}>
        #
      </text>
      <Edge color={CP} x1={58} x2={80} y1={57} y2={30} />
      <Edge color={CP} x1={58} x2={80} y1={57} y2={57} />
      <Edge color={CP} x1={58} x2={80} y1={57} y2={84} />
      {[22, 49, 76].map((y, row) => (
        <g key={y}>
          <Block fill={W} h={16} press={LINE} r={5} w={22} x={84} y={y} />
          {row !== 1 && <Block fill={row === 0 ? Y : C} h={16} press={row === 0 ? YP : CP} r={5} w={22} x={112} y={y} />}
          {row === 0 && <Block fill={C} h={16} press={CP} r={5} w={14} x={138} y={y} />}
        </g>
      ))}
    </g>
  ),
  trees: () => (
    <g>
      <Edge x1={80} x2={48} y1={26} y2={58} />
      <Edge x1={80} x2={112} y1={26} y2={58} />
      <Edge x1={48} x2={30} y1={58} y2={92} />
      <Edge x1={48} x2={64} y1={58} y2={92} />
      <Edge x1={112} x2={128} y1={58} y2={92} />
      <Node cx={80} cy={26} r={13} />
      <Node cx={48} cy={58} fill={W} press={LINE} />
      <Node cx={112} cy={58} />
      <Node cx={30} cy={92} fill={W} press={LINE} r={9} />
      <Node cx={64} cy={92} fill={Y} press={YP} r={9} />
      <Node cx={128} cy={92} fill={W} press={LINE} r={9} />
    </g>
  ),
  heaps: () => (
    <g>
      <Edge x1={80} x2={52} y1={30} y2={60} />
      <Edge x1={80} x2={108} y1={30} y2={60} />
      <Edge x1={52} x2={36} y1={60} y2={92} />
      <Edge x1={52} x2={68} y1={60} y2={92} />
      <Edge x1={108} x2={92} y1={60} y2={92} />
      <Edge x1={108} x2={124} y1={60} y2={92} />
      <Node cx={80} cy={30} fill={Y} press={YP} r={14} />
      <path d="M70 12 l4 -8 l6 6 l6 -6 l4 8 z" fill={YP} />
      <Node cx={52} cy={60} />
      <Node cx={108} cy={60} />
      {[36, 68, 92, 124].map((cx) => (
        <Node cx={cx} cy={92} fill={W} key={cx} press={LINE} r={9} />
      ))}
    </g>
  ),
  graphs: () => (
    <g>
      <Edge x1={28} x2={66} y1={70} y2={34} />
      <Edge color={CP} width={6} x1={28} x2={74} y1={70} y2={90} />
      <Edge x1={66} x2={112} y1={34} y2={30} />
      <Edge color={CP} width={6} x1={74} x2={118} y1={90} y2={72} />
      <Edge x1={66} x2={74} y1={34} y2={90} />
      <Edge color={CP} width={6} x1={118} x2={140} y1={72} y2={40} />
      <Edge x1={112} x2={140} y1={30} y2={40} />
      <Node cx={28} cy={70} fill={Y} press={YP} />
      <Node cx={66} cy={34} fill={W} press={LINE} />
      <Node cx={74} cy={90} />
      <Node cx={112} cy={30} fill={W} press={LINE} />
      <Node cx={118} cy={72} />
      <Node cx={140} cy={40} />
    </g>
  ),
  dp: () => (
    <g>
      {[0, 1, 2, 3].map((row) =>
        [0, 1, 2, 3, 4].map((col) => {
          const filled = row * 5 + col <= 12;
          const isCurrent = row * 5 + col === 13;
          return (
            <rect
              fill={isCurrent ? Y : filled ? ((row + col) % 2 === 0 ? C : SOFT) : W}
              height={18}
              key={`${row}-${col}`}
              rx={4}
              stroke={isCurrent ? YP : filled ? 'transparent' : LINE}
              strokeWidth={2}
              width={22}
              x={24 + col * 23}
              y={18 + row * 21}
            />
          );
        }),
      )}
      <path d="M94 47 l9 10" stroke={YP} strokeLinecap="round" strokeWidth={4} />
      <path d="M117 46 l-1 11" stroke={YP} strokeLinecap="round" strokeWidth={4} />
    </g>
  ),
  strings: () => (
    <g>
      {['a', 'b', 'a', 'b', 'c', 'a'].map((char, i) => (
        <g key={i}>
          <Block fill={i >= 2 && i <= 4 ? C : W} h={26} press={i >= 2 && i <= 4 ? CP : LINE} r={7} w={20} x={18 + i * 21.5} y={30} />
          <text
            fill={i >= 2 && i <= 4 ? W : 'rgb(var(--c-ink-2))'}
            fontFamily="JetBrains Mono Variable, monospace"
            fontSize={14}
            fontWeight={800}
            textAnchor="middle"
            x={28 + i * 21.5}
            y={48}
          >
            {char}
          </text>
        </g>
      ))}
      {['a', 'b', 'c'].map((char, i) => (
        <g key={`p-${i}`}>
          <Block fill={Y} h={22} press={YP} r={6} w={20} x={61 + i * 21.5} y={76} />
          <text
            fill="rgb(27 31 43)"
            fontFamily="JetBrains Mono Variable, monospace"
            fontSize={13}
            fontWeight={800}
            textAnchor="middle"
            x={71 + i * 21.5}
            y={92}
          >
            {char}
          </text>
        </g>
      ))}
      <path d="M50 87 h-14" stroke={CP} strokeLinecap="round" strokeWidth={4} />
      <path d="M41 81 l-6 6 l6 6" fill="none" stroke={CP} strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} />
    </g>
  ),
};

/** Иллюстрация раздела. Цвет берётся из переменной --cat, поэтому оборачивающий элемент должен её задавать. */
export function CategoryArt({ category, className }: { readonly category: CategoryId; readonly className?: string }) {
  const Art = arts[category];
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 160 120">
      <Art />
    </svg>
  );
}
