import { useMemo } from 'react';
import { bstDeleteScenario, traversalNames, traversalScenario, type TraversalOrder } from '@/algorithms/trees/bst';
import { buildBst, type MutableNode } from '@/algorithms/trees/treeFrames';
import { treeLegend } from '@/components/visualizers/structures/TreeDiagram';
import { Tabs } from '@/components/ui/Tabs';
import theory from '@/content/theory/trees';
import { TreeStage } from '@/demos/shared/TreeAlgorithmDemo';
import { DemoLayout } from '@/features/demo/DemoLayout';
import { KeyField } from '@/features/demo/KeyField';
import { NumbersInput } from '@/features/demo/NumbersInput';
import { useDemoPlayer } from '@/features/player/useDemoPlayer';
import { useFrames } from '@/features/player/usePlayer';
import { enumCodec, intCodec, numbersCodec, useUrlState } from '@/hooks/useUrlState';
import type { PseudocodeLine } from '@/types';

const DEFAULT_TREE = [50, 30, 70, 20, 40, 60, 80, 35, 65];
const treeCodec = numbersCodec({ min: -99, max: 99, maxCount: 15 });

const recursivePseudocode = (visit: string): readonly PseudocodeLine[] => [
  { code: 'обход(узел): если узел пуст — вернуться', note: 'Пустое поддерево — база рекурсии.' },
  { code: 'войти в узел: новый кадр в стеке вызовов', note: 'Стек хранит путь от корня до текущего узла.' },
  { code: visit, note: 'Отличие трёх обходов — только в том, когда посещается сам узел.' },
  { code: 'выйти из узла и вернуться к родителю', note: 'Кадр снимается со стека.' },
  { code: 'все узлы посещены', note: 'Каждый узел — ровно один раз: O(n).' },
];

const traversalPseudocode: Record<TraversalOrder, readonly PseudocodeLine[]> = {
  preorder: recursivePseudocode('посетить узел, затем обход(left), обход(right)'),
  inorder: recursivePseudocode('обход(left), посетить узел, обход(right)'),
  postorder: recursivePseudocode('обход(left), обход(right), посетить узел'),
  level: [
    { code: 'очередь ← [корень]', note: 'Обход в ширину начинается с корня.' },
    { code: 'пока очередь не пуста: узел ← извлечь из начала', note: 'Первым выходит тот, кто раньше встал в очередь.' },
    { code: 'посетить узел, добавить его детей в конец очереди', note: 'Сначала левого, потом правого.' },
    { code: 'узлы одного уровня идут в очереди подряд', note: 'Поэтому уровни выводятся сверху вниз.' },
    { code: 'очередь пуста — обход завершён', note: 'Каждый узел — ровно один раз: O(n).' },
  ],
};

const ORDERS: readonly TraversalOrder[] = ['preorder', 'inorder', 'postorder', 'level'];
const orderTabs: Record<TraversalOrder, string> = { preorder: 'Прямой', inorder: 'Симметричный', postorder: 'Обратный', level: 'По уровням' };

const treeEditor = (values: readonly number[], onApply: (values: readonly number[]) => void, hint: string) => (
  <NumbersInput hint={hint} maxSize={15} onApply={onApply} scenarios unique value={values} />
);

export function TraversalsDemo() {
  const [values, setValues] = useUrlState('in', DEFAULT_TREE, treeCodec);
  const [order, setOrder] = useUrlState<TraversalOrder>('op', 'inorder', enumCodec(ORDERS));
  const frameSet = useFrames(() => traversalScenario(values, order), [values, order]);
  const player = useDemoPlayer(frameSet);

  return (
    <DemoLayout
      data={{ summary: `[${values.join(', ')}]`, editor: treeEditor(values, setValues, 'Ключи вставляются в дерево поиска слева направо.') }}
      legend={treeLegend}
      player={player}
      pseudocode={traversalPseudocode[order]}
      resultInput={`[${values.join(', ')}], обход: ${traversalNames[order].toLowerCase()}`}
      stage={<TreeStage frame={player.frame} />}
      toolbar={
        <div className="max-w-full overflow-x-auto scrollbar-none">
          <Tabs
            ariaLabel="Порядок обхода"
            items={ORDERS.map((value) => ({ value, label: orderTabs[value] }))}
            onChange={(value) => setOrder(value as TraversalOrder)}
            size="sm"
            value={order}
          />
        </div>
      }
    />
  );
}

type DeleteCase = 'leaf' | 'one' | 'two';

/** Первый по возрастанию ключ каждого из трёх случаев удаления — для кнопок быстрого выбора. */
const caseKeys = (values: readonly number[]): Record<DeleteCase, number | null> => {
  const result: Record<DeleteCase, number | null> = { leaf: null, one: null, two: null };
  const visit = (node: MutableNode | null): void => {
    if (node === null) return;
    visit(node.left);
    const children = (node.left === null ? 0 : 1) + (node.right === null ? 0 : 1);
    const kind: DeleteCase = children === 0 ? 'leaf' : children === 1 ? 'one' : 'two';
    result[kind] ??= node.value;
    visit(node.right);
  };
  visit(buildBst(values));
  return result;
};

const caseLabels: Record<DeleteCase, string> = { leaf: 'Лист', one: 'Один ребёнок', two: 'Два ребёнка' };

export function BstDeleteDemo() {
  const [values, setValues] = useUrlState('in', DEFAULT_TREE, treeCodec);
  const [key, setKey] = useUrlState('k', 30, intCodec(-99, 99));
  const frameSet = useFrames(() => bstDeleteScenario(values, key), [values, key]);
  const player = useDemoPlayer(frameSet);
  const cases = useMemo(() => caseKeys(values), [values]);

  return (
    <DemoLayout
      data={{
        summary: `[${values.join(', ')}]`,
        editor: treeEditor(values, setValues, 'Сначала из ключей строится дерево поиска, затем из него удаляется выбранный ключ.'),
      }}
      legend={treeLegend}
      player={player}
      pseudocode={theory['bst-delete']!.pseudocode}
      resultInput={`[${values.join(', ')}], удалить ${key}`}
      stage={<TreeStage frame={player.frame} />}
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
          <KeyField max={99} min={-99} onApply={setKey} submitLabel="Удалить" value={key} />
          {(Object.keys(caseLabels) as DeleteCase[]).map((kind) => (
            <button
              aria-pressed={cases[kind] === key}
              className={`btn btn-sm ${cases[kind] === key ? 'btn-primary' : 'btn-secondary'}`}
              disabled={cases[kind] === null}
              key={kind}
              onClick={() => cases[kind] !== null && setKey(cases[kind])}
              title={cases[kind] === null ? 'В этом дереве нет узла такого вида' : `Удалить ${cases[kind]}`}
              type="button"
            >
              {caseLabels[kind]}
            </button>
          ))}
        </div>
      }
    />
  );
}
