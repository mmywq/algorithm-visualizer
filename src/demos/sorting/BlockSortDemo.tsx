import { blockSortDemo } from '@/algorithms/sorting/extra';
import sortingTheory from '@/content/theory/sorting';
import { ArrayAlgorithmDemo } from '@/demos/shared/ArrayAlgorithmDemo';

const run = (values: readonly number[]) => blockSortDemo(values);

export default function BlockSortDemo() {
  return <ArrayAlgorithmDemo defaultValues={[12, 5, 19, 3, 8, 14, 7, 1]} pseudocode={sortingTheory['block-sort']?.pseudocode ?? []} run={run} />;
}
