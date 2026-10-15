import { bstBuildScenario, bstSearchNodeScenario } from '@/algorithms/trees/bst';
import treesTheory from '@/content/theory/trees';
import { TreeAlgorithmDemo } from '@/demos/shared/TreeAlgorithmDemo';
import type { PseudocodeLine } from '@/types';

const searchPseudocode: readonly PseudocodeLine[] = [
  { code: 'начать с корня: current ← root', note: 'Поиск всегда идёт сверху вниз по одному пути.' },
  { code: 'сравнить ключ со значением current' },
  { code: 'если ключ меньше — перейти влево, иначе — вправо', note: 'Каждое сравнение отбрасывает целое поддерево.' },
  { code: 'если current пуст — ключа в дереве нет', note: 'Пустое место означает, что ключ отсутствует.' },
  { code: 'если значения равны — ключ найден', note: 'Число сравнений равно глубине узла плюс один.' },
];

export default function BstDemo() {
  return (
    <TreeAlgorithmDemo
      actions={[
        { key: 'search', label: 'Поиск ключа', needsKey: true, run: (values, target) => bstSearchNodeScenario(values, target), pseudocode: searchPseudocode },
      ]}
      build={bstBuildScenario}
      defaultTarget={60}
      defaultValues={[50, 30, 70, 20, 40, 60, 80]}
      keyHint="Попробуйте ввести возрастающую последовательность — дерево выродится в цепочку."
      pseudocode={treesTheory.bst?.pseudocode ?? []}
    />
  );
}
