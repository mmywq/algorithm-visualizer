import { useEffect, useMemo, useState } from 'react';
import { indexingDemo, queueArrayDemo, queueListDemo, stackArrayDemo, stackListDemo } from '@/algorithms/structures';
import { PlayerControls } from '@/components/player/PlayerControls';
import { StructureVisualizer } from '@/components/visualizers/structures/StructureVisualizer';
import { loadStructurePresets, removeStructurePreset, renameStructurePreset, saveStructurePreset } from '@/lib/storage';
import { useAlgorithmPlayerStore } from '@/stores';
import type { AlgorithmFrame, StructureAlgorithmFrame } from '@/types';

type DemoKey = 'stack-array' | 'stack-list' | 'queue-array' | 'queue-list' | 'indexing';

const MAX_VALUE = 100;

const theoryByDemo: Record<DemoKey, { title: string; description: string; complexity: string; example: string }> = {
  'stack-array': {
    title: 'Стек на массиве (LIFO)',
    description: 'Стек — структура данных с принципом «последним пришёл — первым вышел». Операция push добавляет элемент в вершину, pop снимает элемент с вершины. Все действия происходят только с концом структуры.',
    complexity: 'push/pop: O(1)',
    example: 'Пример: push(10), push(20), pop() вернёт 20.',
  },
  'stack-list': {
    title: 'Стек на связном списке',
    description: 'В списковой реализации вершина стека — это голова списка. Добавление и удаление в голову выполняются за константное время и не требуют сдвига элементов.',
    complexity: 'push/pop: O(1)',
    example: 'Пример: head=7 -> 5 -> 3. После pop() head станет 5.',
  },
  'queue-array': {
    title: 'Очередь на массиве (FIFO)',
    description: 'Очередь работает по принципу «первым пришёл — первым вышел». Элемент добавляется в хвост (tail), удаляется из головы (head). Для наглядности используются два указателя: head и tail.',
    complexity: 'enqueue/dequeue: O(1)',
    example: 'Пример: enqueue(4), enqueue(9), dequeue() вернёт 4.',
  },
  'queue-list': {
    title: 'Очередь на связном списке',
    description: 'Очередь хранит ссылки на голову и хвост списка. Это позволяет добавлять в конец и удалять из начала без линейных сдвигов.',
    complexity: 'enqueue/dequeue: O(1)',
    example: 'Пример: head=2 -> 8 -> 6, tail=6. После dequeue() head станет 8.',
  },
  indexing: {
    title: 'Индексирование массива',
    description: 'Индексирование — доступ к элементу по его позиции. В массивах это базовая операция: по индексу i мы мгновенно получаем a[i], потому что адрес ячейки вычисляется по формуле смещения.',
    complexity: 'доступ по индексу: O(1)',
    example: 'Пример: a=[11, 20, 35], тогда a[1] = 20.',
  },
};

interface StructuresPageProps {
  readonly initialDemo?: DemoKey;
}

export function StructuresPage({ initialDemo = 'stack-array' }: StructuresPageProps) {
  const [demoKey, setDemoKey] = useState<DemoKey>(initialDemo);
  const [showHelp, setShowHelp] = useState(false);
  const [manualInput, setManualInput] = useState('8, 3, 5, 1, 9');
  const [inputError, setInputError] = useState<string | null>(null);
  const [values, setValues] = useState<readonly number[]>([8, 3, 5, 1, 9]);
  const [presetName, setPresetName] = useState('');
  const [presets, setPresets] = useState(loadStructurePresets());
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

  useEffect(() => {
    setDemoKey(initialDemo);
  }, [initialDemo]);

  useEffect(() => {
    runDemo(demoKey, values, loadAlgorithm);
  }, [demoKey, loadAlgorithm, values]);

  const frame = isStructureAlgorithmFrame(currentFrame) ? currentFrame : null;
  const stepsHistory = useMemo(() => frames.map((stepFrame) => stepFrame.description ?? stepFrame.message), [frames]);

  const applyManualValues = () => {
    const parsed = manualInput.split(',').map((item) => item.trim()).filter(Boolean).map(Number);
    if (parsed.length < 2 || parsed.some((value) => Number.isFinite(value) === false || Number.isInteger(value) === false)) {
      setInputError('Введите минимум 2 целых числа через запятую.');
      return;
    }
    setInputError(null);
    setValues(parsed);
  };

  const randomizeValues = () => {
    const size = Math.max(4, Math.min(10, values.length));
    const next = Array.from({ length: size }, () => Math.floor(Math.random() * (2 * MAX_VALUE + 1)) - MAX_VALUE);
    setValues(next);
    setManualInput(next.join(', '));
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <section className="app-panel">
        <div className="flex items-center justify-between gap-3"><h1 className="text-3xl font-bold text-app-primary">Базовые структуры данных</h1><button className="control-button" type="button" onClick={() => setShowHelp(true)}>Справка</button></div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="control-button" onClick={() => setDemoKey('stack-array')} type="button">Стек (массив)</button>
          <button className="control-button" onClick={() => setDemoKey('stack-list')} type="button">Стек (список)</button>
          <button className="control-button" onClick={() => setDemoKey('queue-array')} type="button">Очередь (массив)</button>
          <button className="control-button" onClick={() => setDemoKey('queue-list')} type="button">Очередь (список)</button>
          <button className="control-button" onClick={() => setDemoKey('indexing')} type="button">Индексирование</button>
        </div>

        <div className="mt-4 grid gap-3 rounded-2xl border border-app bg-surface p-4">
          <div className="flex gap-2">
            <input className="control-input w-full" value={manualInput} onChange={(event) => setManualInput(event.target.value)} placeholder="Введите числа через запятую" />
            <button className="control-button" onClick={applyManualValues} type="button">Применить</button>
            <button className="control-button" onClick={randomizeValues} type="button">Случайные значения (до 100)</button>
          </div>
          {inputError && <p className="text-sm text-rose-300">{inputError}</p>}
          <div className="flex flex-wrap gap-2">
            <input className="control-input" value={presetName} onChange={(event) => setPresetName(event.target.value)} placeholder="Имя пресета" />
            <button className="control-button" type="button" onClick={() => { saveStructurePreset(presetName.trim() || `Набор ${new Date().toLocaleTimeString()}`, values); setPresetName(''); setPresets(loadStructurePresets()); }}>Сохранить пресет</button>
          </div>
          {presets.length > 0 && <div className="grid gap-2 md:grid-cols-2">{presets.slice(0, 8).map((preset) => <div key={preset.id} className="flex items-center gap-2"><button className="control-button flex-1" type="button" onClick={() => { setValues(preset.values); setManualInput(preset.values.join(', ')); }}>{preset.name}</button><button className="control-button" type="button" onClick={() => setRenamePresetState({ id: preset.id, name: preset.name })}>Переим.</button><button className="control-button" type="button" onClick={() => { removeStructurePreset(preset.id); setPresets(loadStructurePresets()); }}>Удалить</button></div>)}</div>}
          {renamePresetState && <div className="flex items-center gap-2"><input className="control-input" value={renamePresetState.name} onChange={(event) => setRenamePresetState({ ...renamePresetState, name: event.target.value })} /><button className="control-button" type="button" onClick={() => { renameStructurePreset(renamePresetState.id, renamePresetState.name); setRenamePresetState(null); setPresets(loadStructurePresets()); }}>Сохранить</button></div>}
        </div>

        <div className="mt-4 rounded-2xl border border-app bg-surface p-4 text-sm">
          <h2 className="text-lg font-semibold text-app-primary">{theoryByDemo[demoKey].title}</h2>
          <p className="mt-2 text-app-muted">{theoryByDemo[demoKey].description}</p>
          <p className="mt-2 text-app-muted"><strong>Сложность:</strong> {theoryByDemo[demoKey].complexity}</p>
          <p className="mt-2 text-app-muted"><strong>Пример:</strong> {theoryByDemo[demoKey].example}</p>
          <p className="mt-2 text-app-muted"><strong>Пояснение текущего шага:</strong> {frame?.description ?? frame?.message ?? 'Запустите плеер для пошагового разбора.'}</p>
        </div>

      {showHelp && <div className="mt-4 rounded-2xl border border-app bg-surface p-4 text-sm text-app-muted"><p className="font-semibold text-app-primary">Как пользоваться</p><ul className="mt-2 list-disc space-y-1 pl-5"><li>Выберите структуру кнопками сверху.</li><li>Введите свои значения или используйте пресеты/рандом.</li><li>Запустите анимацию через кнопки плеера: шаг назад/вперёд, авто-проигрывание.</li><li>Следите за указателями head/tail/top/i и пояснением шага.</li></ul><button className="control-button mt-3" type="button" onClick={() => setShowHelp(false)}>Закрыть</button></div>}
      </section>

      <StructureVisualizer frame={frame} />

      {status === 'completed' && stepsHistory.length > 0 && (
        <section className="app-panel">
          <h3 className="text-xl font-semibold text-app-primary">Полный список выполненных шагов</h3>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-app-muted">
            {stepsHistory.map((entry) => (<li key={entry}>{entry}</li>))}
          </ol>
        </section>
      )}

      <PlayerControls
        canStepBackward={currentIndex > 0}
        canStepForward={status !== 'completed'}
        currentIndex={currentIndex}
        onNextStep={nextStep}
        onPause={pause}
        onPlay={play}
        onPrevStep={prevStep}
        onReset={() => runDemo(demoKey, values, loadAlgorithm)}
        onSpeedChange={setPlaybackSpeed}
        playbackSpeedMs={playbackSpeedMs}
        status={status}
        totalFrames={frames.length}
      />
    </div>
  );
}

const runDemo = (demoKey: DemoKey, values: readonly number[], loadAlgorithm: ReturnType<typeof useAlgorithmPlayerStore.getState>['loadAlgorithm']) => {
  const generator =
    demoKey === 'stack-array'
      ? stackArrayDemo({ values })
      : demoKey === 'stack-list'
        ? stackListDemo({ values })
        : demoKey === 'queue-array'
          ? queueArrayDemo({ values })
          : demoKey === 'queue-list'
            ? queueListDemo({ values })
            : indexingDemo({ values });
  const first = generator.next();
  if (first.done) loadAlgorithm(generator); else loadAlgorithm(generator, { initialFrame: first.value });
};

const isStructureAlgorithmFrame = (
  frame: AlgorithmFrame<unknown, Record<string, unknown>> | null,
): frame is StructureAlgorithmFrame =>
  frame?.domain === 'array' &&
  typeof frame.data === 'object' &&
  frame.data !== null &&
  'cells' in frame.data;
