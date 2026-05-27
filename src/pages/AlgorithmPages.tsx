import { useEffect } from 'react';
import { compareSortsDemo, blockSortDemo, countingSortDemo, radixSortDemo } from '@/algorithms/sorting/extra';
import { connectedComponentsDemo, dijkstraDemo, mstDemo } from '@/algorithms/graphs';
import { balancedBstScenario, binomialHeapScenario, bstScenario, hashBlockScenario, hashClosedScenario, hashOpenScenario, heapScenario } from '@/algorithms/structures/extendedStructures';
import { PlayerControls } from '@/components/player/PlayerControls';
import { StepTutorPanel } from '@/components/player/StepTutorPanel';
import { ArrayVisualizer } from '@/components/visualizers/arrays/ArrayVisualizer';
import { GraphVisualizer } from '@/components/visualizers/graphs/GraphVisualizer';
import { StructureVisualizer } from '@/components/visualizers/structures/StructureVisualizer';
import { useAlgorithmPlayerStore } from '@/stores';
import type { AlgorithmFrame, ArrayAlgorithmFrame, GraphAlgorithmFrame, StructureAlgorithmFrame } from '@/types';

type Mode = 'array' | 'graph' | 'structure';

interface AlgorithmPageProps {
  readonly title: string;
  readonly mode: Mode;
  readonly generatorFactory: () => Generator<AlgorithmFrame<unknown, Record<string, unknown>>, void, unknown>;
}

export function AlgorithmPage({ title, mode, generatorFactory }: AlgorithmPageProps) {
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
    loadAlgorithm(generatorFactory());
  }, [generatorFactory, loadAlgorithm]);

  const frame = currentFrame;

  return (
    <div className="flex w-full flex-col gap-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <h1 className="text-3xl font-bold text-white">{title}</h1>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div>
          {mode === 'array' && <ArrayVisualizer frame={isArrayFrame(frame) ? frame : null} />}
          {mode === 'graph' && <GraphVisualizer frame={isGraphFrame(frame) ? frame : null} graph={isGraphFrame(frame) ? frame.data : { nodes: [], edges: [] }} />}
          {mode === 'structure' && <StructureVisualizer frame={isStructureFrame(frame) ? frame : null} />}
        </div>
        <StepTutorPanel
          complexity={mode === 'array' ? 'O(n log n) / зависит от алгоритма' : mode === 'graph' ? 'O(V + E) / зависит от алгоритма' : 'O(log n) / зависит от операции'}
          frame={frame}
          title="Пошаговое объяснение текущего алгоритма"
          useCases={
            mode === 'array'
              ? ['Сортировка данных', 'Подготовка к бинарному поиску']
              : mode === 'graph'
                ? ['Поиск путей', 'Анализ сетевых структур']
                : ['Моделирование памяти', 'Изучение операций push/pop/enqueue/dequeue']
          }
        />
      </section>

      <PlayerControls
        canStepBackward={currentIndex > 0}
        canStepForward={status !== 'completed'}
        currentIndex={currentIndex}
        onNextStep={nextStep}
        onPause={pause}
        onPlay={play}
        onPrevStep={prevStep}
        onReset={() => loadAlgorithm(generatorFactory())}
        onSpeedChange={setPlaybackSpeed}
        playbackSpeedMs={playbackSpeedMs}
        status={status}
        totalFrames={frames.length}
      />
    </div>
  );
}

const isArrayFrame = (frame: AlgorithmFrame<unknown, Record<string, unknown>> | null): frame is ArrayAlgorithmFrame => frame?.domain === 'array' && Array.isArray(frame.data) && frame.data.every((item) => typeof item === 'object' && item !== null && 'value' in item);
const isGraphFrame = (frame: AlgorithmFrame<unknown, Record<string, unknown>> | null): frame is GraphAlgorithmFrame => frame?.domain === 'graph';
const isStructureFrame = (frame: AlgorithmFrame<unknown, Record<string, unknown>> | null): frame is StructureAlgorithmFrame => frame?.domain === 'array' && typeof frame.data === 'object' && frame.data !== null && 'cells' in frame.data;

export const algorithmRouteRegistry = {
  '/trees/bst': { title: 'Двоичное дерево поиска', mode: 'structure' as const, generatorFactory: bstScenario },
  '/trees/balanced-bst': { title: 'Сбалансированное двоичное дерево поиска', mode: 'structure' as const, generatorFactory: balancedBstScenario },
  '/hash/open-chaining': { title: 'Открытые хеш-таблицы (закрытая адресация)', mode: 'structure' as const, generatorFactory: hashOpenScenario },
  '/hash/open-addressing': { title: 'Закрытые хеш-таблицы (открытая адресация)', mode: 'structure' as const, generatorFactory: hashClosedScenario },
  '/hash/block-addressing': { title: 'Закрытые хеш-таблицы (с использованием блоков)', mode: 'structure' as const, generatorFactory: hashBlockScenario },
  '/heaps/heap': { title: 'Куча', mode: 'structure' as const, generatorFactory: heapScenario },
  '/heaps/binomial': { title: 'Биномиальная куча', mode: 'structure' as const, generatorFactory: binomialHeapScenario },
  '/sorting/compare': { title: 'Сравнение 6 сортировок', mode: 'array' as const, generatorFactory: compareSortsDemo },
  '/sorting/block': { title: 'Блочная сортировка', mode: 'array' as const, generatorFactory: blockSortDemo },
  '/sorting/counting': { title: 'Сортировка подсчётом', mode: 'array' as const, generatorFactory: countingSortDemo },
  '/sorting/radix': { title: 'Поразрядная сортировка', mode: 'array' as const, generatorFactory: radixSortDemo },
  '/graphs/components': { title: 'Компоненты связности', mode: 'graph' as const, generatorFactory: connectedComponentsDemo },
  '/graphs/dijkstra': { title: 'Алгоритм Дейкстры', mode: 'graph' as const, generatorFactory: dijkstraDemo },
  '/graphs/mst': { title: 'Минимальное остовное дерево', mode: 'graph' as const, generatorFactory: mstDemo },
};
