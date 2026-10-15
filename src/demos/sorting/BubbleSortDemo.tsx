import { bubbleSort } from '@/algorithms/arrays';
import { ArrayAlgorithmDemo } from '@/demos/shared/ArrayAlgorithmDemo';
import { bubblePseudocode } from './pseudocode';

export default function BubbleSortDemo() {
  return <ArrayAlgorithmDemo defaultValues={[42, 18, 64, 9, 73, 31, 55, 27]} pseudocode={bubblePseudocode} run={bubbleSort} />;
}
