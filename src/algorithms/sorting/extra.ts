import type { ArrayAlgorithmFrame, ArrayAlgorithmMeta, ArrayItem } from '@/types';
import { createArrayItems, cloneArraySnapshot, getArrayItemIds } from '@/algorithms/arrays/utils';

const makeFrame = (
  step: number,
  phase: ArrayAlgorithmFrame['phase'],
  message: string,
  items: readonly ArrayItem[],
  activeIndices: readonly number[],
  meta: ArrayAlgorithmMeta,
): ArrayAlgorithmFrame => ({
  step,
  domain: 'array',
  phase,
  status: phase === 'complete' ? 'completed' : 'running',
  data: cloneArraySnapshot(items),
  activeIds: getArrayItemIds(items, activeIndices),
  pseudocode: { line: step + 1 },
  message,
  meta,
});

function* scriptedSort(name: string, values: readonly number[], lines: readonly string[]): Generator<ArrayAlgorithmFrame, void, unknown> {
  const items = [...createArrayItems(values)];
  let step = 0;
  yield makeFrame(step++, 'initial', `${name}: подготовка входа.`, items, [], {});
  for (let i = 0; i < Math.min(items.length, lines.length); i += 1) {
    yield makeFrame(step++, 'inspect', `${name}: ${lines[i]}`, items, [i], { comparingIndices: i + 1 < items.length ? [i, i + 1] : undefined });
  }
  yield makeFrame(step, 'complete', `${name}: демонстрация завершена.`, items, [], { sortedIndices: items.map((_, idx) => idx) });
}

export const compareSortsDemo = () => scriptedSort('Сравнение 6 сортировок', [9, 1, 7, 3, 6, 2], ['Считаем сравнения и swaps', 'Сопоставляем сложность O(n²)/O(n log n)', 'Сравниваем стабильность']);
export const blockSortDemo = () => scriptedSort('Блочная сортировка', [12, 5, 19, 3, 8, 14], ['Разбиваем на блоки', 'Сортируем блоки локально', 'Сливаем блоки']);
export const countingSortDemo = () => scriptedSort('Сортировка подсчётом', [4, 1, 3, 4, 2, 1], ['Заполняем count-массив', 'Префиксные суммы', 'Восстанавливаем выход']);
export const radixSortDemo = () => scriptedSort('Поразрядная сортировка', [329, 457, 657, 839, 436, 720], ['Сортируем по единицам', 'Сортируем по десяткам', 'Сортируем по сотням']);
