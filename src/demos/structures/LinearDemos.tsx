import { useMemo } from 'react';
import {
  indexingDemo,
  queueArrayDequeueDemo,
  queueArrayEnqueueDemo,
  queueListDequeueDemo,
  queueListEnqueueDemo,
  stackArrayPopDemo,
  stackArrayPushDemo,
  stackListPopDemo,
  stackListPushDemo,
} from '@/algorithms/structures';
import { StructureVisualizer, structureLegend } from '@/components/visualizers/structures/StructureVisualizer';
import { Tabs } from '@/components/ui/Tabs';
import { DemoLayout } from '@/features/demo/DemoLayout';
import { NumbersInput } from '@/features/demo/NumbersInput';
import { useDemoPlayer } from '@/features/player/useDemoPlayer';
import { useFrames } from '@/features/player/usePlayer';
import { numbersCodec, stringCodec, useUrlState } from '@/hooks/useUrlState';
import type { PseudocodeLine, StructureAlgorithmFrame } from '@/types';

type StructureKey = 'stack-array' | 'stack-list' | 'queue-array' | 'queue-list' | 'indexing';

interface StructureOperation {
  readonly key: string;
  readonly label: string;
  readonly run: (values: readonly number[]) => Generator<StructureAlgorithmFrame, void, unknown>;
  readonly pseudocode: readonly PseudocodeLine[];
}

interface StructureConfig {
  readonly title: string;
  readonly theoryRoute: string;
  readonly operations: readonly StructureOperation[];
}

const structureConfigs: Record<StructureKey, StructureConfig> = {
  'stack-array': {
    title: 'Стек: реализация на массиве',
    theoryRoute: '/structures/stack-array',
    operations: [
      {
        key: 'push',
        label: 'push — добавление',
        run: (values) => stackArrayPushDemo({ values }),
        pseudocode: [
          { code: 'создать массив и установить top = −1', note: 'top = −1 означает, что стек пуст: вершины ещё нет.' },
          { code: 'push: увеличить top на 1', note: 'top переходит на свободную ячейку — место для нового элемента.' },
          { code: 'записать значение в a[top]', note: 'Записанный элемент становится вершиной стека.' },
          { code: 'повторять, пока есть значения для добавления', note: 'Каждый следующий push кладёт элемент поверх предыдущего.' },
        ],
      },
      {
        key: 'pop',
        label: 'pop — удаление',
        run: (values) => stackArrayPopDemo({ values }),
        pseudocode: [
          { code: 'проверить, что top ≠ −1', note: 'При top = −1 стек пуст — удалять нечего.' },
          { code: 'pop: прочитать значение a[top]', note: 'Читается вершина — элемент, добавленный последним (правило LIFO).' },
          { code: 'очистить ячейку и уменьшить top на 1', note: 'Вершиной становится предыдущий элемент.' },
          { code: 'повторять, пока стек не опустеет', note: 'Элементы извлекаются в порядке, обратном добавлению.' },
        ],
      },
    ],
  },
  'stack-list': {
    title: 'Стек: реализация на связном списке',
    theoryRoute: '/structures/stack-list',
    operations: [
      {
        key: 'push',
        label: 'push — добавление',
        run: (values) => stackListPushDemo({ values }),
        pseudocode: [
          { code: 'head указывает на вершину стека или пуст', note: 'Голова списка head и есть вершина связного стека.' },
          { code: 'push: создать узел со ссылкой на прежний head', note: 'Новый узел хранит значение и ссылку на прежнюю вершину.' },
          { code: 'назначить новый узел головой head', note: 'Новый узел становится вершиной; прежняя вершина — под ним.' },
          { code: 'повторять для всех значений', note: 'Список растёт с головы, по одному узлу на push.' },
        ],
      },
      {
        key: 'pop',
        label: 'pop — удаление',
        run: (values) => stackListPopDemo({ values }),
        pseudocode: [
          { code: 'head указывает на вершину стека', note: 'Если head пуст, стек пуст и pop невозможен.' },
          { code: 'pop: прочитать значение узла head', note: 'Читается вершина — последний добавленный узел.' },
          { code: 'переставить head на следующий узел', note: 'Удалённый узел исключается из списка; вершиной становится следующий.' },
          { code: 'повторять, пока список не опустеет', note: 'Когда head пуст, стек пуст.' },
        ],
      },
    ],
  },
  'queue-array': {
    title: 'Очередь: реализация на массиве',
    theoryRoute: '/structures/queue-array',
    operations: [
      {
        key: 'enqueue',
        label: 'enqueue — добавление',
        run: (values) => queueArrayEnqueueDemo({ values }),
        pseudocode: [
          { code: 'установить head = 0 и tail = 0', note: 'Равенство head и tail означает, что очередь пуста.' },
          { code: 'enqueue: проверить свободную позицию tail', note: 'tail всегда указывает на место для следующей вставки.' },
          { code: 'записать значение в a[tail]', note: 'Элемент становится последним в очереди.' },
          { code: 'увеличить tail на 1', note: 'Хвост сдвигается; элементы занимают полуинтервал [head, tail).' },
          { code: 'повторять, пока есть значения', note: 'Голова head при добавлении не меняется.' },
        ],
      },
      {
        key: 'dequeue',
        label: 'dequeue — удаление',
        run: (values) => queueArrayDequeueDemo({ values }),
        pseudocode: [
          { code: 'head = 0, tail = число элементов', note: 'head указывает на самый ранний элемент очереди.' },
          { code: 'dequeue: прочитать значение a[head]', note: 'Удаляется элемент, добавленный раньше всех (правило FIFO).' },
          { code: 'очистить ячейку и увеличить head на 1', note: 'Головой становится следующий по порядку элемент.' },
          { code: 'повторять, пока head < tail', note: 'При head = tail очередь пуста.' },
        ],
      },
    ],
  },
  'queue-list': {
    title: 'Очередь: реализация на связном списке',
    theoryRoute: '/structures/queue-list',
    operations: [
      {
        key: 'enqueue',
        label: 'enqueue — добавление',
        run: (values) => queueListEnqueueDemo({ values }),
        pseudocode: [
          { code: 'head — первый узел, tail — последний', note: 'У пустой очереди обе ссылки пусты.' },
          { code: 'enqueue: создать новый узел', note: 'Узел хранит значение и пустую ссылку на следующий.' },
          { code: 'присоединить узел после tail и обновить tail', note: 'Благодаря ссылке tail вставка в конец не требует прохода по списку.' },
          { code: 'повторять для всех значений', note: 'head при добавлении не меняется.' },
        ],
      },
      {
        key: 'dequeue',
        label: 'dequeue — удаление',
        run: (values) => queueListDequeueDemo({ values }),
        pseudocode: [
          { code: 'head — первый узел, tail — последний', note: 'Удаление всегда выполняется из головы.' },
          { code: 'dequeue: прочитать значение узла head', note: 'Это самый ранний из оставшихся элементов (правило FIFO).' },
          { code: 'переставить head на следующий узел', note: 'После удаления последнего узла head и tail сбрасываются.' },
          { code: 'повторять, пока очередь не опустеет', note: 'Элементы покидают очередь в порядке поступления.' },
        ],
      },
    ],
  },
  indexing: {
    title: 'Индексирование массива',
    theoryRoute: '/structures/indexing',
    operations: [
      {
        key: 'index',
        label: 'доступ по индексу',
        run: (values) => indexingDemo({ values }),
        pseudocode: [
          { code: 'массив хранит элементы в последовательных ячейках', note: 'Адрес a[i] = базовый адрес + i × размер элемента.' },
          { code: 'прочитать значение a[i] по индексу i', note: 'Одно вычисление адреса и одно чтение памяти — O(1).' },
          { code: 'перейти к следующему индексу', note: 'Последовательный просмотр всех ячеек стоит O(n).' },
          { code: 'завершить после просмотра всех позиций', note: 'Допустимые индексы — от 0 до n − 1.' },
        ],
      },
    ],
  },
};

const DEFAULT_VALUES = [8, 3, 5, 1, 9];

function LinearStructureDemo({ structure }: { readonly structure: StructureKey }) {
  const config = structureConfigs[structure];
  const [values, setValues] = useUrlState('in', DEFAULT_VALUES, numbersCodec({ min: -99, max: 99, maxCount: 8 }));
  const [operationKey, setOperationKey] = useUrlState('op', config.operations[0]!.key, stringCodec(16));
  const operation = config.operations.find((item) => item.key === operationKey) ?? config.operations[0]!;
  const frameSet = useFrames(() => operation.run(values), [operation, values]);
  const player = useDemoPlayer(frameSet);
  const legend = useMemo(() => structureLegend(frameSet.frames[0] ?? null), [frameSet]);

  return (
    <DemoLayout
      data={{
        summary: `[${values.join(', ')}]`,
        editor: <NumbersInput hint="Значения поступают в структуру слева направо." maxSize={8} onApply={setValues} value={values} />,
      }}
      legend={legend}
      player={player}
      pseudocode={operation.pseudocode}
      resultInput={`[${values.join(', ')}]`}
      stage={<StructureVisualizer frame={player.frame} />}
      toolbar={
        config.operations.length > 1 ? (
          <Tabs
            ariaLabel="Операция"
            items={config.operations.map((item) => ({ value: item.key, label: item.label }))}
            onChange={setOperationKey}
            size="sm"
            value={operation.key}
          />
        ) : undefined
      }
    />
  );
}

export const StackArrayDemo = () => <LinearStructureDemo structure="stack-array" />;
export const StackListDemo = () => <LinearStructureDemo structure="stack-list" />;
export const QueueArrayDemo = () => <LinearStructureDemo structure="queue-array" />;
export const QueueListDemo = () => <LinearStructureDemo structure="queue-list" />;
export const IndexingDemo = () => <LinearStructureDemo structure="indexing" />;
