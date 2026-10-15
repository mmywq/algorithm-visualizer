import { radixSortDemo } from '@/algorithms/sorting/extra';
import sortingTheory from '@/content/theory/sorting';
import { ArrayAlgorithmDemo } from '@/demos/shared/ArrayAlgorithmDemo';

const run = (values: readonly number[]) => radixSortDemo(values);

export default function RadixSortDemo() {
  return (
    <ArrayAlgorithmDemo
      defaultValues={[329, 457, 657, 839, 436, 720, 355]}
      input={{ minValue: -999, maxValue: 999 }}
      pseudocode={sortingTheory['radix-sort']?.pseudocode ?? []}
      run={run}
    />
  );
}
