import { useEffect, useMemo, useState } from 'react';
import { compareSortsDemo, blockSortDemo, countingSortDemo, radixSortDemo } from '@/algorithms/sorting/extra';
import { connectedComponentsDemo, dijkstraDemo, mstDemo } from '@/algorithms/graphs';
import { balancedBstScenario, binomialHeapScenario, bstScenario, bstSearchScenario, hashBlockScenario, hashClosedScenario, hashOpenScenario, heapExtractMinScenario, heapScenario } from '@/algorithms/structures/extendedStructures';
import { DataInputPanel } from '@/components/common/DataInputPanel';
import { ResultPanel } from '@/components/common/ResultPanel';
import { StepExplainPanel } from '@/components/common/StepExplainPanel';
import { TheoryPanel } from '@/components/common/TheoryPanel';
import { PlayerControls } from '@/components/player/PlayerControls';
import { ArrayVisualizer } from '@/components/visualizers/arrays/ArrayVisualizer';
import { GraphVisualizer } from '@/components/visualizers/graphs/GraphVisualizer';
import { StructureVisualizer } from '@/components/visualizers/structures/StructureVisualizer';
import { useAlgorithmPlayerStore } from '@/stores';
import type { AlgorithmFrame, AlgorithmTheory, ArrayAlgorithmFrame, GraphAlgorithmFrame, StructureAlgorithmFrame } from '@/types';
import { algorithmTheoryByRoute, fallbackTheory } from './theoryContent';

type Mode = 'array' | 'graph' | 'structure';

type PageGeneratorFactory = (
  inputValues?: readonly number[],
  ...extraArgs: readonly number[]
) => Generator<AlgorithmFrame<unknown, Record<string, unknown>>, void, unknown>;

interface AlgorithmPageProps {
  readonly route: string;
  readonly title: string;
  readonly mode: Mode;
  readonly generatorFactory: PageGeneratorFactory;
}

export function AlgorithmPage({ route, title, mode, generatorFactory }: AlgorithmPageProps) {
  const [values, setValues] = useState<readonly number[]>(() => getDefaultValues(title, mode));
  const [searchInput, setSearchInput] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);

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

  const canUseNumericInput = mode !== 'graph';
  const isBstPage = title === 'Двоичное дерево поиска';
  const isHeapPage = title === 'Куча';

  useEffect(() => {
    loadPageAlgorithm(generatorFactory, canUseNumericInput ? values : undefined, loadAlgorithm);
  }, [canUseNumericInput, generatorFactory, loadAlgorithm, values]);

  const frame = currentFrame;
  const theory: AlgorithmTheory = algorithmTheoryByRoute[route] ?? fallbackTheory(mode);
  const stepsHistory = useMemo(() => frames.map((stepFrame) => stepFrame.description ?? stepFrame.message), [frames]);
  const isCompleted = status === 'completed';

  const resetAlgorithm = (): void => {
    setSearchError(null);
    loadPageAlgorithm(generatorFactory, canUseNumericInput ? values : undefined, loadAlgorithm);
  };

  const runBstSearch = (): void => {
    const trimmed = searchInput.trim();
    const target = Number(trimmed);
    if (trimmed.length === 0 || Number.isInteger(target) === false || Number.isFinite(target) === false) {
      setSearchError('Введите целое число, которое нужно найти в дереве.');
      return;
    }
    setSearchError(null);
    const generator = bstSearchScenario(values, target);
    const first = generator.next();
    if (first.done) {
      loadAlgorithm(generator);
    } else {
      loadAlgorithm(generator, { initialFrame: first.value });
    }
  };

  const runHeapExtractMin = (): void => {
    loadPageAlgorithm(heapExtractMinScenario, values, loadAlgorithm);
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <section className="app-panel">
        <h1 className="text-3xl font-bold text-app-primary">{title}</h1>
        {theory.intro.length > 0 && (
          <p className="mt-3 max-w-4xl text-sm leading-6 text-app-muted">{theory.intro[0]}</p>
        )}
      </section>

      <TheoryPanel theory={theory} />

      {canUseNumericInput && (
        <DataInputPanel
          maxSize={16}
          minSize={2}
          onApply={(nextValues) => { setSearchError(null); setValues(nextValues); }}
          storageKind={mode === 'structure' ? 'structure' : 'array'}
          uniqueRandom={mode === 'structure'}
          values={values}
        >
          {isBstPage && (
            <div className="mt-4 grid gap-2 rounded-2xl border border-app bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-sm text-app-muted" htmlFor="bst-search-input">Найти элемент в дереве</label>
                <input className="control-input w-40" id="bst-search-input" onChange={(event) => setSearchInput(event.target.value)} placeholder="Например: 40" value={searchInput} />
                <button className="control-button control-button-primary" onClick={runBstSearch} type="button">Показать путь поиска</button>
              </div>
              <p className="text-xs leading-5 text-app-muted">Поиск идёт от корня: на каждом узле искомое число сравнивается с ключом узла, и алгоритм переходит в левое или правое поддерево.</p>
              {searchError !== null && <p className="text-sm text-rose-300">{searchError}</p>}
            </div>
          )}

          {isHeapPage && (
            <div className="mt-4 flex flex-wrap gap-2 rounded-2xl border border-app bg-surface p-4">
              <button className="control-button control-button-primary" onClick={resetAlgorithm} type="button">Построить min-heap</button>
              <button className="control-button" onClick={runHeapExtractMin} type="button">Извлечь минимум</button>
              <p className="basis-full text-xs leading-5 text-app-muted">Извлечение минимума показывает перенос последнего элемента в корень и последующее «просеивание вниз» через меньшего ребёнка.</p>
            </div>
          )}
        </DataInputPanel>
      )}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div>
          {mode === 'array' && <ArrayVisualizer frame={isArrayFrame(frame) ? frame : null} />}
          {mode === 'graph' && <GraphVisualizer frame={isGraphFrame(frame) ? frame : null} graph={isGraphFrame(frame) ? frame.data : { nodes: [], edges: [] }} title={title} />}
          {mode === 'structure' && <StructureVisualizer frame={isStructureFrame(frame) ? frame : null} />}
        </div>
        <StepExplainPanel frame={frame} pseudocode={theory.pseudocode} />
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

      {isCompleted && <ResultPanel steps={stepsHistory} summary={buildResultSummary(title, frame)} />}
    </div>
  );
}

const loadPageAlgorithm = (
  generatorFactory: PageGeneratorFactory,
  values: readonly number[] | undefined,
  loadAlgorithm: ReturnType<typeof useAlgorithmPlayerStore.getState>['loadAlgorithm'],
  ...extraArgs: readonly number[]
): void => {
  const generator = generatorFactory(values, ...extraArgs);
  const first = generator.next();
  if (first.done) {
    loadAlgorithm(generator);
  } else {
    loadAlgorithm(generator, { initialFrame: first.value });
  }
};

const getDefaultValues = (title: string, mode: Mode): readonly number[] => {
  if (mode === 'array') return [34, -12, 56, 7, 7, 89, -3, 22];
  if (title.includes('хеш')) return [12, 22, 32, 42, 52];
  if (title.includes('Куча')) return [40, 15, 60, 5, 30, 55];
  if (title.includes('Двоичное дерево поиска')) return [50, 30, 70, 20, 40, 60, 80];
  return [18, 7, 24, 3, 12, 30];
};

const isArrayFrame = (frame: AlgorithmFrame<unknown, Record<string, unknown>> | null): frame is ArrayAlgorithmFrame => frame?.domain === 'array' && Array.isArray(frame.data) && frame.data.every((item) => typeof item === 'object' && item !== null && 'value' in item);
const isGraphFrame = (frame: AlgorithmFrame<unknown, Record<string, unknown>> | null): frame is GraphAlgorithmFrame => frame?.domain === 'graph';
const isStructureFrame = (frame: AlgorithmFrame<unknown, Record<string, unknown>> | null): frame is StructureAlgorithmFrame => (frame?.domain === 'tree' || frame?.domain === 'array') && typeof frame.data === 'object' && frame.data !== null && 'cells' in frame.data;

const buildResultSummary = (title: string, frame: AlgorithmFrame<unknown, Record<string, unknown>> | null): string | null => {
  if (frame === null) {
    return null;
  }

  const fallback = frame.description ?? frame.message;

  if (isGraphFrame(frame)) {
    const meta = frame.meta as Record<string, unknown>;
    if (title === 'Компоненты связности') {
      const components = Array.isArray(meta.components) ? meta.components as readonly string[][] : [];
      const componentCount = typeof meta.componentCount === 'number' ? meta.componentCount : components.length;
      if (componentCount > 0) {
        return `Найдено компонент связности: ${componentCount}. Состав: ${components.map((members, index) => `№${index + 1} — [${members.join(', ')}]`).join('; ')}.`;
      }
    } else if (title === 'Алгоритм Дейкстры') {
      const distances = Array.isArray(meta.distances) ? meta.distances as readonly string[] : [];
      if (distances.length > 0) {
        return `Кратчайшие расстояния от вершины ${String(meta.startNodeId ?? '')}: ${distances.join(', ')}.`;
      }
    } else if (title === 'Минимальное остовное дерево') {
      const mstEdgeIds = Array.isArray(meta.mstEdgeIds) ? meta.mstEdgeIds as readonly string[] : [];
      const totalWeight = typeof meta.totalWeight === 'number' ? meta.totalWeight : null;
      return `В остовное дерево вошли рёбра: ${mstEdgeIds.length > 0 ? mstEdgeIds.join(', ') : '—'}.${totalWeight === null ? '' : ` Суммарный вес: ${totalWeight}.`}`;
    }
  }

  return fallback;
};

export const algorithmRouteRegistry = {
  '/trees/bst': { title: 'Двоичное дерево поиска', mode: 'structure' as const, generatorFactory: bstScenario },
  '/trees/balanced-bst': { title: 'Сбалансированное двоичное дерево поиска', mode: 'structure' as const, generatorFactory: balancedBstScenario },
  '/hash/open-chaining': { title: 'Хеш-таблица: метод цепочек', mode: 'structure' as const, generatorFactory: hashOpenScenario },
  '/hash/open-addressing': { title: 'Хеш-таблица: открытая адресация', mode: 'structure' as const, generatorFactory: hashClosedScenario },
  '/hash/block-addressing': { title: 'Хеш-таблица: блочная адресация', mode: 'structure' as const, generatorFactory: hashBlockScenario },
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
