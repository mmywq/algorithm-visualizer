import { useEffect, useMemo, useState } from 'react';
import { bstScenario } from '@/algorithms/structures/extendedStructures';
import { PlayerControls } from '@/components/player/PlayerControls';
import { StructureVisualizer } from '@/components/visualizers/structures/StructureVisualizer';
import { loadStructurePresets, saveStructurePreset } from '@/lib/storage';
import { useAlgorithmPlayerStore } from '@/stores';
import type { AlgorithmFrame, StructureAlgorithmFrame } from '@/types';

export function BstPage() {
  const [manualInput, setManualInput] = useState('50, 30, 70, 20, 40, 60, 80');
  const [values, setValues] = useState<readonly number[]>([50, 30, 70, 20, 40, 60, 80]);
  const [inputError, setInputError] = useState<string | null>(null);
  const [presets, setPresets] = useState(loadStructurePresets());

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
    run(values, loadAlgorithm);
  }, [values, loadAlgorithm]);

  const frame = isStructureFrame(currentFrame) ? currentFrame : null;
  const history = useMemo(() => frames.map((f) => f.description ?? f.message), [frames]);

  const applyManual = () => {
    const parsed = manualInput.split(',').map((v) => v.trim()).filter(Boolean).map(Number);
    if (parsed.length < 3 || parsed.length > 12 || parsed.some((v) => Number.isInteger(v) === false || Number.isFinite(v) === false)) {
      setInputError('Введите от 3 до 12 целых чисел через запятую.');
      return;
    }
    if (new Set(parsed).size !== parsed.length) {
      setInputError('Для BST в этом режиме значения должны быть уникальными.');
      return;
    }
    setInputError(null);
    setValues(parsed);
  };

  const randomValues = () => {
    const set = new Set<number>();
    while (set.size < 7) set.add(Math.floor(Math.random() * 201) - 100);
    const next = [...set];
    setValues(next);
    setManualInput(next.join(', '));
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <section className="app-panel">
        <h1 className="text-3xl font-bold text-app-primary">Двоичное дерево поиска (BST)</h1>
        <p className="mt-2 text-sm text-app-muted">BST (Binary Search Tree) — дерево, где для каждого узла: все ключи слева меньше, справа больше. Вставка и поиск выполняются через последовательные сравнения от корня.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <input className="control-input min-w-[360px]" value={manualInput} onChange={(e) => setManualInput(e.target.value)} />
          <button className="control-button" type="button" onClick={applyManual}>Применить</button>
          <button className="control-button" type="button" onClick={randomValues}>Случайные значения (до 100)</button>
          <button className="control-button" type="button" onClick={() => { saveStructurePreset('BST набор', values); setPresets(loadStructurePresets()); }}>Сохранить пресет</button>
        </div>
        {inputError && <p className="mt-2 text-sm text-rose-300">{inputError}</p>}
        {presets.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{presets.slice(0, 6).map((preset) => <button key={preset.id} className="control-button" type="button" onClick={() => { setValues(preset.values); setManualInput(preset.values.join(', ')); }}>{preset.name}</button>)}</div>}
      </section>

      <StructureVisualizer frame={frame} />

      {status === 'completed' && history.length > 0 && (
        <section className="app-panel">
          <h3 className="text-xl font-semibold text-app-primary">Полный список выполненных шагов</h3>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-app-muted">{history.map((h) => <li key={h}>{h}</li>)}</ol>
        </section>
      )}

      <PlayerControls canStepBackward={currentIndex > 0} canStepForward={status !== 'completed'} currentIndex={currentIndex} onNextStep={nextStep} onPause={pause} onPlay={play} onPrevStep={prevStep} onReset={() => run(values, loadAlgorithm)} onSpeedChange={setPlaybackSpeed} playbackSpeedMs={playbackSpeedMs} status={status} totalFrames={frames.length} />
    </div>
  );
}

const run = (values: readonly number[], loadAlgorithm: ReturnType<typeof useAlgorithmPlayerStore.getState>['loadAlgorithm']) => {
  const generator = bstScenario(values);
  const first = generator.next();
  if (first.done) loadAlgorithm(generator); else loadAlgorithm(generator, { initialFrame: first.value });
};

const isStructureFrame = (frame: AlgorithmFrame<unknown, Record<string, unknown>> | null): frame is StructureAlgorithmFrame =>
  frame?.domain === 'array' && typeof frame.data === 'object' && frame.data !== null && 'cells' in frame.data;
