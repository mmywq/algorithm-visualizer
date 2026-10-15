import type { AlgorithmFrame, AlgorithmPhase } from '@/types';

export interface GridSnapshot {
  readonly cols: number;
  readonly rows: number;
  /** стены по индексу клетки row * cols + col */
  readonly walls: readonly boolean[];
  readonly start: number;
  readonly goal: number;
}

export interface GridMeta extends Record<string, unknown> {
  readonly open: readonly number[];
  readonly closed: readonly number[];
  readonly current?: number;
  readonly path?: readonly number[];
  /** число в клетке: f, g или h — в зависимости от режима */
  readonly scores: Readonly<Record<number, number>>;
  readonly expanded: number;
  readonly outcome?: 'hit' | 'miss';
}

export type GridFrame = AlgorithmFrame<GridSnapshot, GridMeta>;
export type GridMode = 'astar' | 'dijkstra' | 'greedy';

export const gridModeNames: Record<GridMode, string> = { astar: 'A*', dijkstra: 'Дейкстра', greedy: 'Жадный поиск' };

const scoreName: Record<GridMode, string> = { astar: 'f = g + h', dijkstra: 'g', greedy: 'h' };

export const cellOf = (grid: GridSnapshot, index: number): { col: number; row: number } => ({ col: index % grid.cols, row: Math.floor(index / grid.cols) });

const manhattan = (grid: GridSnapshot, a: number, b: number): number => {
  const p = cellOf(grid, a);
  const q = cellOf(grid, b);
  return Math.abs(p.col - q.col) + Math.abs(p.row - q.row);
};

const neighbors = (grid: GridSnapshot, index: number): number[] => {
  const { col, row } = cellOf(grid, index);
  const result: number[] = [];
  if (row > 0) result.push(index - grid.cols);
  if (col < grid.cols - 1) result.push(index + 1);
  if (row < grid.rows - 1) result.push(index + grid.cols);
  if (col > 0) result.push(index - 1);
  return result.filter((item) => grid.walls[item] !== true);
};

const label = (grid: GridSnapshot, index: number): string => {
  const { col, row } = cellOf(grid, index);
  return `(${col}, ${row})`;
};

/**
 * Поиск пути на клетчатом поле с шагом 1 в четырёх направлениях.
 * A* упорядочивает клетки по f = g + h, Дейкстра — по g, жадный поиск — только по эвристике h.
 */
export function* gridSearch(grid: GridSnapshot, mode: GridMode): Generator<GridFrame, void, unknown> {
  const g = new Map<number, number>([[grid.start, 0]]);
  const parent = new Map<number, number>();
  const open = new Set<number>([grid.start]);
  const closed = new Set<number>();
  const order = new Map<number, number>([[grid.start, 0]]);
  let counter = 1;
  let step = 0;
  const h = (index: number): number => manhattan(grid, index, grid.goal);
  const priority = (index: number): number => (mode === 'astar' ? g.get(index)! + h(index) : mode === 'dijkstra' ? g.get(index)! : h(index));

  const frame = (phase: AlgorithmPhase, line: number, message: string, extra: Partial<GridMeta> = {}): GridFrame => {
    const scores: Record<number, number> = {};
    for (const index of [...open, ...closed]) scores[index] = priority(index);
    return {
      step: step++,
      domain: 'graph',
      phase,
      status: phase === 'complete' ? 'completed' : 'running',
      data: grid,
      activeIds: extra.current === undefined ? [] : [String(extra.current)],
      pseudocode: { line },
      message,
      description: message,
      meta: { open: [...open], closed: [...closed], scores, expanded: closed.size, ...extra },
    };
  };

  const intro =
    mode === 'astar'
      ? `A* выбирает клетку с наименьшим f = g + h: g — пройдено от старта, h — манхэттенское расстояние до цели. Эвристика никогда не переоценивает путь, поэтому найденный путь будет кратчайшим.`
      : mode === 'dijkstra'
        ? 'Дейкстра выбирает клетку с наименьшим g — расстоянием от старта — и ничего не знает о том, где цель. Поэтому фронт расходится во все стороны кругами.'
        : 'Жадный поиск смотрит только на h — оценку расстояния до цели — и рвётся к ней напрямик. Быстро, но кратчайший путь не гарантирован.';
  yield frame('initial', 1, `${intro} Старт ${label(grid, grid.start)}, цель ${label(grid, grid.goal)}.`, { current: grid.start });

  while (open.size > 0) {
    const current = [...open].reduce((best, index) => {
      const a = priority(index);
      const b = priority(best);
      if (a !== b) return a < b ? index : best;
      if (h(index) !== h(best)) return h(index) < h(best) ? index : best;
      return order.get(index)! < order.get(best)! ? index : best;
    });

    if (current === grid.goal) {
      const path: number[] = [current];
      let cursor = current;
      while (parent.has(cursor)) {
        cursor = parent.get(cursor)!;
        path.unshift(cursor);
      }
      yield frame(
        'complete',
        3,
        `Цель извлечена из открытого списка — путь найден: ${path.length - 1} шагов. Раскрыто клеток: ${closed.size}. ${
          mode === 'astar'
            ? 'Это кратчайший путь.'
            : mode === 'dijkstra'
              ? 'Путь кратчайший, но клеток раскрыто больше, чем у A*.'
              : 'Путь может оказаться не кратчайшим — сравните с A*.'
        }`,
        { current, path, outcome: 'hit' },
      );
      return;
    }

    open.delete(current);
    closed.add(current);
    const updates: string[] = [];
    for (const next of neighbors(grid, current)) {
      if (closed.has(next)) continue;
      const tentative = g.get(current)! + 1;
      if (!g.has(next) || tentative < g.get(next)!) {
        g.set(next, tentative);
        parent.set(next, current);
        if (!open.has(next)) {
          open.add(next);
          order.set(next, counter++);
        }
        updates.push(`${label(grid, next)}: ${scoreName[mode]} = ${priority(next)}`);
      }
    }
    yield frame(
      'visit',
      updates.length > 0 ? 4 : 5,
      `Раскрываем ${label(grid, current)} (${scoreName[mode]} = ${priority(current)}). ${updates.length > 0 ? `Обновили соседей — ${updates.join('; ')}.` : 'Новых соседей нет.'}`,
      { current },
    );
  }

  yield frame('complete', 6, `Открытый список опустел, а цель так и не достигнута — стены отрезают её от старта. Пути нет. Раскрыто клеток: ${closed.size}.`, {
    outcome: 'miss',
  });
}

// ---------- кодирование поля в адрес ----------

export const GRID_COLS = 14;
export const GRID_ROWS = 9;

export const encodeWalls = (walls: readonly boolean[]): string => {
  let result = '';
  for (let index = 0; index < walls.length; index += 4) {
    let nibble = 0;
    for (let bit = 0; bit < 4; bit += 1) if (walls[index + bit] === true) nibble |= 1 << bit;
    result += nibble.toString(16);
  }
  return result.replace(/0+$/, '');
};

export const decodeWalls = (raw: string, size: number): boolean[] | null => {
  if (!/^[0-9a-f]*$/.test(raw) || raw.length > Math.ceil(size / 4)) return null;
  const walls = Array.from({ length: size }, () => false);
  [...raw].forEach((char, position) => {
    const nibble = Number.parseInt(char, 16);
    for (let bit = 0; bit < 4; bit += 1) if ((nibble & (1 << bit)) !== 0 && position * 4 + bit < size) walls[position * 4 + bit] = true;
  });
  return walls;
};

/** Поле по умолчанию: стена с проходами, которая заставляет обходить препятствие. */
export const defaultWalls = (): boolean[] => {
  const walls = Array.from({ length: GRID_COLS * GRID_ROWS }, () => false);
  const set = (col: number, row: number) => (walls[row * GRID_COLS + col] = true);
  for (let row = 1; row < GRID_ROWS; row += 1) set(5, row);
  for (let row = 0; row < GRID_ROWS - 1; row += 1) set(9, row);
  for (let col = 6; col < 8; col += 1) set(col, 4);
  return walls;
};

export const mazeWalls = (seed = Date.now()): boolean[] => {
  // лабиринт обходом в глубину по нечётным клеткам
  let state = seed % 2147483647 || 1;
  const random = () => (state = (state * 48271) % 2147483647) / 2147483647;
  const walls = Array.from({ length: GRID_COLS * GRID_ROWS }, () => true);
  const open = (col: number, row: number) => (walls[row * GRID_COLS + col] = false);
  const stack: [number, number][] = [[0, 0]];
  open(0, 0);
  const seen = new Set(['0,0']);
  while (stack.length > 0) {
    const [col, row] = stack.at(-1)!;
    const options = (
      [
        [2, 0],
        [-2, 0],
        [0, 2],
        [0, -2],
      ] as const
    )
      .map(([dc, dr]) => [col + dc, row + dr] as [number, number])
      .filter(([c, r]) => c >= 0 && r >= 0 && c < GRID_COLS && r < GRID_ROWS && !seen.has(`${c},${r}`));
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const [nc, nr] = options[Math.floor(random() * options.length)]!;
    open((col + nc) / 2, (row + nr) / 2);
    open(nc, nr);
    seen.add(`${nc},${nr}`);
    stack.push([nc, nr]);
  }
  // несколько лишних проходов, чтобы путей было больше одного
  for (let k = 0; k < 10; k += 1) walls[Math.floor(random() * walls.length)] = false;
  return walls;
};
