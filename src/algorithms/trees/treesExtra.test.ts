import { describe, expect, it } from 'vitest';
import type { TreeFrame } from './treeFrames';
import { segmentBuildScenario, segmentQueryScenario, segmentUpdateScenario } from './segmentTree';
import { normalizeWords, trieBuildScenario, triePrefixScenario } from './trie';

const last = (frames: Generator<TreeFrame, void, unknown>): TreeFrame => [...frames].at(-1)!;
const rootLabel = (frame: TreeFrame): string => frame.meta.nodes.find((node) => node.parentKey === null)!.label;

describe('префиксное дерево', () => {
  const words = ['кот', 'код', 'кит', 'коты', 'мир'];

  it('хранит общие префиксы один раз', () => {
    const frame = last(trieBuildScenario(words));
    // ∗ к о т ы д и т м и р = 11 узлов
    expect(frame.meta.nodes).toHaveLength(11);
    expect(
      frame.meta.nodes
        .filter((node) => node.sublabel !== undefined)
        .map((node) => node.sublabel)
        .sort(),
    ).toEqual([...words].sort());
  });

  it('находит все слова с префиксом и сообщает об отсутствии', () => {
    expect(last(triePrefixScenario(words, 'ко')).meta.output).toEqual(['код', 'кот', 'коты']);
    expect(last(triePrefixScenario(words, 'кот')).meta.output).toEqual(['кот', 'коты']);
    expect(last(triePrefixScenario(words, 'ка')).meta['outcome']).toBe('miss');
    expect(last(triePrefixScenario(words, '')).meta.output).toHaveLength(5);
  });

  it('нормализует ввод', () => {
    expect(normalizeWords('Кот, кот;  ЁЖ  cat-1')).toEqual(['кот', 'еж', 'cat']);
  });
});

describe('дерево отрезков', () => {
  const values = [5, 3, 8, 6, 1, 4, 7];

  it('корень хранит сумму массива', () => {
    expect(rootLabel(last(segmentBuildScenario(values)))).toBe('34');
    expect(last(segmentBuildScenario(values)).meta.nodes).toHaveLength(2 * values.length - 1);
  });

  it('сумма на каждом отрезке совпадает с перебором', () => {
    for (let l = 0; l < values.length; l += 1) {
      for (let r = l; r < values.length; r += 1) {
        const expected = values.slice(l, r + 1).reduce((a, b) => a + b, 0);
        const parts = last(segmentQueryScenario(values, l, r)).meta.output!.map(Number);
        expect(parts.reduce((a, b) => a + b, 0)).toBe(expected);
        expect(parts.length).toBeLessThanOrEqual(2 * Math.ceil(Math.log2(values.length)));
      }
    }
  });

  it('обновление пересчитывает суммы на пути', () => {
    const frame = last(segmentUpdateScenario(values, 2, 10));
    expect(rootLabel(frame)).toBe('36');
    expect(frame.meta['array']).toEqual([5, 3, 10, 6, 1, 4, 7]);
  });
});
