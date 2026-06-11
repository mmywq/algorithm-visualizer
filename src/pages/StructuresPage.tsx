import { useEffect, useMemo, useState } from 'react';
import { indexingDemo, queueArrayDequeueDemo, queueArrayEnqueueDemo, queueListDequeueDemo, queueListEnqueueDemo, stackArrayPopDemo, stackArrayPushDemo, stackListPopDemo, stackListPushDemo } from '@/algorithms/structures';
import { DataInputPanel } from '@/components/common/DataInputPanel';
import { ResultPanel } from '@/components/common/ResultPanel';
import { StepExplainPanel } from '@/components/common/StepExplainPanel';
import { TheoryPanel } from '@/components/common/TheoryPanel';
import { PlayerControls } from '@/components/player/PlayerControls';
import { StructureVisualizer } from '@/components/visualizers/structures/StructureVisualizer';
import { useAlgorithmPlayerStore } from '@/stores';
import type { AlgorithmFrame, PseudocodeLine, StructureAlgorithmFrame } from '@/types';
import { algorithmTheoryByRoute, fallbackTheory } from './theoryContent';

export type StructureKey = 'stack-array' | 'stack-list' | 'queue-array' | 'queue-list' | 'indexing';

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

interface StructuresPageProps {
  readonly structureKey?: StructureKey;
}

export function StructuresPage({ structureKey = 'stack-array' }: StructuresPageProps) {
  const config = structureConfigs[structureKey];
  const [operationKey, setOperationKey] = useState(config.operations[0]!.key);
  const [values, setValues] = useState<readonly number[]>([8, 3, 5, 1, 9]);

  const currentFrame = useAlgorithmPlayerStore((state) => state.currentFrame);
  const currentIndex = useAlgorithmPlayerStore((state) => state.currentIndex);
  const frames = useAlgorithmPlayerStore((state) => state.frames);
  const loadAlgorithm = useAlgorithmPlayerStore((state) => state.loadAlgorithm);
  const nextStep = useAlgorithmPlayerStore((state) => state.nextStep);
  const pause = useAlgorithmPlayerStore((state) => state.pause);
  const play = useAlgorithmPlayerStore((state) => state.play);
  const playbackSpeedMs = useAlgorithmPlayerStore((state) => state.playbackSpeedMs);
  const prevStep = useAlgorithmPlayerStore((state) => state.prevStep);
  const setPlaybackSpeed = useAlgorithmPlayerStore((state) => state.setPlaybackSpeed);
  const status = useAlgorithmPlayerStore((state) => state.status);

  const operation = config.operations.find((option) => option.key === operationKey) ?? config.operations[0]!;
  const theory = algorithmTheoryByRoute[config.theoryRoute] ?? fallbackTheory('structure');
  const frame = isStructureFrame(currentFrame) ? currentFrame : null;
  const stepsHistory = useMemo(() => frames.map((item) => item.description ?? item.message), [frames]);
  const isCompleted = status === 'completed';

  useEffect(() => {
    const generator = operation.run(values);
    const first = generator.next();
    if (first.done) {
      loadAlgorithm(generator);
    } else {
      loadAlgorithm(generator, { initialFrame: first.value });
    }
  }, [operation, loadAlgorithm, values]);

  const resetAlgorithm = (): void => {
    const generator = operation.run(values);
    const first = generator.next();
    if (first.done) {
      loadAlgorithm(generator);
    } else {
      loadAlgorithm(generator, { initialFrame: first.value });
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <section className="app-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-app-primary">{config.title}</h1>
            {theory.intro.length > 0 && (
              <p className="mt-3 max-w-4xl text-sm leading-6 text-app-muted">{theory.intro[0]}</p>
            )}
          </div>
          {config.operations.length > 1 && (
            <div className="flex shrink-0 flex-wrap gap-2">
              {config.operations.map((option) => (
                <button
                  className={option.key === operation.key ? 'control-button control-button-primary' : 'control-button'}
                  key={option.key}
                  onClick={() => setOperationKey(option.key)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <TheoryPanel theory={theory} />

      <DataInputPanel
        hint="Значения добавляются в структуру в порядке ввода слева направо."
        maxSize={8}
        minSize={2}
        onApply={setValues}
        storageKind="structure"
        values={values}
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <StructureVisualizer frame={frame} />
        <StepExplainPanel frame={frame} pseudocode={operation.pseudocode} />
      </section>

      <PlayerControls
        canStepBackward={currentIndex > 0}
        canStepForward={status !== 'completed'}
        currentIndex={currentIndex}
        onNextStep={nextStep}
        onPause={pause}
        onPlay={play}
        onPrevStep={prevStep}
        onReset={resetAlgorithm}
        onSpeedChange={setPlaybackSpeed}
        playbackSpeedMs={playbackSpeedMs}
        status={status}
        totalFrames={frames.length}
      />

      {isCompleted && <ResultPanel steps={stepsHistory} summary={frame?.description ?? frame?.message ?? null} />}
    </div>
  );
}

const isStructureFrame = (
  frame: AlgorithmFrame<unknown, Record<string, unknown>> | null,
): frame is StructureAlgorithmFrame =>
  (frame?.domain === 'array' || frame?.domain === 'tree') &&
  typeof frame.data === 'object' &&
  frame.data !== null &&
  'cells' in frame.data;
