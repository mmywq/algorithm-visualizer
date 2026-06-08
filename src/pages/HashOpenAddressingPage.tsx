import { useEffect, useMemo, useState } from 'react';
import { hashOpenAddressingScenario } from '@/algorithms/structures/hashTable';
import { PlayerControls } from '@/components/player/PlayerControls';
import { StructureVisualizer } from '@/components/visualizers/structures/StructureVisualizer';
import { loadStructurePresets, saveStructurePreset } from '@/lib/storage';
import { useAlgorithmPlayerStore } from '@/stores';
import type { AlgorithmFrame, StructureAlgorithmFrame } from '@/types';

export function HashOpenAddressingPage() {
  const [manualInput, setManualInput] = useState('15, 25, 35, 45, 12, 22');
  const [values, setValues] = useState<readonly number[]>([15, 25, 35, 45, 12, 22]);
  const [tableSize, setTableSize] = useState(11);
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
    run(values, tableSize, loadAlgorithm);
  }, [loadAlgorithm, tableSize, values]);

  const frame = isStructureFrame(currentFrame) ? currentFrame : null;
  const history = useMemo(() => frames.map((item) => item.description ?? item.message), [frames]);

  const applyManual = () => {
    const parsed = manualInput.split(',').map((value) => value.trim()).filter(Boolean).map(Number);
    if (parsed.length < 2 || parsed.length > tableSize || parsed.some((value) => Number.isInteger(value) === false || Number.isFinite(value) === false)) {
      setInputError(`Введите от 2 до ${tableSize} целых чисел через запятую.`);
      return;
    }

    setInputError(null);
    setValues(parsed);
  };

  const randomValues = () => {
    const count = Math.max(4, Math.min(8, tableSize - 2));
    const next = Array.from({ length: count }, () => Math.floor(Math.random() * 201) - 100);
    setValues(next);
    setManualInput(next.join(', '));
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <section className="app-panel">
        <h1 className="text-3xl font-bold text-app-primary">Хеш-таблица: открытая адресация</h1>
        <p className="mt-2 text-sm text-app-muted">
          Открытая адресация хранит все ключи прямо в массиве таблицы. Если начальная ячейка занята, алгоритм пробирует следующие позиции. Здесь используется линейное пробирование: i, i+1, i+2 с переходом к началу массива.
        </p>
        <p className="mt-2 text-sm text-app-muted">
          Такой подход не создаёт списки в корзинах, но чувствителен к заполненности таблицы: чем меньше свободных ячеек, тем длиннее цепочка проб.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <input className="control-input min-w-[360px]" onChange={(event) => setManualInput(event.target.value)} value={manualInput} />
          <input className="control-input w-32" max={17} min={5} onChange={(event) => setTableSize(Math.max(5, Math.min(17, Number(event.target.value))))} type="number" value={tableSize} />
          <button className="control-button" onClick={applyManual} type="button">Применить</button>
          <button className="control-button" onClick={randomValues} type="button">Случайные значения (до 100)</button>
          <button className="control-button" onClick={() => { saveStructurePreset('Адресация', values); setPresets(loadStructurePresets()); }} type="button">Сохранить пресет</button>
        </div>
        <p className="mt-2 text-xs text-app-muted">Второе поле — размер таблицы (от 5 до 17). Для открытой адресации таблица должна иметь запас свободных ячеек.</p>
        {inputError !== null && <p className="mt-2 text-sm text-rose-300">{inputError}</p>}
        {presets.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{presets.slice(0, 6).map((preset) => <button className="control-button" key={preset.id} onClick={() => { setValues(preset.values); setManualInput(preset.values.join(', ')); }} type="button">{preset.name}</button>)}</div>}
      </section>

      <section className="app-panel">
        <h3 className="text-xl font-semibold text-app-primary">Псевдокод линейного пробирования</h3>
        <div className="mt-3 space-y-1 text-sm text-app-muted">
          {['создать массив таблицы', 'index = hash(key) mod m', 'проверить текущую ячейку', 'если занята — перейти к следующей', 'если свободна — записать ключ', 'если свободных ячеек нет — расширить таблицу'].map((line, index) => (
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

      <PlayerControls canStepBackward={currentIndex > 0} canStepForward={status !== 'completed'} currentIndex={currentIndex} onNextStep={nextStep} onPause={pause} onPlay={play} onPrevStep={prevStep} onReset={() => run(values, tableSize, loadAlgorithm)} onSpeedChange={setPlaybackSpeed} playbackSpeedMs={playbackSpeedMs} status={status} totalFrames={frames.length} />
    </div>
  );
}

const run = (values: readonly number[], tableSize: number, loadAlgorithm: ReturnType<typeof useAlgorithmPlayerStore.getState>['loadAlgorithm']) => {
  const generator = hashOpenAddressingScenario(values, tableSize);
  const first = generator.next();
  if (first.done) loadAlgorithm(generator); else loadAlgorithm(generator, { initialFrame: first.value });
};

const isStructureFrame = (frame: AlgorithmFrame<unknown, Record<string, unknown>> | null): frame is StructureAlgorithmFrame =>
  frame?.domain === 'array' && typeof frame.data === 'object' && frame.data !== null && 'cells' in frame.data;
