import { describe, expect, it } from 'vitest';
import { coinChange, editDistance, fibonacciCallTree, fibonacciTable, knapsack, lcs } from './dp';

const last = <T>(frames: Generator<T, void, unknown>): T => [...frames].at(-1)!;

describe('динамическое программирование', () => {
  it('Фибоначчи: таблица и деревья вызовов дают одно значение', () => {
    const fib = [0, 1, 1, 2, 3, 5, 8, 13, 21];
    for (let n = 1; n <= 8; n += 1) expect(last(fibonacciTable(n)).meta.answer).toBe(String(fib[n]));
    // наивная рекурсия делает 2·F(n+1) − 1 вызовов, мемоизация — 2n − 1
    const naive = last(fibonacciCallTree(6, false));
    const memo = last(fibonacciCallTree(6, true));
    expect(naive.meta.nodes).toHaveLength(2 * fib[7]! - 1);
    expect(memo.meta.nodes).toHaveLength(2 * 6 - 1);
    expect(naive.meta.nodes.find((node) => node.parentKey === null)!.sublabel).toBe('= 8');
  });

  it('размен: жадный выбор не оптимален, ДП — оптимален', () => {
    const frame = last(coinChange([1, 3, 4], 6));
    expect(frame.meta.answer).toBe('2');
    expect([...frame.meta.details!].map(Number).reduce((a, b) => a + b, 0)).toBe(6);
    expect(last(coinChange([5, 7], 3)).meta.outcome).toBe('miss');
  });

  it('рюкзак совпадает с перебором', () => {
    const items = [
      { weight: 2, value: 3 },
      { weight: 3, value: 4 },
      { weight: 4, value: 5 },
      { weight: 5, value: 6 },
    ];
    for (let capacity = 0; capacity <= 10; capacity += 1) {
      let best = 0;
      for (let mask = 0; mask < 1 << items.length; mask += 1) {
        const chosen = items.filter((_, index) => (mask & (1 << index)) !== 0);
        const weight = chosen.reduce((sum, item) => sum + item.weight, 0);
        if (weight <= capacity)
          best = Math.max(
            best,
            chosen.reduce((sum, item) => sum + item.value, 0),
          );
      }
      expect(last(knapsack(items, capacity)).meta.answer).toBe(String(best));
    }
  });

  it('НОП и расстояние Левенштейна', () => {
    const common = last(lcs('ABCBDAB', 'BDCABA')).meta.answer!;
    expect(common).toHaveLength(4);
    expect(last(editDistance('котик', 'скотина')).meta.answer).toBe('3');
    expect(last(editDistance('kitten', 'sitting')).meta.answer).toBe('3');
    expect(last(editDistance('abc', 'abc')).meta.answer).toBe('0');
    expect(last(editDistance('kitten', 'sitting')).meta.details).toHaveLength(3);
  });
});
