import { useEffect, useMemo, useState } from 'react';
import { bubbleSort, mergeSort } from '@/algorithms/arrays';
import { PlayerControls } from '@/components/player/PlayerControls';
import { loadArrayPresets, loadSettings, saveArrayPreset, saveSettings } from '@/lib/storage';
import { useAlgorithmPlayerStore } from '@/stores';
import type { AlgorithmFrame, ArrayAlgorithmFrame } from '@/types';
import { ArrayVisualizer } from './ArrayVisualizer';

type SortingAlgorithmKey = 'bubble' | 'merge';

const FALLBACK_VALUES = [42, 18, 64, 9, 73, 31, 55, 27];

const algorithmLabels: Record<SortingAlgorithmKey, string> = {
  bubble: 'Bubble Sort',
  merge: 'Merge Sort',
};

interface SortingVisualizerProps {
  readonly defaultValues?: readonly number[];
}

export function SortingVisualizer({ defaultValues = FALLBACK_VALUES }: SortingVisualizerProps) {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<SortingAlgorithmKey>('bubble');
  const [values, setValues] = useState<readonly number[]>(defaultValues);
  const [presets, setPresets] = useState(loadArrayPresets());

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

  const arrayFrame = isArrayAlgorithmFrame(currentFrame) ? currentFrame : null;

  const valuesLabel = useMemo(() => values.join(', '), [values]);

  useEffect(() => {
    loadSortingAlgorithm(selectedAlgorithm, values, loadAlgorithm);
    const settings = loadSettings();
    saveSettings({ ...settings, lastArrayValues: values, playbackSpeedMs });
  }, [loadAlgorithm, playbackSpeedMs, selectedAlgorithm, values]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300">Step 4</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">UI для сортировок</h1>
            <p className="mt-3 max-w-3xl text-slate-300">
              UI работает только с кадрами из генераторов и не содержит логики сортировки.
              Смена алгоритма пересоздаёт генератор и сбрасывает историю плеера.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(['bubble', 'merge'] as const).map((algorithmKey) => (
              <button
                className={
                  algorithmKey === selectedAlgorithm
                    ? 'control-button control-button-primary'
                    : 'control-button'
                }
                key={algorithmKey}
                onClick={() => setSelectedAlgorithm(algorithmKey)}
                type="button"
              >
                {algorithmLabels[algorithmKey]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300 md:flex-row md:items-center md:justify-between">
          <span>
            Текущий массив: <strong className="text-slate-100">[{valuesLabel}]</strong>
          </span>
          <div className="flex flex-wrap gap-2">
            <button className="control-button" onClick={() => setValues(shuffleValues(values))} type="button">
              Перемешать
            </button>
            <button
              className="control-button"
              onClick={() => {
                saveArrayPreset(`Preset ${new Date().toLocaleTimeString()}`, values);
                setPresets(loadArrayPresets());
              }}
              type="button"
            >
              Сохранить пресет
            </button>
          </div>
        </div>

        {presets.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {presets.slice(0, 5).map((preset) => (
              <button className="control-button" key={preset.id} onClick={() => setValues(preset.values)} type="button">
                {preset.name}
              </button>
            ))}
          </div>
        )}
      </section>

      <ArrayVisualizer frame={arrayFrame} />

      <PlayerControls
        canStepBackward={currentIndex > 0}
        canStepForward={status !== 'completed'}
        currentIndex={currentIndex}
        onNextStep={nextStep}
        onPause={pause}
        onPlay={play}
        onPrevStep={prevStep}
        onReset={() => loadSortingAlgorithm(selectedAlgorithm, values, loadAlgorithm)}
        onSpeedChange={setPlaybackSpeed}
        playbackSpeedMs={playbackSpeedMs}
        status={status}
        totalFrames={frames.length}
      />
    </div>
  );
}

const loadSortingAlgorithm = (
  algorithmKey: SortingAlgorithmKey,
  values: readonly number[],
  loadAlgorithm: ReturnType<typeof useAlgorithmPlayerStore.getState>['loadAlgorithm'],
): void => {
  const generator = algorithmKey === 'bubble' ? bubbleSort(values) : mergeSort(values);
  loadAlgorithm(generator);
};

const shuffleValues = (values: readonly number[]): readonly number[] =>
  [...values]
    .map((value) => ({ sortKey: Math.random(), value }))
    .sort((left, right) => left.sortKey - right.sortKey)
    .map(({ value }) => value);

const isArrayAlgorithmFrame = (
  frame: AlgorithmFrame<unknown, Record<string, unknown>> | null,
): frame is ArrayAlgorithmFrame => frame?.domain === 'array' && Array.isArray(frame.data);
