import { binomialHeapScenario, heapExtractMinScenario, heapScenario } from '@/algorithms/structures/extendedStructures';
import heapsTheory from '@/content/theory/heaps';
import { KeyedStructureDemo } from '@/demos/shared/KeyedStructureDemo';

const buildHeap = (values: readonly number[]) => heapScenario(values);
const buildBinomial = (values: readonly number[]) => binomialHeapScenario(values);

export function BinaryHeapDemo() {
  return (
    <KeyedStructureDemo
      actions={[{ key: 'extract', label: 'Извлечь минимум', needsKey: false, run: (values) => heapExtractMinScenario(values) }]}
      build={buildHeap}
      buildLabel="Вставка ключей"
      defaultValues={[40, 15, 60, 5, 30, 55]}
      input={{ unique: false, maxSize: 15 }}
      pseudocode={heapsTheory['binary-heap']?.pseudocode ?? []}
    />
  );
}

export function BinomialHeapDemo() {
  return (
    <KeyedStructureDemo
      build={buildBinomial}
      defaultValues={[18, 7, 24, 3, 12, 30]}
      input={{ unique: false, maxSize: 15 }}
      pseudocode={heapsTheory['binomial-heap']?.pseudocode ?? []}
    />
  );
}
