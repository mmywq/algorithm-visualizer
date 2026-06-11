import { useEffect, useMemo, useState } from 'react';
import { compareSortsDemo, blockSortDemo, countingSortDemo, radixSortDemo } from '@/algorithms/sorting/extra';
import { balancedBstScenario, binomialHeapScenario, bstScenario, bstSearchScenario, hashBlockScenario, hashClosedScenario, hashOpenScenario, heapExtractMinScenario, heapScenario } from '@/algorithms/structures/extendedStructures';
import { hashBlockSearchScenario, hashChainingDeleteScenario, hashChainingSearchScenario, hashOpenAddressingSearchScenario } from '@/algorithms/structures/hashTable';
import { DataInputPanel } from '@/components/common/DataInputPanel';
import { ResultPanel } from '@/components/common/ResultPanel';
import { StepExplainPanel } from '@/components/common/StepExplainPanel';
import { TheoryPanel } from '@/components/common/TheoryPanel';
import { PlayerControls } from '@/components/player/PlayerControls';
import { ArrayVisualizer } from '@/components/visualizers/arrays/ArrayVisualizer';
import { StructureVisualizer } from '@/components/visualizers/structures/StructureVisualizer';
import { useAlgorithmPlayerStore } from '@/stores';
import type { AlgorithmFrame, AlgorithmTheory, ArrayAlgorithmFrame, StructureAlgorithmFrame } from '@/types';
import { algorithmTheoryByRoute, fallbackTheory } from './theoryContent';

type Mode = 'array' | 'structure';

type PageGeneratorFactory = (
  inputValues?: readonly number[],
  ...extraArgs: readonly number[]
) => Generator<AlgorithmFrame<unknown, Record<string, unknown>>, void, unknown>;

export interface KeyActionsConfig {
  readonly inputLabel: string;
  readonly placeholder: string;
  readonly hint: string;
  readonly actions: readonly {
    readonly key: string;
    readonly label: string;
    readonly run: (values: readonly number[], target: number) => Generator<AlgorithmFrame<unknown, Record<string, unknown>>, void, unknown>;
  }[];
}

interface AlgorithmPageProps {
  readonly route: string;
  readonly title: string;
  readonly mode: Mode;
  readonly generatorFactory: PageGeneratorFactory;
  readonly keyActions?: KeyActionsConfig | undefined;
}

export function AlgorithmPage({ route, title, mode, generatorFactory, keyActions }: AlgorithmPageProps) {
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

  const isHeapPage = title === 'Куча';

  useEffect(() => {
    loadPageAlgorithm(generatorFactory, values, loadAlgorithm);
  }, [generatorFactory, loadAlgorithm, values]);

  const frame = currentFrame;
  const theory: AlgorithmTheory = algorithmTheoryByRoute[route] ?? fallbackTheory(mode);
  const stepsHistory = useMemo(() => frames.map((stepFrame) => stepFrame.description ?? stepFrame.message), [frames]);
  const isCompleted = status === 'completed';

  const resetAlgorithm = (): void => {
    setSearchError(null);
    loadPageAlgorithm(generatorFactory, values, loadAlgorithm);
  };

  const runKeyAction = (run: (values: readonly number[], target: number) => Generator<AlgorithmFrame<unknown, Record<string, unknown>>, void, unknown>): void => {
    const trimmed = searchInput.trim();
    const target = Number(trimmed);
    if (trimmed.length === 0 || Number.isInteger(target) === false || Number.isFinite(target) === false) {
      setSearchError('Введите целое число — ключ для операции.');
      return;
    }
    setSearchError(null);
    const generator = run(values, target);
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

      <DataInputPanel
          maxSize={16}
          minSize={2}
          onApply={(nextValues) => { setSearchError(null); setValues(nextValues); }}
          storageKind={mode === 'structure' ? 'structure' : 'array'}
          uniqueRandom={mode === 'structure'}
          values={values}
        >
          {keyActions !== undefined && (
            <div className="mt-4 grid gap-2 rounded-2xl border border-app bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-sm text-app-muted" htmlFor="key-action-input">{keyActions.inputLabel}</label>
                <input className="control-input w-40" id="key-action-input" onChange={(event) => setSearchInput(event.target.value)} placeholder={keyActions.placeholder} value={searchInput} />
                {keyActions.actions.map((action, actionIndex) => (
                  <button
                    className={actionIndex === 0 ? 'control-button control-button-primary' : 'control-button'}
                    key={action.key}
                    onClick={() => runKeyAction(action.run)}
                    type="button"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
              <p className="text-xs leading-5 text-app-muted">{keyActions.hint}</p>
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

      <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div>
          {mode === 'array' && <ArrayVisualizer frame={isArrayFrame(frame) ? frame : null} />}
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

      {isCompleted && <ResultPanel steps={stepsHistory} summary={frame?.description ?? frame?.message ?? null} />}
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
  // набор подобран так, чтобы во всех трёх схемах хеширования возникали коллизии
  if (title.includes('хеш') || title.includes('Хеш')) return [12, 19, 31, 24, 8, 14];
  if (title.includes('Куча')) return [40, 15, 60, 5, 30, 55];
  if (title.includes('Двоичное дерево поиска')) return [50, 30, 70, 20, 40, 60, 80];
  return [18, 7, 24, 3, 12, 30];
};

const isArrayFrame = (frame: AlgorithmFrame<unknown, Record<string, unknown>> | null): frame is ArrayAlgorithmFrame => frame?.domain === 'array' && Array.isArray(frame.data) && frame.data.every((item) => typeof item === 'object' && item !== null && 'value' in item);
const isStructureFrame = (frame: AlgorithmFrame<unknown, Record<string, unknown>> | null): frame is StructureAlgorithmFrame => (frame?.domain === 'tree' || frame?.domain === 'array') && typeof frame.data === 'object' && frame.data !== null && 'cells' in frame.data;

interface RegistryEntry {
  readonly title: string;
  readonly mode: Mode;
  readonly generatorFactory: PageGeneratorFactory;
  readonly keyActions?: KeyActionsConfig;
}

export const algorithmRouteRegistry: Record<string, RegistryEntry> = {
  '/trees/bst': {
    title: 'Двоичное дерево поиска',
    mode: 'structure',
    generatorFactory: bstScenario,
    keyActions: {
      inputLabel: 'Найти элемент в дереве',
      placeholder: 'Например: 40',
      hint: 'Поиск идёт от корня: на каждом узле искомый ключ сравнивается со значением узла, и поиск переходит в левое или правое поддерево. В конце выводится путь сравнений и итог: найден ключ или нет.',
      actions: [
        { key: 'search', label: 'Показать путь поиска', run: (values, target) => bstSearchScenario(values, target) },
      ],
    },
  },
  '/trees/balanced-bst': { title: 'Сбалансированное двоичное дерево поиска', mode: 'structure', generatorFactory: balancedBstScenario },
  '/hash/open-chaining': {
    title: 'Хеш-таблица: метод цепочек',
    mode: 'structure',
    generatorFactory: hashOpenScenario,
    keyActions: {
      inputLabel: 'Операции с ключом',
      placeholder: 'Например: 22',
      hint: 'Поиск и удаление начинаются с вычисления h(key) и работают только с одной корзиной: просматривается её цепочка, а не вся таблица. В итоге выводится число сравнений и место ключа.',
      actions: [
        { key: 'search', label: 'Найти ключ', run: (values, target) => hashChainingSearchScenario(values, target, 7) },
        { key: 'delete', label: 'Удалить ключ', run: (values, target) => hashChainingDeleteScenario(values, target, 7) },
      ],
    },
  },
  '/hash/open-addressing': {
    title: 'Хеш-таблица: открытая адресация',
    mode: 'structure',
    generatorFactory: hashClosedScenario,
    keyActions: {
      inputLabel: 'Найти ключ',
      placeholder: 'Например: 22',
      hint: 'Поиск повторяет путь пробирования вставки: от «домашней» ячейки h(key) по соседним ячейкам, пока не встретит ключ или пустую ячейку. В итоге выводится число проб — цена коллизий.',
      actions: [
        { key: 'search', label: 'Найти ключ', run: (values, target) => hashOpenAddressingSearchScenario(values, target, 11) },
      ],
    },
  },
  '/hash/block-addressing': {
    title: 'Хеш-таблица: блочная адресация',
    mode: 'structure',
    generatorFactory: hashBlockScenario,
    keyActions: {
      inputLabel: 'Найти ключ',
      placeholder: 'Например: 22',
      hint: 'Поиск проверяет основной блок h(key) и цепочку его overflow-блоков, не затрагивая чужие блоки. В итоге выводится число просмотренных блоков и сравнений.',
      actions: [
        { key: 'search', label: 'Найти ключ', run: (values, target) => hashBlockSearchScenario(values, target, 5, 2) },
      ],
    },
  },
  '/heaps/heap': { title: 'Куча', mode: 'structure', generatorFactory: heapScenario },
  '/heaps/binomial': { title: 'Биномиальная куча', mode: 'structure', generatorFactory: binomialHeapScenario },
  '/sorting/compare': { title: 'Сравнение 6 сортировок', mode: 'array', generatorFactory: compareSortsDemo },
  '/sorting/block': { title: 'Блочная сортировка', mode: 'array', generatorFactory: blockSortDemo },
  '/sorting/counting': { title: 'Сортировка подсчётом', mode: 'array', generatorFactory: countingSortDemo },
  '/sorting/radix': { title: 'Поразрядная сортировка', mode: 'array', generatorFactory: radixSortDemo },
};
