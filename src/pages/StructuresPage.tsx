import { useEffect, useMemo, useState } from 'react';
import { indexingDemo, queueArrayDemo, queueListDemo, stackArrayDemo, stackListDemo } from '@/algorithms/structures';
import { PlayerControls } from '@/components/player/PlayerControls';
import { StepHistoryPanel } from '@/components/player/StepHistoryPanel';
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
    description: 'Стек — линейная структура данных с доступом только к одному концу, который называется вершиной. Правило LIFO означает, что последним добавленный элемент становится первым доступным для удаления. В массивной реализации элементы размещаются в последовательных ячейках, а индекс top хранит положение текущей вершины. Если top = -1, стек пуст.',
    complexity: 'push/pop: O(1), просмотр всех элементов: O(n), память: O(n)',
    useCases: ['Стек вызовов функций', 'Проверка скобочных последовательностей', 'Откат действий', 'Итеративный обход в глубину'],
    pseudocodeLines: ['создать массив и установить top = -1', 'push: увеличить top', 'записать значение в a[top]', 'pop: прочитать a[top]', 'очистить a[top] и уменьшить top', 'завершить при top = -1'],
  },
  'stack-list': {
    title: 'Стек на связном списке',
    description: 'В связной реализации стек хранится как последовательность узлов, где каждый узел содержит значение и ссылку на следующий узел. Вершина стека совпадает с головой списка head. Добавление создаёт новый узел перед текущей головой, а удаление переставляет head на следующий узел. Размер структуры не требует заранее фиксированной ёмкости.',
    complexity: 'push/pop: O(1), память: O(n) на значения и ссылки',
    useCases: ['Стек переменного размера', 'Рекурсивные и итеративные обходы', 'История переходов', 'Алгоритмы с частыми вставками в начало'],
    pseudocodeLines: ['head указывает на вершину стека', 'push: создать новый узел', 'связать новый узел со старым head', 'назначить новый узел как head', 'pop: прочитать head', 'переставить head на следующий узел'],
  },
  'queue-array': {
    title: 'Очередь на массиве (FIFO)',
    description: 'Очередь — линейная структура данных, в которой добавление выполняется в хвост, а удаление — из головы. Правило FIFO означает, что раньше добавленный элемент обслуживается раньше. В массивной реализации head хранит индекс первого элемента, а tail — позицию следующей вставки. Очередь пуста, когда head и tail равны.',
    complexity: 'enqueue/dequeue: O(1), просмотр всех элементов: O(n), память: O(n)',
    useCases: ['Планирование задач', 'Буферы сообщений', 'Поиск в ширину', 'Обработка событий в порядке поступления'],
    pseudocodeLines: ['установить head = 0 и tail = 0', 'enqueue: записать значение в a[tail]', 'увеличить tail', 'dequeue: прочитать a[head]', 'очистить a[head] и увеличить head', 'завершить при head = tail'],
  },
  'queue-list': {
    title: 'Очередь на связном списке',
    description: 'Связная очередь хранит два указателя: head на первый узел и tail на последний узел. Добавление создаёт новый узел после tail, а удаление извлекает узел head. Такая организация сохраняет порядок FIFO и позволяет выполнять основные операции без сдвига элементов массива.',
    complexity: 'enqueue/dequeue: O(1), память: O(n) на значения и ссылки',
    useCases: ['Очереди неизвестного заранее размера', 'Потоки запросов', 'Очередь печати', 'Моделирование процессов обслуживания'],
    pseudocodeLines: ['head указывает на первый узел, tail — на последний', 'enqueue: создать новый узел', 'присоединить его после tail', 'обновить tail', 'dequeue: прочитать head', 'переставить head на следующий узел'],
  },
  indexing: {
    title: 'Индексирование массива',
    description: 'Индексирование — операция доступа к элементу массива по его порядковому номеру. Для массива фиксированного типа адрес элемента вычисляется как базовый адрес плюс смещение, зависящее от индекса и размера элемента. Поэтому доступ к a[i] выполняется за постоянное время, если индекс находится в допустимых границах.',
    complexity: 'доступ по индексу: O(1), последовательный просмотр: O(n)',
    useCases: ['Быстрый доступ по позиции', 'Табличные структуры', 'Базовая модель памяти массива', 'Основа для сортировок и поиска'],
    pseudocodeLines: ['задать базовый адрес массива', 'выбрать допустимый индекс i', 'вычислить смещение i × размер элемента', 'получить адрес нужной ячейки', 'прочитать значение a[i]', 'повторять для следующих индексов при обходе'],
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
            <button className="control-button" onClick={randomizeValues} type="button">Случайные значения −100…100</button>
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

      {status === 'completed' && <StepHistoryPanel steps={stepsHistory} />}

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
