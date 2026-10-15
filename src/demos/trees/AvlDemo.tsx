import { balancedBstScenario } from '@/algorithms/structures/extendedStructures';
import treesTheory from '@/content/theory/trees';
import { KeyedStructureDemo } from '@/demos/shared/KeyedStructureDemo';

const build = (values: readonly number[]) => balancedBstScenario(values);

export default function AvlDemo() {
  return (
    <KeyedStructureDemo
      build={build}
      defaultValues={[10, 20, 30, 40, 50, 60, 70]}
      keyHint="Возрастающая последовательность вырождает обычное дерево в цепочку — здесь видно, как повороты это исправляют."
      pseudocode={treesTheory.avl?.pseudocode ?? []}
    />
  );
}
