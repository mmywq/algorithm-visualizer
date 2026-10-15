import type { CSSProperties } from 'react';

/**
 * Декорации в полях широкого экрана: созвездия в форме дерева и графа,
 * пиксельная планета и «плавающий массив». Видны только там, где по бокам
 * от контента остаётся пустое место (см. .side-scenery в index.css).
 */

interface Point {
  readonly x: number;
  readonly y: number;
}

function Constellation({
  points,
  edges,
  label,
  style,
}: {
  readonly points: readonly Point[];
  readonly edges: readonly (readonly [number, number])[];
  readonly label: string;
  readonly style: CSSProperties;
}) {
  const width = Math.max(...points.map((point) => point.x)) + 16;
  const height = Math.max(...points.map((point) => point.y)) + 30;
  return (
    <div className="side-float absolute" style={style}>
      <svg aria-hidden="true" height={height} width={width}>
        {edges.map(([a, b]) => (
          <line
            key={`${a}-${b}`}
            stroke="rgb(var(--fx-star) / 0.28)"
            strokeDasharray="2 5"
            strokeLinecap="round"
            strokeWidth={2}
            x1={points[a]!.x}
            x2={points[b]!.x}
            y1={points[a]!.y}
            y2={points[b]!.y}
          />
        ))}
      </svg>
      {points.map((point, index) => (
        <span
          className="side-star absolute"
          key={index}
          style={{ left: point.x - 6, top: point.y - 6, animationDelay: `${(index * 0.7) % 4}s` } as CSSProperties}
        />
      ))}
      <span className="absolute font-display text-[16px] leading-none text-ink-3/60" style={{ left: 0, top: height - 16 }}>
        {label}
      </span>
    </div>
  );
}

const TREE: readonly Point[] = [
  { x: 84, y: 10 },
  { x: 44, y: 58 },
  { x: 124, y: 58 },
  { x: 22, y: 108 },
  { x: 64, y: 108 },
  { x: 104, y: 108 },
  { x: 146, y: 108 },
];
const TREE_EDGES = [
  [0, 1],
  [0, 2],
  [1, 3],
  [1, 4],
  [2, 5],
  [2, 6],
] as const;

const GRAPH: readonly Point[] = [
  { x: 20, y: 40 },
  { x: 86, y: 8 },
  { x: 150, y: 46 },
  { x: 128, y: 118 },
  { x: 44, y: 120 },
  { x: 88, y: 70 },
];
const GRAPH_EDGES = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 0],
  [5, 1],
  [5, 3],
  [5, 0],
] as const;

/** Пиксельная планета с кольцом. */
function Planet({ style }: { readonly style: CSSProperties }) {
  const rows = [
    '......pppp......',
    '....pppppppp....',
    '...pPPppppppp...',
    '..pPPppppppppp..',
    'rrrrrrppppppprrr',
    '.rrrrrrrrrrrrrr.',
    '..ppprrrrrrrrr..',
    '...pppppppppp...',
    '....pppppppp....',
    '......pppp......',
  ];
  const colors: Record<string, string> = { p: 'rgb(var(--c-purple) / 0.55)', P: 'rgb(var(--c-purple) / 0.85)', r: 'rgb(var(--c-pink) / 0.5)' };
  return (
    <div className="side-float absolute" style={style}>
      <svg aria-hidden="true" className="pixelated" height={60} shapeRendering="crispEdges" viewBox="0 0 16 10" width={96}>
        {rows.flatMap((row, y) =>
          [...row].map((char, x) => (char === '.' ? null : <rect fill={colors[char]} height={1} key={`${x}-${y}`} width={1} x={x} y={y} />)),
        )}
      </svg>
    </div>
  );
}

/** «Плавающий массив»: ячейки покачиваются волной. */
function FloatingArray({ style }: { readonly style: CSSProperties }) {
  const values = [3, 1, 4, 1, 5];
  return (
    <div className="absolute" style={style}>
      <div className="flex gap-1.5">
        {values.map((value, index) => (
          <span
            className="side-cell flex h-9 w-9 items-center justify-center rounded-lg border-2 border-[rgb(var(--c-teal)/0.45)] font-mono text-[15px] font-black text-[rgb(var(--c-teal)/0.75)]"
            key={index}
            style={{ animationDelay: `${index * 0.25}s` }}
          >
            {value}
          </span>
        ))}
      </div>
      <span className="mt-2 block font-display text-[16px] leading-none text-ink-3/60">a[0…4]</span>
    </div>
  );
}

export function SideScenery() {
  return (
    <div aria-hidden="true" className="side-scenery pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="side-gutter left-0">
        <Constellation edges={TREE_EDGES} label="дерево" points={TREE} style={{ top: '18%', left: '50%', marginLeft: -84 }} />
        <Planet style={{ top: '64%', left: '50%', marginLeft: -48, animationDelay: '-3s' }} />
      </div>
      <div className="side-gutter right-0">
        <Constellation edges={GRAPH_EDGES} label="граф" points={GRAPH} style={{ top: '26%', left: '50%', marginLeft: -84, animationDelay: '-5s' }} />
        <FloatingArray style={{ top: '70%', left: '50%', marginLeft: -100 }} />
      </div>
    </div>
  );
}
