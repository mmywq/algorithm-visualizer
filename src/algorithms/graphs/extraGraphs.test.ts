import { describe, expect, it } from 'vitest';
import type { GraphAlgorithmFrame, GraphEdge, GraphSnapshot } from '@/types';
import { defaultWeightedGraph } from './advanced';
import {
  bellmanFord,
  bipartiteCheck,
  cycleDetection,
  defaultAllPairsGraph,
  defaultBipartiteGraph,
  defaultCycleGraph,
  defaultDagGraph,
  defaultNegativeGraph,
  floydWarshall,
  prim,
  topologicalSort,
  type MatrixMeta,
} from './extraGraphs';

const last = (frames: Generator<GraphAlgorithmFrame, void, unknown>): GraphAlgorithmFrame => [...frames].at(-1)!;

const graphOf = (edges: readonly (readonly [string, string, number?])[], directed: boolean): GraphSnapshot => {
  const ids = [...new Set(edges.flatMap(([a, b]) => [a, b]))];
  return {
    nodes: ids.map((id) => ({ id, label: id, position: { x: 0, y: 0 }, payload: {} })),
    edges: edges.map(
      ([source, target, weight]): GraphEdge => ({
        id: `${source}-${target}`,
        source,
        target,
        ...(weight === undefined ? {} : { weight }),
        directed,
        payload: {},
      }),
    ),
  };
};

describe('алгоритм Прима', () => {
  it('находит остов того же веса, что и перебор Краскала', () => {
    const frame = last(prim(defaultWeightedGraph, 'A'));
    // A-B 2, B-C 1, C-E 3, E-F 1, D-F 2 = 9
    expect(frame.meta['totalWeight']).toBe(9);
    expect(frame.meta['mstEdgeIds']).toHaveLength(defaultWeightedGraph.nodes.length - 1);
  });

  it('не зависит от стартовой вершины', () => {
    for (const start of ['B', 'D', 'F']) expect(last(prim(defaultWeightedGraph, start)).meta['totalWeight']).toBe(9);
  });
});

describe('топологическая сортировка', () => {
  it('каждое ребро идёт слева направо', () => {
    const order = last(topologicalSort(defaultDagGraph)).meta['order'] as string[];
    expect(order).toHaveLength(defaultDagGraph.nodes.length);
    for (const edge of defaultDagGraph.edges) expect(order.indexOf(edge.source)).toBeLessThan(order.indexOf(edge.target));
  });

  it('сообщает о цикле', () => {
    expect(last(topologicalSort(defaultCycleGraph)).meta['outcome']).toBe('miss');
  });
});

describe('Беллман — Форд', () => {
  it('учитывает отрицательное ребро', () => {
    const rows = last(bellmanFord(defaultNegativeGraph, 'A')).meta['distanceRows'] as { nodeId: string; distance: string }[];
    const dist = Object.fromEntries(rows.map((row) => [row.nodeId, row.distance]));
    expect(dist).toEqual({ A: '0', B: '2', C: '5', D: '5', E: '7' });
  });

  it('находит отрицательный цикл', () => {
    const graph = graphOf(
      [
        ['A', 'B', 1],
        ['B', 'C', -2],
        ['C', 'B', 1],
      ],
      true,
    );
    expect(last(bellmanFord(graph, 'A')).meta['outcome']).toBe('miss');
  });
});

describe('Флойд — Уоршелл', () => {
  it('совпадает с Беллманом — Фордом от каждой вершины', () => {
    const meta = last(floydWarshall(defaultAllPairsGraph)).meta as unknown as MatrixMeta;
    meta.labels.forEach((source, i) => {
      const rows = last(bellmanFord(defaultAllPairsGraph, source)).meta['distanceRows'] as { nodeId: string; distance: string }[];
      for (const row of rows) {
        const j = meta.labels.indexOf(row.nodeId);
        expect(meta.matrix[i]![j] === null ? '∞' : String(meta.matrix[i]![j])).toBe(row.distance);
      }
    });
  });
});

describe('поиск цикла', () => {
  it('находит цикл B → C → D → B', () => {
    const frame = last(cycleDetection(defaultCycleGraph));
    expect(frame.meta['found']).toBe(true);
    expect(Object.keys(frame.meta['nodeColors'] as object).sort()).toEqual(['B', 'C', 'D']);
  });

  it('не находит цикла в DAG', () => {
    expect(last(cycleDetection(defaultDagGraph)).meta['found']).toBeUndefined();
  });
});

describe('двудольность', () => {
  it('раскрашивает двудольный граф', () => {
    const frame = last(bipartiteCheck(defaultBipartiteGraph));
    expect(frame.meta['found']).toBe(true);
    const colors = frame.meta['nodeColors'] as Record<string, string>;
    for (const edge of defaultBipartiteGraph.edges) expect(colors[edge.source]).not.toBe(colors[edge.target]);
  });

  it('находит нечётный цикл', () => {
    const triangle = graphOf(
      [
        ['A', 'B'],
        ['B', 'C'],
        ['C', 'A'],
      ],
      false,
    );
    expect(last(bipartiteCheck(triangle)).meta['outcome']).toBe('miss');
  });
});
