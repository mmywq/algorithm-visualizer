import { deleteKey, pushBack, pushFront, reverseList } from '@/algorithms/structures/linkedList';
import { LinkedListDiagram, linkedListLegend } from '@/components/visualizers/structures/LinkedListDiagram';
import { Tabs } from '@/components/ui/Tabs';
import { DemoLayout } from '@/features/demo/DemoLayout';
import { KeyField } from '@/features/demo/KeyField';
import { NumbersInput } from '@/features/demo/NumbersInput';
import { useDemoPlayer } from '@/features/player/useDemoPlayer';
import { useFrames } from '@/features/player/usePlayer';
import { enumCodec, intCodec, numbersCodec, useUrlState } from '@/hooks/useUrlState';
import type { LinkedListFrame, PseudocodeLine } from '@/types';

type Operation = 'push-front' | 'push-back' | 'delete' | 'reverse';

interface OperationConfig {
  readonly label: string;
  readonly keyLabel?: string;
  readonly submitLabel?: string;
  readonly run: (values: readonly number[], key: number) => Generator<LinkedListFrame, void, unknown>;
  readonly pseudocode: readonly PseudocodeLine[];
}

const operations: Record<Operation, OperationConfig> = {
  'push-front': {
    label: 'В начало',
    keyLabel: 'Значение',
    submitLabel: 'Вставить',
    run: pushFront,
    pseudocode: [
      { code: 'node ← новый узел(x)', note: 'Узел хранит значение и ссылку next.' },
      { code: 'node.next ← head', note: 'Новый узел указывает на прежнее начало.' },
      { code: 'head ← node', note: 'Начало списка переезжает на новый узел — O(1).' },
    ],
  },
  'push-back': {
    label: 'В конец',
    keyLabel: 'Значение',
    submitLabel: 'Вставить',
    run: pushBack,
    pseudocode: [
      { code: 'node ← новый узел(x), node.next ← ∅', note: 'Новый узел станет последним.' },
      { code: 'если head = ∅ — head ← node, конец', note: 'Пустой список — узел сразу становится головой.' },
      { code: 'curr ← head', note: 'Указателя на хвост нет, ищем его от начала.' },
      { code: 'пока curr.next ≠ ∅: curr ← curr.next', note: 'Проходим весь список — O(n).' },
      { code: 'curr.next ← node', note: 'Прицепляем новый узел к последнему.' },
    ],
  },
  delete: {
    label: 'Удаление',
    keyLabel: 'Ключ',
    submitLabel: 'Удалить',
    run: deleteKey,
    pseudocode: [
      { code: 'если head.value = x — head ← head.next', note: 'Удаление головы — особый случай без prev.' },
      { code: 'prev ← head, curr ← head.next', note: 'Держим ссылку на узел перед текущим.' },
      { code: 'пока curr ≠ ∅ и curr.value ≠ x: prev ← curr, curr ← curr.next', note: 'Ищем узел с ключом.' },
      { code: 'если curr = ∅ — ключа нет', note: 'Список не меняется.' },
      { code: 'prev.next ← curr.next', note: 'Ссылка идёт в обход удаляемого узла.' },
      { code: 'освободить curr', note: 'Узел больше не достижим от head.' },
    ],
  },
  reverse: {
    label: 'Разворот',
    run: (values) => reverseList(values),
    pseudocode: [
      { code: 'prev ← ∅, curr ← head', note: 'Развёрнутая часть пока пуста.' },
      { code: 'пока curr ≠ ∅', note: 'Обрабатываем узлы по одному.' },
      { code: 'next ← curr.next', note: 'Запоминаем продолжение списка.' },
      { code: 'curr.next ← prev', note: 'Разворачиваем ссылку текущего узла.' },
      { code: 'prev ← curr, curr ← next', note: 'Сдвигаем оба указателя вперёд.' },
      { code: 'head ← prev', note: 'Последний узел стал первым.' },
    ],
  },
};

const OPERATION_KEYS = Object.keys(operations) as Operation[];
const DEFAULT_VALUES = [8, 3, 5, 1, 9];

export default function LinkedListDemo() {
  const [values, setValues] = useUrlState('in', DEFAULT_VALUES, numbersCodec({ min: -99, max: 99, maxCount: 7 }));
  const [operationKey, setOperationKey] = useUrlState<Operation>('op', 'reverse', enumCodec(OPERATION_KEYS));
  const [key, setKey] = useUrlState('k', 7, intCodec(-99, 99));
  const operation = operations[operationKey];
  const frameSet = useFrames(() => operation.run(values, key), [operation, values, key]);
  const player = useDemoPlayer(frameSet);

  return (
    <DemoLayout
      data={{
        summary: `[${values.join(', ')}]`,
        editor: <NumbersInput hint="Узлы связываются в порядке ввода: первый — голова списка." maxSize={7} minSize={1} onApply={setValues} value={values} />,
      }}
      legend={linkedListLegend}
      player={player}
      pseudocode={operation.pseudocode}
      resultInput={`[${values.join(', ')}]${operation.keyLabel === undefined ? '' : `, ${operation.keyLabel.toLowerCase()} ${key}`}`}
      stage={<LinkedListDiagram frame={player.frame} />}
      toolbar={
        <div className="flex w-full flex-wrap items-center gap-2.5 lg:w-auto">
          <div className="max-w-full overflow-x-auto scrollbar-none">
            <Tabs
              ariaLabel="Операция"
              items={OPERATION_KEYS.map((value) => ({ value, label: operations[value].label }))}
              onChange={(value) => setOperationKey(value as Operation)}
              size="sm"
              value={operationKey}
            />
          </div>
          {operation.keyLabel !== undefined && (
            <KeyField label={operation.keyLabel} max={99} min={-99} onApply={setKey} submitLabel={operation.submitLabel ?? 'Показать'} value={key} />
          )}
        </div>
      }
    />
  );
}
