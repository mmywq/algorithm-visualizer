import { useEffect, useState } from 'react';
import { indexingDemo, queueArrayDemo, queueListDemo, stackArrayDemo, stackListDemo } from '@/algorithms/structures';
import { PlayerControls } from '@/components/player/PlayerControls';
import { StructureVisualizer } from '@/components/visualizers/structures/StructureVisualizer';
import { useAlgorithmPlayerStore } from '@/stores';
import type { AlgorithmFrame, StructureAlgorithmFrame } from '@/types';

type DemoKey = 'stack-array' | 'stack-list' | 'queue-array' | 'queue-list' | 'indexing';

const demoFactories: Record<DemoKey, () => Generator<StructureAlgorithmFrame, void, unknown>> = {
  'stack-array': () => stackArrayDemo({ values: [8, 3, 5, 1, 9] }),
  'stack-list': () => stackListDemo({ values: [8, 3, 5, 1, 9] }),
  'queue-array': () => queueArrayDemo({ values: [4, 7, 2, 6] }),
  'queue-list': () => queueListDemo({ values: [4, 7, 2, 6] }),
  indexing: () => indexingDemo({ values: [12, 7, 19, 25, 3] }),
};

const theoryByDemo: Record<DemoKey, { title: string; description: string; complexity: string }> = {
  'stack-array': {
    title: 'Стек на массиве',
    description: 'LIFO-структура: последний добавленный элемент извлекается первым. Операции идут через вершину стека.',
    complexity: 'push/pop: O(1)',
  },
  'stack-list': {
    title: 'Стек на списке',
    description: 'Стек можно хранить через голову списка: вставка и удаление выполняются у начала списка.',
    complexity: 'push/pop: O(1)',
  },
  'queue-array': {
    title: 'Очередь на массиве',
    description: 'FIFO-структура: первый пришёл — первый ушёл. Элементы добавляются в хвост, удаляются из головы.',
    complexity: 'enqueue/dequeue: O(1) амортизированно',
  },
  'queue-list': {
    title: 'Очередь на списке',
    description: 'Очередь на связном списке обычно держит ссылки на голову и хвост для быстрых операций.',
    complexity: 'enqueue/dequeue: O(1)',
  },
  indexing: {
    title: 'Индексирование массива',
    description: 'Индексирование — доступ к элементу по номеру ячейки. Это базовая операция массивов и таблиц.',
    complexity: 'доступ по индексу: O(1)',
  },
};

interface StructuresPageProps {
  readonly initialDemo?: DemoKey;
}

export function StructuresPage({ initialDemo = 'stack-array' }: StructuresPageProps) {
  const [demoKey, setDemoKey] = useState<DemoKey>(initialDemo);
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

  useEffect(() => {
    setDemoKey(initialDemo);
  }, [initialDemo]);

  useEffect(() => {
    loadAlgorithm(demoFactories[demoKey]());
  }, [demoKey, loadAlgorithm]);

  const frame = isStructureAlgorithmFrame(currentFrame) ? currentFrame : null;

  return (
    <div className="flex w-full flex-col gap-6">
      <section className="rounded-3xl border border-app bg-surface p-6">
        <h1 className="text-3xl font-bold text-app-primary">Базовые структуры данных</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="control-button" onClick={() => setDemoKey('stack-array')} type="button">Стек (массив)</button>
          <button className="control-button" onClick={() => setDemoKey('stack-list')} type="button">Стек (список)</button>
          <button className="control-button" onClick={() => setDemoKey('queue-array')} type="button">Очередь (массив)</button>
          <button className="control-button" onClick={() => setDemoKey('queue-list')} type="button">Очередь (список)</button>
          <button className="control-button" onClick={() => setDemoKey('indexing')} type="button">Индексирование</button>
        </div>

        <div className="mt-4 rounded-2xl border border-app bg-surface p-4 text-sm">
          <h2 className="text-lg font-semibold text-app-primary">{theoryByDemo[demoKey].title}</h2>
          <p className="mt-2 text-app-muted">{theoryByDemo[demoKey].description}</p>
          <p className="mt-2 text-app-muted">Сложность: {theoryByDemo[demoKey].complexity}</p>
          <p className="mt-2 text-app-muted">Пояснение шага: {frame?.description ?? frame?.message ?? 'Запустите плеер для пошагового разбора.'}</p>
        </div>
      </section>

      <StructureVisualizer frame={frame} />

      <PlayerControls
        canStepBackward={currentIndex > 0}
        canStepForward={status !== 'completed'}
        currentIndex={currentIndex}
        onNextStep={nextStep}
        onPause={pause}
        onPlay={play}
        onPrevStep={prevStep}
        onReset={() => loadAlgorithm(demoFactories[demoKey]())}
        onSpeedChange={setPlaybackSpeed}
        playbackSpeedMs={playbackSpeedMs}
        status={status}
        totalFrames={frames.length}
      />
    </div>
  );
}

const isStructureAlgorithmFrame = (
  frame: AlgorithmFrame<unknown, Record<string, unknown>> | null,
): frame is StructureAlgorithmFrame =>
  frame?.domain === 'array' &&
  typeof frame.data === 'object' &&
  frame.data !== null &&
  'cells' in frame.data;
