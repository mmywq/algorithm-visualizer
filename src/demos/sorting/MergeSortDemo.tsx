import { mergeSort } from '@/algorithms/arrays';
import { MergeDivideMap } from '@/components/visualizers/arrays/MergeDivideMap';
import { ArrayAlgorithmDemo } from '@/demos/shared/ArrayAlgorithmDemo';
import { mergePseudocode } from './pseudocode';

export default function MergeSortDemo() {
  return (
    <ArrayAlgorithmDemo
      below={(values) => <MergeDivideMap values={values} />}
      defaultValues={[42, 18, 64, 9, 73, 31, 55, 27]}
      input={{ maxSize: 24 }}
      pseudocode={mergePseudocode}
      run={mergeSort}
    />
  );
}
