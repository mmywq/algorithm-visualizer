import { useEffect, useMemo, useState } from 'react';
import { bubbleSort, mergeSort } from '@/algorithms/arrays';
import { DataInputPanel } from '@/components/common/DataInputPanel';
import { ResultPanel } from '@/components/common/ResultPanel';
import { StepExplainPanel } from '@/components/common/StepExplainPanel';
import { TheoryPanel } from '@/components/common/TheoryPanel';
import { PlayerControls } from '@/components/player/PlayerControls';
import { loadSettings, saveSettings } from '@/lib/storage';
import { algorithmTheoryByRoute, fallbackTheory } from '@/pages/theoryContent';
import { useAlgorithmPlayerStore } from '@/stores';
import { useUiPreferencesStore } from '@/stores';
import type { AlgorithmFrame, ArrayAlgorithmFrame, PseudocodeLine } from '@/types';
import { ArrayVisualizer } from './ArrayVisualizer';
import { MergeDivideMap } from './MergeDivideMap';

type SortingAlgorithmKey = 'bubble' | 'merge';

const FALLBACK_VALUES = [42, 18, 64, 9, 73, 31, 55, 27] as const;

const bubblePseudocode: readonly PseudocodeLine[] = [
  { code: 'создать рабочую копию массива A', note: 'Исходные данные не изменяются — сортируется копия.' },
  { code: 'для i от n−1 до 1 выполнять проход', note: 'i — граница неотсортированной части; справа от неё элементы уже стоят на своих местах.' },
  { code: 'для j от 0 до i−1', note: 'Просмотр неотсортированной части слева направо.' },
  { code: 'сравнить A[j] и A[j+1]', note: 'Сравниваются только соседние элементы.' },
  { code: 'если A[j] > A[j+1] — обменять элементы', note: 'Большее значение смещается на одну позицию вправо.' },
  { code: 'зафиксировать позицию i как отсортированную', note: 'После прохода наибольший элемент неотсортированной части занимает позицию i.' },
  { code: 'завершить, если за проход не было обменов', note: 'Отсутствие обменов означает, что массив уже упорядочен.' },
];

const mergePseudocode: readonly PseudocodeLine[] = [
  { code: 'создать рабочую копию массива A', note: 'Исходные данные не изменяются — сортируется копия.' },
  { code: 'разделить текущий диапазон пополам', note: 'Деление продолжается, пока в части не останется один элемент.' },
  { code: 'рекурсивно отсортировать левую половину', note: 'К левой половине применяются те же шаги 2–8.' },
  { code: 'рекурсивно отсортировать правую половину', note: 'К правой половине применяются те же шаги 2–8.' },
  { code: 'начать слияние двух упорядоченных половин', note: 'К этому моменту обе половины уже отсортированы.' },
  { code: 'сравнить первые неиспользованные элементы половин', note: 'Меньший из двух кандидатов должен попасть в результат раньше.' },
  { code: 'записать меньший элемент в текущую позицию', note: 'Позиция записи движется слева направо по сливаемому диапазону.' },
  { code: 'завершить, когда все диапазоны слиты', note: 'После слияния самого верхнего уровня массив упорядочен целиком.' },
];

const sortingAlgorithms: readonly {
  readonly key: SortingAlgorithmKey;
  readonly label: string;
  readonly run: (values: readonly number[]) => Generator<ArrayAlgorithmFrame, void, unknown>;
  readonly pseudocode: readonly PseudocodeLine[];
}[] = [
  { key: 'bubble', label: 'Пузырьковая сортировка', run: bubbleSort, pseudocode: bubblePseudocode },
  { key: 'merge', label: 'Сортировка слиянием', run: mergeSort, pseudocode: mergePseudocode },
];

interface SortingVisualizerProps {
  readonly defaultValues?: readonly number[];
}

export function SortingVisualizer({ defaultValues = FALLBACK_VALUES }: SortingVisualizerProps) {
  const [algorithmKey, setAlgorithmKey] = useState<SortingAlgorithmKey>('bubble');
  const [values, setValues] = useState<readonly number[]>(defaultValues);

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
  const setUiPlaybackSpeed = useUiPreferencesStore((state) => state.setPlaybackSpeedMs);

  const algorithm = sortingAlgorithms.find((option) => option.key === algorithmKey) ?? sortingAlgorithms[0]!;
  const theory = algorithmTheoryByRoute['/sorting/player'] ?? fallbackTheory('array');
  const frame = isArrayFrame(currentFrame) ? currentFrame : null;
  const stepsHistory = useMemo(() => frames.map((item) => item.description ?? item.message), [frames]);
  const isCompleted = status === 'completed';

  useEffect(() => {
    const generator = algorithm.run(values);
    const first = generator.next();
    if (first.done) {
      loadAlgorithm(generator);
    } else {
      loadAlgorithm(generator, { initialFrame: first.value });
    }
    const settings = loadSettings();
    saveSettings({ ...settings, lastArrayValues: values });
  }, [algorithm, loadAlgorithm, values]);

  const resetAlgorithm = (): void => {
    const generator = algorithm.run(values);
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
            <h1 className="text-3xl font-bold text-app-primary">Алгоритмы сортировки: пузырьковая и слиянием</h1>
            {theory.intro.length > 0 && (
              <p className="mt-3 max-w-4xl text-sm leading-6 text-app-muted">{theory.intro[0]}</p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {sortingAlgorithms.map((option) => (
              <button
                className={option.key === algorithm.key ? 'control-button control-button-primary' : 'control-button'}
                key={option.key}
                onClick={() => setAlgorithmKey(option.key)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <TheoryPanel theory={theory} />

      <DataInputPanel
        maxSize={24}
        minSize={2}
        onApply={setValues}
        storageKind="array"
        values={values}
      />

      {algorithm.key === 'merge' && <MergeDivideMap values={values} />}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <ArrayVisualizer frame={frame} title="Сортировка массива" />
        <StepExplainPanel frame={frame} pseudocode={algorithm.pseudocode} />
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
        onSpeedChange={(speed) => { setPlaybackSpeed(speed); setUiPlaybackSpeed(speed); }}
        playbackSpeedMs={playbackSpeedMs}
        status={status}
        totalFrames={frames.length}
      />

      {isCompleted && <ResultPanel steps={stepsHistory} summary={frame?.description ?? frame?.message ?? null} />}
    </div>
  );
}

const isArrayFrame = (frame: AlgorithmFrame<unknown, Record<string, unknown>> | null): frame is ArrayAlgorithmFrame =>
  frame?.domain === 'array' && Array.isArray(frame.data);
