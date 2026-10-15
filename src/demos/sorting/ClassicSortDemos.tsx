import { heapSort, insertionSort, quickSort, selectionSort, shellSort } from '@/algorithms/arrays/classicSorts';
import { arrayLegend } from '@/components/visualizers/arrays/ArrayBars';
import { nodesFromHeapCells, TreeDiagram } from '@/components/visualizers/structures/TreeDiagram';
import { Window } from '@/components/ui/Window';
import theory from '@/content/theory/sorting';
import { ArrayAlgorithmDemo } from '@/demos/shared/ArrayAlgorithmDemo';
import type { LegendItem } from '@/features/demo/Legend';
import type { ArrayAlgorithmFrame } from '@/types';

const DEFAULT = [42, 18, 64, 9, 73, 31, 55, 27];
const pivotLegend: readonly LegendItem[] = [...arrayLegend, { color: 'rgb(var(--c-purple))', label: 'ключ или опорный' }];

const insertionRun = (values: readonly number[]) => insertionSort(values);
const selectionRun = (values: readonly number[]) => selectionSort(values);
const shellRun = (values: readonly number[]) => shellSort(values);
const quickRun = (values: readonly number[]) => quickSort(values);
const heapRun = (values: readonly number[]) => heapSort(values);

export const InsertionSortDemo = () => (
  <ArrayAlgorithmDemo defaultValues={DEFAULT} legend={pivotLegend} pseudocode={theory['insertion-sort']!.pseudocode} run={insertionRun} />
);
export const SelectionSortDemo = () => (
  <ArrayAlgorithmDemo defaultValues={DEFAULT} legend={pivotLegend} pseudocode={theory['selection-sort']!.pseudocode} run={selectionRun} />
);
export const ShellSortDemo = () => (
  <ArrayAlgorithmDemo defaultValues={[35, 33, 42, 10, 14, 19, 27, 44, 26, 31]} pseudocode={theory['shell-sort']!.pseudocode} run={shellRun} />
);
export const QuickSortDemo = () => (
  <ArrayAlgorithmDemo defaultValues={DEFAULT} legend={pivotLegend} pseudocode={theory['quick-sort']!.pseudocode} run={quickRun} />
);

/** Пирамидальная сортировка: рядом с массивом — та же куча в виде дерева. */
function HeapTree({ frame }: { readonly frame: ArrayAlgorithmFrame | null }) {
  if (frame === null) return null;
  const size = frame.meta.heapSize ?? frame.data.length;
  const cells = frame.data.slice(0, size).map((item) => ({ value: item.value }));
  const active = new Set([...(frame.meta.comparingIndices ?? []), ...(frame.meta.swappingIndices ?? [])]);
  const nodes = nodesFromHeapCells(cells, (index) => (frame.meta.swappingIndices?.includes(index) === true ? 'new' : active.has(index) ? 'active' : 'idle'));
  return (
    <Window bodyClassName="p-3" color="orange" title={`Куча · ${size} эл.`}>
      <TreeDiagram emptyText="Куча пуста — всё отсортировано" minHeight={200} nodes={nodes} radius={18} />
    </Window>
  );
}

export const HeapSortDemo = () => (
  <ArrayAlgorithmDemo
    companion={(frame) => <HeapTree frame={frame} />}
    defaultValues={[4, 10, 3, 5, 1, 8, 7, 2]}
    pseudocode={theory['heap-sort']!.pseudocode}
    run={heapRun}
  />
);
