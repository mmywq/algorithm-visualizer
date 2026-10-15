import { countingSortDemo } from '@/algorithms/sorting/extra';
import sortingTheory from '@/content/theory/sorting';
import { ArrayAlgorithmDemo } from '@/demos/shared/ArrayAlgorithmDemo';

const run = (values: readonly number[]) => countingSortDemo(values);

export default function CountingSortDemo() {
  return (
    <ArrayAlgorithmDemo
      defaultValues={[4, 1, 3, 4, 2, 1, 0, 3]}
      input={{ minValue: -20, maxValue: 20, hint: 'Узкий диапазон значений — сильная сторона подсчёта.' }}
      pseudocode={sortingTheory['counting-sort']?.pseudocode ?? []}
      run={run}
    />
  );
}
