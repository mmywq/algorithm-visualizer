import { useEffect, useMemo, useState } from 'react';
import { hashChainingScenario } from '@/algorithms/structures/hashTable';
import { PlayerControls } from '@/components/player/PlayerControls';
import { StructureVisualizer } from '@/components/visualizers/structures/StructureVisualizer';
import { loadStructurePresets, saveStructurePreset } from '@/lib/storage';
import { useAlgorithmPlayerStore } from '@/stores';
import type { AlgorithmFrame, StructureAlgorithmFrame } from '@/types';

export function HashTablePage() {
  const [manualInput, setManualInput] = useState('12, 22, 32, 42, 15, 25');
  const [values, setValues] = useState<readonly number[]>([12, 22, 32, 42, 15, 25]);
  const [bucketCount, setBucketCount] = useState(7);
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
    run(values, bucketCount, loadAlgorithm);
  }, [bucketCount, loadAlgorithm, values]);

  const frame = isStructureFrame(currentFrame) ? currentFrame : null;
  const history = useMemo(() => frames.map((item) => item.description ?? item.message), [frames]);

  const applyManual = () => {
    const parsed = manualInput.split(',').map((value) => value.trim()).filter(Boolean).map(Number);
    if (parsed.length < 2 || parsed.length > 18 || parsed.some((value) => Number.isInteger(value) === false || Number.isFinite(value) === false)) {
      setInputError('Введите от 2 до 18 целых чисел через запятую.');
      return;
    }
    setInputError(null);
    setValues(parsed);
  };

  const randomValues = () => {
    const next = Array.from({ length: 9 }, () => Math.floor(Math.random() * 201) - 100);
    setValues(next);
    setManualInput(next.join(', '));
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <section className="app-panel">
        <h1 className="text-3xl font-bold text-app-primary">Хеш-таблица: метод цепочек</h1>
        <p className="mt-2 text-sm text-app-muted">
          Хеш-таблица хранит ключи по вычисленному индексу. Хеш-функция переводит ключ в номер корзины. Если два ключа попали в одну корзину, возникает коллизия; метод цепочек хранит такие элементы списком внутри одной корзины.
        </p>
        <p className="mt-2 text-sm text-app-muted">Средняя сложность вставки и поиска — O(1), худший случай — O(n), если много ключей попали в одну цепочку.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <input className="control-input min-w-[360px]" value={manualInput} onChange={(event) => setManualInput(event.target.value)} />
          <input className="control-input w-32" min={3} max={13} type="number" value={bucketCount} onChange={(event) => setBucketCount(Math.max(3, Math.min(13, Number(event.target.value))))} />
          <button className="control-button" onClick={applyManual} type="button">Применить</button>
          <button className="control-button" onClick={randomValues} type="button">Случайные значения (до 100)</button>
          <button className="control-button" onClick={() => { saveStructurePreset('Хеш-набор', values); setPresets(loadStructurePresets()); }} type="button">Сохранить пресет</button>
        </div>
        <p className="mt-2 text-xs text-app-muted">Второе поле — число корзин таблицы (от 3 до 13).</p>
        {inputError !== null && <p className="mt-2 text-sm text-rose-300">{inputError}</p>}
        {presets.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{presets.slice(0, 6).map((preset) => <button className="control-button" key={preset.id} onClick={() => { setValues(preset.values); setManualInput(preset.values.join(', ')); }} type="button">{preset.name}</button>)}</div>}
      </section>

      <section className="app-panel">
        <h3 className="text-xl font-semibold text-app-primary">Псевдокод вставки</h3>
        <div className="mt-3 space-y-1 text-sm text-app-muted">
          {['создать массив корзин', 'bucket = hash(key) mod m', 'если корзина не пуста, это коллизия', 'добавить ключ в цепочку корзины', 'повторить для всех ключей'].map((line, index) => (
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

      <PlayerControls canStepBackward={currentIndex > 0} canStepForward={status !== 'completed'} currentIndex={currentIndex} onNextStep={nextStep} onPause={pause} onPlay={play} onPrevStep={prevStep} onReset={() => run(values, bucketCount, loadAlgorithm)} onSpeedChange={setPlaybackSpeed} playbackSpeedMs={playbackSpeedMs} status={status} totalFrames={frames.length} />
    </div>
  );
}

const run = (values: readonly number[], bucketCount: number, loadAlgorithm: ReturnType<typeof useAlgorithmPlayerStore.getState>['loadAlgorithm']) => {
  const generator = hashChainingScenario(values, bucketCount);
  const first = generator.next();
  if (first.done) loadAlgorithm(generator); else loadAlgorithm(generator, { initialFrame: first.value });
};

const isStructureFrame = (frame: AlgorithmFrame<unknown, Record<string, unknown>> | null): frame is StructureAlgorithmFrame =>
  frame?.domain === 'array' && typeof frame.data === 'object' && frame.data !== null && 'cells' in frame.data;
