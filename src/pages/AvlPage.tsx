import { useEffect, useMemo, useState } from 'react';
import { avlScenario } from '@/algorithms/structures/avlTree';
import { PlayerControls } from '@/components/player/PlayerControls';
import { StructureVisualizer } from '@/components/visualizers/structures/StructureVisualizer';
import { loadStructurePresets, saveStructurePreset } from '@/lib/storage';
import { useAlgorithmPlayerStore } from '@/stores';
import type { AlgorithmFrame, StructureAlgorithmFrame } from '@/types';

export function AvlPage() {
  const [manualInput, setManualInput] = useState('30, 20, 10, 25, 40, 50, 45');
  const [values, setValues] = useState<readonly number[]>([30, 20, 10, 25, 40, 50, 45]);
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
  }, [loadAlgorithm, values]);

  const frame = isStructureFrame(currentFrame) ? currentFrame : null;
  const history = useMemo(() => frames.map((item) => item.description ?? item.message), [frames]);

  const applyManual = () => {
    const parsed = manualInput.split(',').map((value) => value.trim()).filter(Boolean).map(Number);
    if (parsed.length < 3 || parsed.length > 12 || parsed.some((value) => Number.isInteger(value) === false || Number.isFinite(value) === false)) {
      setInputError('Введите от 3 до 12 целых чисел через запятую.');
      return;
    }
    setInputError(null);
    setValues(parsed);
  };

  const randomValues = () => {
    const next = Array.from({ length: 8 }, () => Math.floor(Math.random() * 201) - 100);
    setValues(next);
    setManualInput(next.join(', '));
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <section className="app-panel">
        <h1 className="text-3xl font-bold text-app-primary">AVL-дерево</h1>
        <p className="mt-2 text-sm leading-6 text-app-muted">AVL-дерево — это самобалансирующееся двоичное дерево поиска. Для каждого узла разность высот левого и правого поддеревьев не превышает 1 по модулю. Если это условие нарушается после вставки, выполняется поворот или двойной поворот, который восстанавливает баланс и сохраняет логарифмическую высоту дерева.</p>
        <p className="mt-2 text-sm leading-6 text-app-muted">Ниже показано, как дерево строится шаг за шагом. Каждая вставка сопровождается проверкой баланса и, при необходимости, вращением узлов.</p>
        <p className="mt-2 text-sm text-app-muted">Сложность вставки и поиска в среднем O(log n), потому что баланс не позволяет дереву выродиться в длинную цепочку.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <input className="control-input min-w-[360px]" onChange={(event) => setManualInput(event.target.value)} value={manualInput} />
          <button className="control-button" onClick={applyManual} type="button">Применить</button>
          <button className="control-button" onClick={randomValues} type="button">Случайные значения −100…100</button>
          <button className="control-button" onClick={() => { saveStructurePreset('AVL набор', values); setPresets(loadStructurePresets()); }} type="button">Сохранить пресет</button>
        </div>
        {inputError !== null && <p className="mt-2 text-sm text-rose-300">{inputError}</p>}
        {presets.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{presets.slice(0, 6).map((preset) => <button className="control-button" key={preset.id} onClick={() => { setValues(preset.values); setManualInput(preset.values.join(', ')); }} type="button">{preset.name}</button>)}</div>}
      </section>

      <section className="app-panel">
        <h3 className="text-xl font-semibold text-app-primary">Псевдокод вставки в AVL</h3>
        <div className="mt-3 space-y-1 text-sm text-app-muted">
          {['вставить как в обычное BST', 'сравнить ключ с текущим узлом', 'создать новый узел в пустой позиции', 'пересчитать высоту и баланс', 'если случай LL/RR — малый поворот', 'если случай LR/RL — двойной поворот', 'дерево снова сбалансировано'].map((line, index) => (
            <p className={frame?.pseudocode.line === index + 1 ? 'font-semibold text-cyan-200' : ''} key={line}>{index + 1}. {line}</p>
          ))}
        </div>
      </section>

      <StructureVisualizer frame={frame} />

      {status === 'completed' && history.length > 0 && (
        <section className="app-panel">
          <h3 className="text-xl font-semibold text-app-primary">Полный список выполненных шагов</h3>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-app-muted">{history.map((entry, index) => <li key={`${index}-${entry}`}>{entry}</li>)}</ol>
        </section>
      )}

      <PlayerControls canStepBackward={currentIndex > 0} canStepForward={status !== 'completed'} currentIndex={currentIndex} onNextStep={nextStep} onPause={pause} onPlay={play} onPrevStep={prevStep} onReset={() => run(values, loadAlgorithm)} onSpeedChange={setPlaybackSpeed} playbackSpeedMs={playbackSpeedMs} status={status} totalFrames={frames.length} />
    </div>
  );
}

const run = (values: readonly number[], loadAlgorithm: ReturnType<typeof useAlgorithmPlayerStore.getState>['loadAlgorithm']) => {
  const generator = avlScenario(values);
  const first = generator.next();
  if (first.done) loadAlgorithm(generator); else loadAlgorithm(generator, { initialFrame: first.value });
};

const isStructureFrame = (frame: AlgorithmFrame<unknown, Record<string, unknown>> | null): frame is StructureAlgorithmFrame =>
  (frame?.domain === 'tree' || frame?.domain === 'array') && typeof frame.data === 'object' && frame.data !== null && 'cells' in frame.data;
