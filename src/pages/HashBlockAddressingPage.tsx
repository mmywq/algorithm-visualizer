import { useEffect, useMemo, useState } from 'react';
import { hashBlockAddressingScenario } from '@/algorithms/structures/hashTable';
import { PlayerControls } from '@/components/player/PlayerControls';
import { StructureVisualizer } from '@/components/visualizers/structures/StructureVisualizer';
import { loadStructurePresets, saveStructurePreset } from '@/lib/storage';
import { useAlgorithmPlayerStore } from '@/stores';
import type { AlgorithmFrame, StructureAlgorithmFrame } from '@/types';

export function HashBlockAddressingPage() {
  const [manualInput, setManualInput] = useState('11, 21, 31, 41, 51, 61, 71');
  const [values, setValues] = useState<readonly number[]>([11, 21, 31, 41, 51, 61, 71]);
  const [blockCount, setBlockCount] = useState(5);
  const [blockSize, setBlockSize] = useState(2);
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
    run(values, blockCount, blockSize, loadAlgorithm);
  }, [blockCount, blockSize, loadAlgorithm, values]);

  const frame = isStructureFrame(currentFrame) ? currentFrame : null;
  const history = useMemo(() => frames.map((item) => item.description ?? item.message), [frames]);

  const applyManual = () => {
    const parsed = manualInput.split(',').map((value) => value.trim()).filter(Boolean).map(Number);
    if (parsed.length < 2 || parsed.length > 20 || parsed.some((value) => Number.isInteger(value) === false || Number.isFinite(value) === false)) {
      setInputError('Введите от 2 до 20 целых чисел через запятую.');
      return;
    }

    setInputError(null);
    setValues(parsed);
  };

  const randomValues = () => {
    const next = Array.from({ length: 10 }, () => Math.floor(Math.random() * 201) - 100);
    setValues(next);
    setManualInput(next.join(', '));
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <section className="app-panel">
        <h1 className="text-3xl font-bold text-app-primary">Хеш-таблица: блочная адресация</h1>
        <p className="mt-2 text-sm text-app-muted">
          Блочная адресация делит таблицу на блоки фиксированного размера. Хеш-функция выбирает основной блок, а если он заполнен, создаётся дополнительный overflow-блок для переполнения.
        </p>
        <p className="mt-2 text-sm text-app-muted">
          Такой метод показывает компромисс: несколько ключей можно хранить рядом в одном блоке, но при плохом распределении появляются дополнительные блоки, которые увеличивают путь поиска.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <input className="control-input min-w-[360px]" onChange={(event) => setManualInput(event.target.value)} value={manualInput} />
          <input className="control-input w-32" max={9} min={3} onChange={(event) => setBlockCount(Math.max(3, Math.min(9, Number(event.target.value))))} type="number" value={blockCount} />
          <input className="control-input w-32" max={4} min={2} onChange={(event) => setBlockSize(Math.max(2, Math.min(4, Number(event.target.value))))} type="number" value={blockSize} />
          <button className="control-button" onClick={applyManual} type="button">Применить</button>
          <button className="control-button" onClick={randomValues} type="button">Случайные значения (до 100)</button>
          <button className="control-button" onClick={() => { saveStructurePreset('Блочная адресация', values); setPresets(loadStructurePresets()); }} type="button">Сохранить пресет</button>
        </div>
        <p className="mt-2 text-xs text-app-muted">Второе поле — число основных блоков, третье — размер блока.</p>
        {inputError !== null && <p className="mt-2 text-sm text-rose-300">{inputError}</p>}
        {presets.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{presets.slice(0, 6).map((preset) => <button className="control-button" key={preset.id} onClick={() => { setValues(preset.values); setManualInput(preset.values.join(', ')); }} type="button">{preset.name}</button>)}</div>}
      </section>

      <section className="app-panel">
        <h3 className="text-xl font-semibold text-app-primary">Псевдокод блочной вставки</h3>
        <div className="mt-3 space-y-1 text-sm text-app-muted">
          {['создать основные блоки фиксированного размера', 'block = hash(key) mod blockCount', 'если в блоке есть место — вставить ключ', 'если блок заполнен — зафиксировать переполнение', 'создать overflow-блок и записать ключ', 'повторить для всех ключей'].map((line, index) => (
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

      <PlayerControls canStepBackward={currentIndex > 0} canStepForward={status !== 'completed'} currentIndex={currentIndex} onNextStep={nextStep} onPause={pause} onPlay={play} onPrevStep={prevStep} onReset={() => run(values, blockCount, blockSize, loadAlgorithm)} onSpeedChange={setPlaybackSpeed} playbackSpeedMs={playbackSpeedMs} status={status} totalFrames={frames.length} />
    </div>
  );
}

const run = (values: readonly number[], blockCount: number, blockSize: number, loadAlgorithm: ReturnType<typeof useAlgorithmPlayerStore.getState>['loadAlgorithm']) => {
  const generator = hashBlockAddressingScenario(values, blockCount, blockSize);
  const first = generator.next();
  if (first.done) loadAlgorithm(generator); else loadAlgorithm(generator, { initialFrame: first.value });
};

const isStructureFrame = (frame: AlgorithmFrame<unknown, Record<string, unknown>> | null): frame is StructureAlgorithmFrame =>
  frame?.domain === 'array' && typeof frame.data === 'object' && frame.data !== null && 'cells' in frame.data;
