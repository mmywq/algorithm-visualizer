import { describe, expect, it } from 'vitest';
import { countOf, plural } from './plural';

describe('склонение после числа', () => {
  it('выбирает форму по последним цифрам', () => {
    const forms = ['вершина', 'вершины', 'вершин'] as const;
    const cases: Array<[number, string]> = [
      [0, 'вершин'],
      [1, 'вершина'],
      [2, 'вершины'],
      [4, 'вершины'],
      [5, 'вершин'],
      [11, 'вершин'],
      [12, 'вершин'],
      [14, 'вершин'],
      [21, 'вершина'],
      [22, 'вершины'],
      [101, 'вершина'],
      [111, 'вершин'],
    ];
    for (const [count, expected] of cases) expect(plural(count, ...forms)).toBe(expected);
  });

  it('countOf ставит число перед словом', () => {
    expect(countOf(3, 'ребро', 'ребра', 'рёбер')).toBe('3 ребра');
  });
});
