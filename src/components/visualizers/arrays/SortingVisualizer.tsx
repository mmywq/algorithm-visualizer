import { useEffect, useMemo, useState } from 'react';
import { bubbleSort, mergeSort } from '@/algorithms/arrays';
import { PlayerControls } from '@/components/player/PlayerControls';
import { loadArrayPresets, loadSettings, removeArrayPreset, renameArrayPreset, saveArrayPreset, saveSettings } from '@/lib/storage';
import { useAlgorithmPlayerStore } from '@/stores';
import { useUiPreferencesStore } from '@/stores';
import type { AlgorithmFrame, ArrayAlgorithmFrame } from '@/types';
import { ArrayVisualizer } from './ArrayVisualizer';

type SortingAlgorithmKey = 'bubble' | 'merge';
const FALLBACK_VALUES = [42, 18, 64, 9, 73, 31, 55, 27];
const MAX_ARRAY_SIZE = 64;
const MIN_ARRAY_VALUE = -999;
const MAX_ARRAY_VALUE = 999;
const algorithmLabels: Record<SortingAlgorithmKey, string> = { bubble: 'Сортировка пузырьком', merge: 'Сортировка слиянием' };
const pseudocodeByAlgorithm: Record<SortingAlgorithmKey, readonly string[]> = {
  bubble: ['для i = 0..n-1', 'для j = 0..n-i-2', 'если A[j] > A[j+1]', 'обмен(A[j], A[j+1])'],
  merge: ['разделить массив пополам', 'рекурсивно сортировать левую часть', 'рекурсивно сортировать правую часть', 'слить две отсортированные части'],
};

interface SortingVisualizerProps {
  readonly defaultValues?: readonly number[];
}

export function SortingVisualizer({ defaultValues = FALLBACK_VALUES }: SortingVisualizerProps) {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<SortingAlgorithmKey>('bubble');
  const [values, setValues] = useState<readonly number[]>(defaultValues);
  const [manualInput, setManualInput] = useState(defaultValues.join(', '));
  const [inputError, setInputError] = useState<string | null>(null);
  const [presets, setPresets] = useState(loadArrayPresets());
  const [presetName, setPresetName] = useState('');
  const [renamePresetState, setRenamePresetState] = useState<{ id: string; name: string } | null>(null);

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

  const arrayFrame = isArrayAlgorithmFrame(currentFrame) ? currentFrame : null;
  const valuesLabel = useMemo(() => values.join(', '), [values]);

  useEffect(() => {
    loadSortingAlgorithm(selectedAlgorithm, values, loadAlgorithm);
    const settings = loadSettings();
    saveSettings({ ...settings, lastArrayValues: values, playbackSpeedMs });
  }, [loadAlgorithm, playbackSpeedMs, selectedAlgorithm, values]);

  const applyManualValues = () => {
    const segments = manualInput
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    if (segments.length === 0) {
      setInputError('Введите значения массива через запятую.');
      return;
    }

    const parsed: number[] = [];
    for (const segment of segments) {
      if (/^-?\d+$/.test(segment) === false) {
        setInputError(`Недопустимое значение: "${segment}". Используйте только целые числа.`);
        return;
      }

      const numberValue = Number(segment);
      if (numberValue < MIN_ARRAY_VALUE || numberValue > MAX_ARRAY_VALUE) {
        setInputError(`Числа должны быть в диапазоне от ${MIN_ARRAY_VALUE} до ${MAX_ARRAY_VALUE}.`);
        return;
      }

      parsed.push(numberValue);
    }

    if (parsed.length < 2) {
      setInputError('Введите минимум 2 числа через запятую.');
      return;
    }
    if (parsed.length > MAX_ARRAY_SIZE) {
      setInputError(`Максимальный размер массива: ${MAX_ARRAY_SIZE}.`);
      return;
    }

    setInputError(null);
    setValues(parsed);
  };

  return (
    <div className="flex w-full flex-col gap-6 px-4 pb-8 lg:px-8">
      <section className="rounded-3xl border border-app bg-surface p-6 shadow-xl shadow-slate-950/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-app-primary">Алгоритмы сортировки</h1>
            <p className="mt-3 max-w-3xl text-app-muted">Выберите алгоритм, задайте входные данные вручную или сгенерируйте случайные значения, затем изучайте каждый шаг.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['bubble', 'merge'] as const).map((algorithmKey) => (
              <button className={algorithmKey === selectedAlgorithm ? 'control-button control-button-primary' : 'control-button'} key={algorithmKey} onClick={() => setSelectedAlgorithm(algorithmKey)} type="button">
                {algorithmLabels[algorithmKey]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3 rounded-2xl border border-app bg-surface p-4 text-sm text-app-muted lg:grid-cols-[1fr_auto]">
          <div>
            <p className="mb-2 text-app-primary">Ввод массива (через запятую)</p>
            <div className="flex gap-2">
              <input className="w-full rounded-xl border border-app bg-surface px-3 py-2 text-app-primary" value={manualInput} onChange={(e) => setManualInput(e.target.value)} />
              <button className="control-button" onClick={applyManualValues} type="button">Применить</button>
            </div>
            {inputError !== null && <p className="mt-2 text-rose-300">{inputError}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="control-button" onClick={() => { const shuffled = shuffleValues(values); setValues(shuffled); setManualInput(shuffled.join(', ')); }} type="button">Перемешать</button>
            <input className="h-10 rounded-xl border border-app bg-surface px-3 text-sm text-app-primary" onChange={(event) => setPresetName(event.target.value)} placeholder="Имя пресета" value={presetName} />
            <button className="control-button" onClick={() => { const name = presetName.trim() || `Набор ${new Date().toLocaleTimeString()}`; saveArrayPreset(name, values); setPresetName(''); setPresets(loadArrayPresets()); }} type="button">Сохранить пресет</button>
          </div>
          <p>Текущий массив: <strong className="text-app-primary">[{valuesLabel}]</strong></p>
        </div>

        {presets.length > 0 && (
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {presets.slice(0, 8).map((preset) => (
              <div className="flex items-center gap-2" key={preset.id}>
                <button className="control-button flex-1" onClick={() => { setValues(preset.values); setManualInput(preset.values.join(', ')); }} type="button">{preset.name}</button>
                <button className="control-button" onClick={() => setRenamePresetState({ id: preset.id, name: preset.name })} type="button">Переим.</button>
                <button className="control-button" onClick={() => { removeArrayPreset(preset.id); setPresets(loadArrayPresets()); }} type="button">Удалить</button>
              </div>
            ))}
          </div>
        )}

        {renamePresetState !== null && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-app bg-surface p-3">
            <p className="text-sm text-app-muted">Переименование пресета</p>
            <input className="h-10 rounded-xl border border-app bg-surface px-3 text-sm text-app-primary" onChange={(event) => setRenamePresetState({ ...renamePresetState, name: event.target.value })} value={renamePresetState.name} />
            <button className="control-button" onClick={() => { renameArrayPreset(renamePresetState.id, renamePresetState.name); setRenamePresetState(null); setPresets(loadArrayPresets()); }} type="button">Сохранить</button>
            <button className="control-button" onClick={() => setRenamePresetState(null)} type="button">Отмена</button>
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <ArrayVisualizer frame={arrayFrame} />
        <aside className="rounded-3xl border border-app bg-surface p-5">
          <h3 className="text-lg font-semibold text-app-primary">Теория</h3>
          <p className="mt-2 text-sm text-app-muted">{selectedAlgorithm === 'bubble' ? 'Сортировка пузырьком: многократно сравнивает соседние элементы и переставляет их.' : 'Сортировка слиянием: рекурсивно делит массив и сливает отсортированные подмассивы.'}</p>
          <p className="mt-2 text-sm text-app-muted">Сложность: {selectedAlgorithm === 'bubble' ? 'O(n²)' : 'O(n log n)'}</p>
          <div className="mt-4 rounded-2xl border border-app bg-surface p-3 text-sm text-app-muted">
            <p className="font-semibold text-cyan-200">Пояснение шага</p>
            <p className="mt-2">{arrayFrame?.message ?? 'Запустите визуализацию для объяснения шага.'}</p>
          </div>
          <div className="mt-4 rounded-2xl border border-app bg-surface p-3 text-xs text-app-muted">
            <p className="mb-2 font-semibold text-cyan-200">Псевдокод</p>
            {pseudocodeByAlgorithm[selectedAlgorithm].map((line, index) => (
              <p className={arrayFrame?.pseudocode.line === index + 1 ? 'text-cyan-200' : ''} key={line}>
                {index + 1}. {line}
              </p>
            ))}
          </div>
        </aside>
      </div>
      <PlayerControls canStepBackward={currentIndex > 0} canStepForward={status !== 'completed'} currentIndex={currentIndex} onNextStep={nextStep} onPause={pause} onPlay={play} onPrevStep={prevStep} onReset={() => loadSortingAlgorithm(selectedAlgorithm, values, loadAlgorithm)} onSpeedChange={(speed) => { setPlaybackSpeed(speed); setUiPlaybackSpeed(speed); }} playbackSpeedMs={playbackSpeedMs} status={status} totalFrames={frames.length} />
    </div>
  );
}

const loadSortingAlgorithm = (algorithmKey: SortingAlgorithmKey, values: readonly number[], loadAlgorithm: ReturnType<typeof useAlgorithmPlayerStore.getState>['loadAlgorithm']): void => {
  const generator = algorithmKey === 'bubble' ? bubbleSort(values) : mergeSort(values);
  const first = generator.next();
  if (first.done) {
    loadAlgorithm(generator);
  } else {
    loadAlgorithm(generator, { initialFrame: first.value });
  }
};

const shuffleValues = (values: readonly number[]): readonly number[] => [...values].map((value) => ({ sortKey: Math.random(), value })).sort((l, r) => l.sortKey - r.sortKey).map(({ value }) => value);

const isArrayAlgorithmFrame = (frame: AlgorithmFrame<unknown, Record<string, unknown>> | null): frame is ArrayAlgorithmFrame => frame?.domain === 'array' && Array.isArray(frame.data);
