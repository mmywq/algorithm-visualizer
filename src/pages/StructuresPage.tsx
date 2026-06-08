import { useEffect, useMemo, useState } from 'react';
import { indexingDemo, queueArrayDemo, queueListDemo, stackArrayDemo, stackListDemo } from '@/algorithms/structures';
import { PlayerControls } from '@/components/player/PlayerControls';
import { StepTutorPanel } from '@/components/player/StepTutorPanel';
import { StructureVisualizer } from '@/components/visualizers/structures/StructureVisualizer';
import { loadStructurePresets, removeStructurePreset, renameStructurePreset, saveStructurePreset } from '@/lib/storage';
import { useAlgorithmPlayerStore } from '@/stores';
import type { AlgorithmFrame, StructureAlgorithmFrame } from '@/types';

type DemoKey = 'stack-array' | 'stack-list' | 'queue-array' | 'queue-list' | 'indexing';

const MIN_VALUE = -100;
const MAX_VALUE = 100;
const MIN_VALUES = 2;
const MAX_VALUES = 16;

const theoryByDemo: Record<DemoKey, { title: string; description: string; complexity: string; useCases: readonly string[]; pseudocodeLines: readonly string[] }> = {
  'stack-array': {
    title: 'Стек на массиве (LIFO)',
    description: 'Стек — структура данных с принципом «последним пришёл — первым вышел». Операция push добавляет элемент в вершину, pop снимает элемент с вершины. Все действия происходят только с концом структуры.',
    complexity: 'push/pop: O(1), просмотр всех элементов: O(n)',
    useCases: ['Отмена действий в редакторе', 'Проверка скобочных последовательностей', 'Стек вызовов функций', 'Обход графа/дерева в глубину'],
    pseudocodeLines: ['создать массив фиксированной ёмкости', 'push: увеличить top и записать значение', 'читать/показывать только вершину top', 'pop: взять a[top] и очистить ячейку', 'уменьшить top', 'завершить, когда стек пуст'],
  },
  'stack-list': {
    title: 'Стек на связном списке',
    description: 'В списковой реализации вершина стека — это голова списка. Добавление и удаление в голову выполняются за константное время и не требуют сдвига элементов.',
    complexity: 'push/pop: O(1), память O(n) на узлы и ссылки',
    useCases: ['Стек без заранее заданной ёмкости', 'История переходов', 'Рекурсивные обходы', 'Сценарии с частыми добавлениями в начало'],
    pseudocodeLines: ['head указывает на вершину стека', 'push: создать новый узел', 'связать новый узел со старым head', 'pop: снять head', 'переставить head на следующий узел', 'завершить, когда head пуст'],
  },
  'queue-array': {
    title: 'Очередь на массиве (FIFO)',
    description: 'Очередь работает по принципу «первым пришёл — первым вышел». Элемент добавляется в хвост (tail), удаляется из головы (head). Для наглядности используются два указателя: head и tail.',
    complexity: 'enqueue/dequeue: O(1), просмотр всех элементов: O(n)',
    useCases: ['Планировщики задач', 'Буферы сообщений', 'BFS — поиск в ширину', 'Обработка событий в порядке поступления'],
    pseudocodeLines: ['head показывает первый элемент очереди', 'tail показывает позицию вставки', 'enqueue: записать значение в tail', 'dequeue: взять значение из head', 'сдвинуть head вправо', 'завершить, когда head догнал tail'],
  },
  'queue-list': {
    title: 'Очередь на связном списке',
    description: 'Очередь хранит ссылки на голову и хвост списка. Это позволяет добавлять в конец и удалять из начала без линейных сдвигов.',
    complexity: 'enqueue/dequeue: O(1), память O(n) на узлы и ссылки',
    useCases: ['Очереди неизвестного заранее размера', 'Потоки задач', 'Очередь печати/запросов', 'Моделирование процессов FIFO'],
    pseudocodeLines: ['head — начало очереди, tail — конец', 'enqueue: добавить новый узел после tail', 'обновить tail', 'dequeue: взять узел head', 'переставить head на следующий узел', 'если очередь пуста, сбросить tail'],
  },
  indexing: {
    title: 'Индексирование массива',
    description: 'Индексирование — доступ к элементу по его позиции. В массивах это базовая операция: по индексу i мы мгновенно получаем a[i], потому что адрес ячейки вычисляется по формуле смещения.',
    complexity: 'доступ по индексу: O(1), последовательный просмотр: O(n)',
    useCases: ['Массивы и таблицы', 'Быстрый доступ по позиции', 'Базовая модель памяти', 'Подготовка к поиску и сортировкам'],
    pseudocodeLines: ['хранить базовый адрес массива', 'выбрать индекс i', 'адрес = base + i × размер_элемента', 'прочитать a[i]', 'перейти к следующему индексу', 'завершить после последней позиции'],
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
    const parsed = parseStructureValues(manualInput);
    if (!parsed.ok) {
      setInputError(parsed.error);
      return;
    }
    setInputError(null);
    setValues(parsed.values);
  };

  const randomizeValues = () => {
    const size = Math.max(4, Math.min(10, values.length));
    const next = Array.from({ length: size }, () => Math.floor(Math.random() * (MAX_VALUE - MIN_VALUE + 1)) + MIN_VALUE);
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

        <p className="mt-3 text-xs text-app-muted">Диапазон значений: от {MIN_VALUE} до {MAX_VALUE}. Набор из одинаковых чисел не запускается, потому что он плохо показывает отличие операций.</p>

      {showHelp && <div className="mt-4 rounded-2xl border border-app bg-surface p-4 text-sm text-app-muted"><p className="font-semibold text-app-primary">Как пользоваться</p><ul className="mt-2 list-disc space-y-1 pl-5"><li>Выберите структуру кнопками сверху.</li><li>Введите свои значения или используйте пресеты/рандом.</li><li>Запустите анимацию через кнопки плеера: шаг назад/вперёд, авто-проигрывание.</li><li>Следите за русскими подписями указателей head/tail/top/i и пояснением шага.</li></ul><button className="control-button mt-3" type="button" onClick={() => setShowHelp(false)}>Закрыть</button></div>}
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <StructureVisualizer frame={frame} />
        <StepTutorPanel
          complexity={theoryByDemo[demoKey].complexity}
          frame={frame}
          pseudocodeLines={theoryByDemo[demoKey].pseudocodeLines}
          title={`${theoryByDemo[demoKey].title}. ${theoryByDemo[demoKey].description}`}
          useCases={theoryByDemo[demoKey].useCases}
        />
      </section>

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


const parseStructureValues = (source: string): { ok: true; values: readonly number[] } | { ok: false; error: string } => {
  const segments = source.split(',').map((item) => item.trim()).filter((item) => item.length > 0);
  if (segments.length < MIN_VALUES) {
    return { ok: false, error: `Введите минимум ${MIN_VALUES} целых числа через запятую.` };
  }
  if (segments.length > MAX_VALUES) {
    return { ok: false, error: `Слишком много значений: максимум ${MAX_VALUES}, чтобы визуализация оставалась читаемой.` };
  }

  const values: number[] = [];
  for (const segment of segments) {
    if (/^-?\d+$/.test(segment) === false) {
      return { ok: false, error: `Недопустимое значение «${segment}». Используйте только целые числа.` };
    }
    const value = Number(segment);
    if (value < MIN_VALUE || value > MAX_VALUE) {
      return { ok: false, error: `Число ${value} вне диапазона ${MIN_VALUE}…${MAX_VALUE}.` };
    }
    values.push(value);
  }

  if (new Set(values).size === 1) {
    return { ok: false, error: 'Все значения одинаковые. Добавьте хотя бы одно отличающееся число, чтобы демонстрация была наглядной.' };
  }

  return { ok: true, values };
};

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
  (frame?.domain === 'array' || frame?.domain === 'tree') &&
  typeof frame.data === 'object' &&
  frame.data !== null &&
  'cells' in frame.data;
