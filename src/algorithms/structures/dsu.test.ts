import { describe, expect, it } from 'vitest';
import { decodeDsuOps, dsuScenario, encodeDsuOps, type DsuOp } from './dsu';

const rootOf = (parent: readonly number[], x: number): number => (parent[x] === x ? x : rootOf(parent, parent[x]!));

describe('система непересекающихся множеств', () => {
  it('совпадает с наивной моделью связности', () => {
    let seed = 5;
    const random = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
    for (let round = 0; round < 30; round += 1) {
      const size = 8;
      const ops: DsuOp[] = Array.from({ length: 12 }, () =>
        random() < 0.75 ? { kind: 'union', a: Math.floor(random() * size), b: Math.floor(random() * size) } : { kind: 'find', x: Math.floor(random() * size) },
      );
      const group = Array.from({ length: size }, (_, index) => index);
      for (const op of ops) {
        if (op.kind !== 'union') continue;
        const from = group[op.b]!;
        const to = group[op.a]!;
        for (let i = 0; i < size; i += 1) if (group[i] === from) group[i] = to;
      }
      const last = [...dsuScenario(size, ops)].at(-1)!;
      const parent = last.meta['parent'] as number[];
      for (let a = 0; a < size; a += 1) for (let b = 0; b < size; b += 1) expect(rootOf(parent, a) === rootOf(parent, b)).toBe(group[a] === group[b]);
      const rank = last.meta['rank'] as number[];
      // ранг корня ограничивает высоту дерева
      for (let x = 0; x < size; x += 1) {
        let depth = 0;
        let current = x;
        while (parent[current] !== current) {
          current = parent[current]!;
          depth += 1;
        }
        expect(depth).toBeLessThanOrEqual(rank[current]!);
      }
    }
  });

  it('сжатие пути подвешивает узлы прямо к корню', () => {
    const ops: DsuOp[] = [
      { kind: 'union', a: 0, b: 1 },
      { kind: 'union', a: 2, b: 3 },
      { kind: 'union', a: 0, b: 2 },
      { kind: 'union', a: 4, b: 5 },
      { kind: 'union', a: 6, b: 7 },
      { kind: 'union', a: 4, b: 6 },
      { kind: 'union', a: 0, b: 4 },
      { kind: 'find', x: 7 },
    ];
    const parent = [...dsuScenario(8, ops)].at(-1)!.meta['parent'] as number[];
    expect(parent[7]).toBe(0);
  });

  it('кодирование сценария', () => {
    const ops: DsuOp[] = [
      { kind: 'union', a: 1, b: 9 },
      { kind: 'find', x: 3 },
    ];
    expect(decodeDsuOps(encodeDsuOps(ops), 10)).toEqual(ops);
    expect(decodeDsuOps('u1-12', 10)).toBeNull();
  });
});
