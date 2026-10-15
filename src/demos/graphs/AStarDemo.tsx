import { Eraser, Fish, Grid3x3, MousePointerClick, Shuffle, Square } from 'lucide-react';
import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import {
  decodeWalls,
  defaultWalls,
  encodeWalls,
  GRID_COLS,
  GRID_ROWS,
  gridModeNames,
  gridSearch,
  mazeWalls,
  type GridFrame,
  type GridMode,
  type GridSnapshot,
} from '@/algorithms/graphs/gridSearch';
import { CatHead } from '@/components/mascot/PixelCat';
import { Tabs } from '@/components/ui/Tabs';
import theory from '@/content/theory/graphs';
import { DemoLayout } from '@/features/demo/DemoLayout';
import type { LegendItem } from '@/features/demo/Legend';
import { useDemoPlayer } from '@/features/player/useDemoPlayer';
import { collectFrames, useFrames } from '@/features/player/usePlayer';
import { useElementWidth } from '@/hooks/useElementSize';
import { enumCodec, intCodec, useUrlState } from '@/hooks/useUrlState';
import { useUserStore } from '@/stores/userStore';

const SIZE = GRID_COLS * GRID_ROWS;
const DEFAULT_START = 4 * GRID_COLS;
const DEFAULT_GOAL = 4 * GRID_COLS + 13;
const MODES: readonly GridMode[] = ['astar', 'dijkstra', 'greedy'];
type Tool = 'wall' | 'erase' | 'start' | 'goal';

const wallsCodec = {
  parse: (raw: string) => decodeWalls(raw, SIZE),
  serialize: (walls: readonly boolean[]) => encodeWalls(walls),
};

const legend: readonly LegendItem[] = [
  { color: 'rgb(var(--c-purple))', label: 'раскрывается' },
  { color: 'rgb(var(--c-cyan) / 0.35)', label: 'открытый список' },
  { color: 'rgb(var(--c-purple) / 0.3)', label: 'уже раскрыта' },
  { color: 'rgb(var(--c-yellow))', label: 'найденный путь' },
  { color: 'rgb(var(--c-ink-2))', label: 'стена' },
];

type CellKind = 'wall' | 'path' | 'current' | 'closed' | 'open' | 'empty';

const cellClass: Record<CellKind, string> = {
  wall: 'bg-[rgb(var(--c-ink-2))] shadow-[inset_0_-3px_0_rgb(0_0_0/0.3)]',
  path: 'bg-yellow text-on',
  current: 'bg-purple text-on',
  closed: 'bg-purple/30 text-ink',
  open: 'bg-cyan/35 text-ink',
  empty: 'bg-[rgb(var(--viz-node))]',
};

function GridBoard({
  grid,
  frame,
  editable,
  tool,
  onEdit,
}: {
  readonly grid: GridSnapshot;
  readonly frame: GridFrame | null;
  readonly editable: boolean;
  readonly tool: Tool;
  readonly onEdit: (index: number, mode: 'add' | 'remove' | 'start' | 'goal') => void;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const gap = 2;
  const cell = Math.max(19, Math.min(44, Math.floor((width - 16 - gap * (GRID_COLS - 1)) / GRID_COLS)));
  const painting = useRef<'add' | 'remove' | null>(null);
  const meta = frame?.meta;
  const open = new Set(meta?.open ?? []);
  const closed = new Set(meta?.closed ?? []);
  const path = new Set(meta?.path ?? []);

  const indexAt = (event: ReactPointerEvent<HTMLDivElement>): number | null => {
    const rect = event.currentTarget.getBoundingClientRect();
    const col = Math.floor((event.clientX - rect.left) / (cell + gap));
    const row = Math.floor((event.clientY - rect.top) / (cell + gap));
    return col >= 0 && row >= 0 && col < GRID_COLS && row < GRID_ROWS ? row * GRID_COLS + col : null;
  };

  const apply = (index: number): void => {
    if (tool === 'start' || tool === 'goal') onEdit(index, tool);
    else if (painting.current !== null) onEdit(index, painting.current);
  };

  return (
    <div className="viz-stage flex justify-center px-2 py-3" ref={ref}>
      <div
        aria-label="Поле поиска пути"
        className={`relative grid select-none ${editable ? 'cursor-crosshair' : ''}`}
        onPointerDown={(event) => {
          if (!editable) return;
          const index = indexAt(event);
          if (index === null) return;
          // мышью стены рисуются протягиванием; пальцем — касанием, чтобы не мешать прокрутке
          if (tool === 'wall' || tool === 'erase') painting.current = tool === 'wall' ? 'add' : 'remove';
          if (event.pointerType !== 'touch') event.currentTarget.setPointerCapture(event.pointerId);
          apply(index);
        }}
        onPointerMove={(event) => {
          if (!editable || painting.current === null || event.pointerType === 'touch') return;
          const index = indexAt(event);
          if (index !== null) apply(index);
        }}
        onPointerUp={() => (painting.current = null)}
        onPointerCancel={() => (painting.current = null)}
        role="grid"
        style={{ gridTemplateColumns: `repeat(${GRID_COLS}, ${cell}px)`, gap, touchAction: 'manipulation' }}
      >
        {grid.walls.map((wall, index) => {
          const kind: CellKind = wall
            ? 'wall'
            : path.has(index)
              ? 'path'
              : meta?.current === index
                ? 'current'
                : closed.has(index)
                  ? 'closed'
                  : open.has(index)
                    ? 'open'
                    : 'empty';
          const score = meta?.scores[index];
          const isStart = index === grid.start;
          const isGoal = index === grid.goal;
          return (
            <div
              className={`flex items-center justify-center rounded-[5px] font-mono font-black leading-none transition-colors duration-150 ${cellClass[kind]}`}
              key={index}
              role="gridcell"
              style={{ width: cell, height: cell, fontSize: cell >= 34 ? 12 : 10 }}
            >
              {isStart ? (
                <CatHead size={Math.round(cell * 0.8)} />
              ) : isGoal ? (
                <Fish className="text-pink" size={Math.round(cell * 0.72)} strokeWidth={2.75} />
              ) : score !== undefined && cell >= 26 && kind !== 'path' ? (
                score
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModeComparison({ grid, mode }: { readonly grid: GridSnapshot; readonly mode: GridMode }) {
  const rows = useMemo(
    () =>
      MODES.map((item) => {
        const frames = collectFrames(gridSearch(grid, item)).frames;
        const last = frames.at(-1);
        return { mode: item, expanded: last?.meta.expanded ?? 0, length: last?.meta.path === undefined ? null : last.meta.path.length - 1 };
      }),
    [grid],
  );
  const best = Math.min(...rows.map((row) => row.length ?? Number.POSITIVE_INFINITY));
  return (
    <section className="card p-4">
      <h3 className="text-[15px] font-black text-ink">Сравнение на этом поле</h3>
      <table className="mt-3 w-full text-left text-[13px]">
        <thead>
          <tr className="font-extrabold text-ink-3">
            <th className="pb-1.5" scope="col">
              Алгоритм
            </th>
            <th className="pb-1.5 text-right" scope="col">
              Раскрыто
            </th>
            <th className="pb-1.5 text-right" scope="col">
              Путь
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className={`border-t-2 border-line ${row.mode === mode ? 'font-black text-ink' : 'font-bold text-ink-2'}`} key={row.mode}>
              <td className="py-1.5">{gridModeNames[row.mode]}</td>
              <td className="py-1.5 text-right font-mono">{row.expanded}</td>
              <td className={`py-1.5 text-right font-mono ${row.length !== null && row.length > best ? 'text-orange' : ''}`}>{row.length ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[12px] font-semibold leading-5 text-ink-3">
        Чем меньше раскрыто клеток, тем меньше работы. Оранжевым отмечен путь длиннее кратчайшего.
      </p>
    </section>
  );
}

export default function AStarDemo() {
  const markCustomInput = useUserStore((state) => state.markCustomInput);
  const markCustom = (): void => markCustomInput('a-star');
  const [walls, setWalls] = useUrlState('w', defaultWalls(), wallsCodec);
  const [start, setStart] = useUrlState('st', DEFAULT_START, intCodec(0, SIZE - 1));
  const [goal, setGoal] = useUrlState('to', DEFAULT_GOAL, intCodec(0, SIZE - 1));
  const [mode, setMode] = useUrlState<GridMode>('alg', 'astar', enumCodec(MODES));
  const [tool, setTool] = useState<Tool>('wall');
  const grid = useMemo<GridSnapshot>(() => {
    const clean = [...walls];
    clean[start] = false;
    clean[goal] = false;
    return { cols: GRID_COLS, rows: GRID_ROWS, walls: clean, start, goal: goal === start ? (start + 1) % SIZE : goal };
  }, [walls, start, goal]);
  const frameSet = useFrames(() => gridSearch(grid, mode), [grid, mode]);
  const player = useDemoPlayer(frameSet);
  const editable = !player.isPlaying;

  const edit = (index: number, action: 'add' | 'remove' | 'start' | 'goal'): void => {
    if (action === 'start') {
      if (index !== grid.goal) setStart(index);
      return;
    }
    if (action === 'goal') {
      if (index !== grid.start) setGoal(index);
      return;
    }
    if (index === grid.start || index === grid.goal) return;
    if (grid.walls[index] === (action === 'add')) return;
    const next = [...walls];
    next[index] = action === 'add';
    setWalls(next);
    markCustom();
  };

  const tools: readonly { value: Tool; label: string; icon: ReactNode }[] = [
    { value: 'wall', label: 'Стена', icon: <Square size={15} strokeWidth={2.75} /> },
    { value: 'erase', label: 'Ластик', icon: <Eraser size={15} strokeWidth={2.5} /> },
    { value: 'start', label: 'Кот', icon: <MousePointerClick size={15} strokeWidth={2.5} /> },
    { value: 'goal', label: 'Рыбка', icon: <Fish size={15} strokeWidth={2.5} /> },
  ];

  return (
    <DemoLayout
      aside={<ModeComparison grid={grid} mode={mode} />}
      legend={legend}
      player={player}
      pseudocode={theory['a-star']!.pseudocode}
      resultInput={`поле ${GRID_COLS}×${GRID_ROWS}, стен ${grid.walls.filter(Boolean).length}, алгоритм ${gridModeNames[mode]}`}
      stage={
        <div>
          <GridBoard editable={editable} frame={player.frame} grid={grid} onEdit={edit} tool={tool} />
          <div className="mt-2.5 flex flex-wrap items-center gap-2 px-1">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Инструмент">
              {tools.map((item) => (
                <button
                  aria-pressed={tool === item.value}
                  className={`btn btn-sm ${tool === item.value ? 'btn-primary' : 'btn-secondary'}`}
                  disabled={!editable}
                  key={item.value}
                  onClick={() => setTool(item.value)}
                  type="button"
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
            <span className="flex-1" />
            <button
              className="btn btn-ghost btn-sm"
              disabled={!editable}
              onClick={() => {
                setWalls(mazeWalls());
                setStart(0);
                setGoal(8 * GRID_COLS + 12);
                markCustom();
              }}
              type="button"
            >
              <Shuffle size={15} strokeWidth={2.5} />
              Лабиринт
            </button>
            <button
              className="btn btn-ghost btn-sm"
              disabled={!editable}
              onClick={() => {
                setWalls(defaultWalls());
                setStart(DEFAULT_START);
                setGoal(DEFAULT_GOAL);
              }}
              type="button"
            >
              <Grid3x3 size={15} strokeWidth={2.5} />
              Пример
            </button>
            <button className="btn btn-ghost btn-sm" disabled={!editable} onClick={() => setWalls(Array.from({ length: SIZE }, () => false))} type="button">
              Очистить
            </button>
          </div>
          <p className="mt-2 px-1 text-[13px] font-bold text-ink-3">
            {editable
              ? 'Рисуйте стены протягиванием мыши или касаниями. Инструменты «Кот» и «Рыбка» переставляют старт и цель.'
              : 'Идёт демонстрация — поле можно менять на паузе.'}
          </p>
        </div>
      }
      toolbar={
        <Tabs
          ariaLabel="Алгоритм"
          items={MODES.map((value) => ({ value, label: gridModeNames[value] }))}
          onChange={(value) => setMode(value as GridMode)}
          size="sm"
          value={mode}
        />
      }
    />
  );
}
