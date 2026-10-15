import { describe, expect, it } from 'vitest';
import { kmpSearch, naiveSearch, rabinKarp, type StringFrame } from './stringSearch';

const last = (frames: Generator<StringFrame, void, unknown>): StringFrame => [...frames].at(-1)!;

const occurrences = (text: string, pattern: string): number[] => {
  const result: number[] = [];
  for (let s = 0; s + pattern.length <= text.length; s += 1) if (text.slice(s, s + pattern.length) === pattern) result.push(s);
  return result;
};

const cases: [string, string][] = [
  ['абракадабра', 'абра'],
  ['abababcabababcabc', 'ababc'],
  ['aaaaaa', 'aa'],
  ['2359023141526739921', '31415'],
  ['hello', 'xyz'],
  ['abc', 'abcd'],
  ['a', 'a'],
];

describe('поиск подстроки', () => {
  it.each(cases)('«%s» / «%s»: все три алгоритма находят одно и то же', (text, pattern) => {
    const expected = occurrences(text, pattern);
    expect(last(naiveSearch(text, pattern)).meta.found).toEqual(expected);
    expect(last(kmpSearch(text, pattern)).meta.found).toEqual(expected);
    expect(last(rabinKarp(text, pattern)).meta.found).toEqual(expected);
  });

  it('префикс-функция КМП', () => {
    expect(last(kmpSearch('x', 'ababaca')).meta.pi).toEqual([0, 0, 1, 2, 3, 0, 1]);
    expect(last(kmpSearch('x', 'aabaaab')).meta.pi).toEqual([0, 1, 0, 1, 2, 2, 3]);
  });

  it('КМП делает не больше 2(n + m) сравнений', () => {
    for (const [text, pattern] of cases) expect(last(kmpSearch(text, pattern)).meta.comparisons).toBeLessThanOrEqual(2 * (text.length + pattern.length));
  });

  it('Рабин — Карп показывает коллизию из учебника Кормена', () => {
    expect(last(rabinKarp('2359023141526739921', '31415')).meta.spurious).toEqual([12]);
  });
});
