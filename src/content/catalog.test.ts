import { describe, expect, it } from 'vitest';
import { demoRegistry } from '@/features/algorithm/registry';
import { catalog as algorithms } from './catalog';
import { loadTheory } from './loaders';

describe('каталог', () => {
  it('у каждого алгоритма есть теория', async () => {
    const missing: string[] = [];
    for (const entry of algorithms) {
      const theory = await loadTheory(entry.category, entry.id);
      if (theory === null || theory.intro.length === 0 || theory.complexity.length === 0) missing.push(entry.id);
    }
    expect(missing).toEqual([]);
  });

  it('у каждого алгоритма есть демонстрация', () => {
    expect(algorithms.filter((entry) => demoRegistry[entry.id] === undefined).map((entry) => entry.id)).toEqual([]);
    expect(algorithms).toHaveLength(54);
  });

  it('пути и идентификаторы уникальны', () => {
    expect(new Set(algorithms.map((entry) => entry.id)).size).toBe(algorithms.length);
    expect(new Set(algorithms.map((entry) => entry.path)).size).toBe(algorithms.length);
  });
});
