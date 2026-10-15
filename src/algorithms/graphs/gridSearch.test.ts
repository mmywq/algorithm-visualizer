import { describe, expect, it } from 'vitest';
import { decodeWalls, defaultWalls, encodeWalls, GRID_COLS, GRID_ROWS, gridSearch, mazeWalls, type GridMode, type GridSnapshot } from './gridSearch';

const bfsLength = (grid: GridSnapshot): number | null => {
  const dist = new Map([[grid.start, 0]]);
  const queue = [grid.start];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === grid.goal) return dist.get(current)!;
    const col = current % grid.cols;
    const candidates = [current - grid.cols, current + grid.cols, col > 0 ? current - 1 : -1, col < grid.cols - 1 ? current + 1 : -1];
    for (const next of candidates) {
      if (next < 0 || next >= grid.cols * grid.rows || grid.walls[next] || dist.has(next)) continue;
      dist.set(next, dist.get(current)! + 1);
      queue.push(next);
    }
  }
  return null;
};

const run = (grid: GridSnapshot, mode: GridMode) => [...gridSearch(grid, mode)].at(-1)!;

describe('поиск пути на сетке', () => {
  const grids: GridSnapshot[] = [
    { cols: GRID_COLS, rows: GRID_ROWS, walls: defaultWalls(), start: 4 * GRID_COLS, goal: 4 * GRID_COLS + 13 },
    ...[1, 2, 3, 4, 5].map((seed) => {
      const walls = mazeWalls(seed);
      walls[0] = false;
      walls[8 * GRID_COLS + 12] = false;
      return { cols: GRID_COLS, rows: GRID_ROWS, walls, start: 0, goal: 8 * GRID_COLS + 12 };
    }),
  ];

  it('A* и Дейкстра находят кратчайший путь, жадный — не короче', () => {
    for (const grid of grids) {
      const best = bfsLength(grid);
      expect(best).not.toBeNull();
      const astar = run(grid, 'astar');
      const dijkstra = run(grid, 'dijkstra');
      const greedy = run(grid, 'greedy');
      expect(astar.meta.path!.length - 1).toBe(best);
      expect(dijkstra.meta.path!.length - 1).toBe(best);
      expect(greedy.meta.path!.length - 1).toBeGreaterThanOrEqual(best!);
      expect(astar.meta.expanded).toBeLessThanOrEqual(dijkstra.meta.expanded);
    }
  });

  it('путь идёт по соседним свободным клеткам', () => {
    const grid = grids[0]!;
    const path = run(grid, 'astar').meta.path!;
    for (let i = 1; i < path.length; i += 1) {
      const a = path[i - 1]!;
      const b = path[i]!;
      expect(Math.abs((a % GRID_COLS) - (b % GRID_COLS)) + Math.abs(Math.floor(a / GRID_COLS) - Math.floor(b / GRID_COLS))).toBe(1);
      expect(grid.walls[b]).toBe(false);
    }
  });

  it('сообщает, что пути нет', () => {
    const walls = Array.from({ length: GRID_COLS * GRID_ROWS }, (_, index) => index % GRID_COLS === 6);
    expect(run({ cols: GRID_COLS, rows: GRID_ROWS, walls, start: 0, goal: 13 }, 'astar').meta.outcome).toBe('miss');
  });

  it('стены переживают кодирование в адрес', () => {
    const walls = mazeWalls(9);
    expect(decodeWalls(encodeWalls(walls), walls.length)).toEqual(walls);
    expect(decodeWalls('zz', 10)).toBeNull();
  });
});
