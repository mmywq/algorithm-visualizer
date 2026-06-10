import { useEffect, useMemo, useState } from 'react';
import { indexingDemo, queueArrayDequeueDemo, queueArrayEnqueueDemo, queueListDequeueDemo, queueListEnqueueDemo, stackArrayPopDemo, stackArrayPushDemo, stackListPopDemo, stackListPushDemo } from '@/algorithms/structures';
import { PlayerControls } from '@/components/player/PlayerControls';
import { StepHistoryPanel } from '@/components/player/StepHistoryPanel';
import { StepTutorPanel } from '@/components/player/StepTutorPanel';
import { StructureVisualizer } from '@/components/visualizers/structures/StructureVisualizer';
import { loadStructurePresets, removeStructurePreset, renameStructurePreset, saveStructurePreset } from '@/lib/storage';
import { useAlgorithmPlayerStore } from '@/stores';
import type { AlgorithmFrame, StructureAlgorithmFrame } from '@/types';

type DemoKey = 'stack-array-push' | 'stack-array-pop' | 'stack-list-push' | 'stack-list-pop' | 'queue-array-enqueue' | 'queue-array-dequeue' | 'queue-list-enqueue' | 'queue-list-dequeue' | 'indexing';

const MIN_VALUE = -100;
const MAX_VALUE = 100;
const MIN_VALUES = 2;
const MAX_VALUES = 16;

const theoryByDemo: Record<DemoKey, { title: string; description: string; complexity: string; useCases: readonly string[]; pseudocodeLines: readonly string[] }> = {
  'stack-array-push': {
    title: 'Стек на массиве: push (LIFO)',
    description: 'Стек — линейная структура данных с доступом только к одному концу, который называется вершиной. Правило LIFO означает, что последним добавленный элемент становится первым доступным для удаления. В этом режиме отдельно показывается только операция push: увеличение top и запись нового значения в вершину стека.',
    complexity: 'push: O(1), просмотр всех элементов: O(n), память: O(n)',
    useCases: ['Добавление элемента в вершину стека', 'Подготовка данных перед обратным обходом', 'Откат действий', 'Работа со стеком вызовов'],
    pseudocodeLines: ['создать массив и установить top = -1', 'push: увеличить top', 'записать значение в a[top]', 'остановиться после добавления всех элементов'],
  },
  'stack-array-pop': {
    title: 'Стек на массиве: pop (LIFO)',
    description: 'Стек — линейная структура данных с доступом только к одному концу, который называется вершиной. Правило LIFO означает, что последним добавленный элемент становится первым доступным для удаления. В этом режиме отдельно показывается только операция pop: чтение текущей вершины, очистка ячейки и сдвиг указателя top вниз.',
    complexity: 'pop: O(1), просмотр всех элементов: O(n), память: O(n)',
    useCases: ['Удаление последнего добавленного элемента', 'Возврат из рекурсивных вызовов', 'Отмена действий', 'Проверка соответствия скобок'],
    pseudocodeLines: ['проверить, что top не равен -1', 'прочитать a[top]', 'очистить a[top]', 'уменьшить top', 'завершить при top = -1'],
  },
  'stack-list-push': {
    title: 'Стек на связном списке: push',
    description: 'В связной реализации стек хранится как последовательность узлов, где каждый узел содержит значение и ссылку на следующий узел. Вершина стека совпадает с головой списка head. В этом режиме отдельно показывается только push: создание нового узла и перенос head на него.',
    complexity: 'push: O(1), память: O(n) на значения и ссылки',
    useCases: ['Стек переменного размера', 'Рекурсивные и итеративные обходы', 'История переходов', 'Алгоритмы с частыми вставками в начало'],
    pseudocodeLines: ['head указывает на вершину стека', 'push: создать новый узел', 'связать новый узел со старым head', 'назначить новый узел как head'],
  },
  'stack-list-pop': {
    title: 'Стек на связном списке: pop',
    description: 'В связной реализации стек хранится как последовательность узлов, где каждый узел содержит значение и ссылку на следующий узел. Вершина стека совпадает с головой списка head. В этом режиме отдельно показывается только pop: чтение значения в head и перенос головы на следующий узел.',
    complexity: 'pop: O(1), память: O(n) на значения и ссылки',
    useCases: ['Стек переменного размера', 'Рекурсивные и итеративные обходы', 'История переходов', 'Алгоритмы с частыми вставками в начало'],
    pseudocodeLines: ['head указывает на вершину стека', 'pop: прочитать head', 'переставить head на следующий узел'],
  },
  'queue-array-enqueue': {
    title: 'Очередь на массиве: enqueue (FIFO)',
    description: 'Очередь — линейная структура данных, в которой добавление выполняется в хвост, а удаление — из головы. Правило FIFO означает, что раньше добавленный элемент обслуживается раньше. В этом режиме отдельно показывается только операция enqueue: запись нового элемента в позицию tail и сдвиг хвоста очереди.',
    complexity: 'enqueue: O(1), просмотр всех элементов: O(n), память: O(n)',
    useCases: ['Планирование задач', 'Буферы сообщений', 'Поиск в ширину', 'Обработка событий в порядке поступления'],
    pseudocodeLines: ['установить head = 0 и tail = 0', 'enqueue: записать значение в a[tail]', 'увеличить tail', 'остановиться после добавления всех элементов'],
  },
  'queue-array-dequeue': {
    title: 'Очередь на массиве: dequeue (FIFO)',
    description: 'Очередь — линейная структура данных, в которой добавление выполняется в хвост, а удаление — из головы. Правило FIFO означает, что раньше добавленный элемент обслуживается раньше. В этом режиме отдельно показывается только операция dequeue: чтение головы очереди, очистка ячейки и сдвиг head вправо.',
    complexity: 'dequeue: O(1), просмотр всех элементов: O(n), память: O(n)',
    useCases: ['Извлечение задач в порядке поступления', 'Буферы сообщений', 'Поиск в ширину', 'Потоковая обработка данных'],
    pseudocodeLines: ['установить head = 0 и tail = длина очереди', 'dequeue: прочитать a[head]', 'очистить a[head]', 'увеличить head', 'завершить при head = tail'],
  },
  'queue-list-enqueue': {
    title: 'Очередь на связном списке: enqueue',
    description: 'Связная очередь хранит два указателя: head на первый узел и tail на последний узел. Добавление создаёт новый узел после tail, а удаление извлекает узел head. В этом режиме отдельно показывается только enqueue: присоединение узла в конец списка и обновление tail.',
    complexity: 'enqueue: O(1), память: O(n) на значения и ссылки',
    useCases: ['Очереди неизвестного заранее размера', 'Потоки запросов', 'Очередь печати', 'Моделирование процессов обслуживания'],
    pseudocodeLines: ['head указывает на первый узел, tail — на последний', 'enqueue: создать новый узел', 'присоединить его после tail', 'обновить tail'],
  },
  'queue-list-dequeue': {
    title: 'Очередь на связном списке: dequeue',
    description: 'Связная очередь хранит два указателя: head на первый узел и tail на последний узел. Добавление создаёт новый узел после tail, а удаление извлекает узел head. В этом режиме отдельно показывается только dequeue: чтение головы и перенос head на следующий узел.',
    complexity: 'dequeue: O(1), память: O(n) на значения и ссылки',
    useCases: ['Очереди неизвестного заранее размера', 'Потоки запросов', 'Очередь печати', 'Моделирование процессов обслуживания'],
    pseudocodeLines: ['head указывает на первый узел, tail — на последний', 'dequeue: прочитать head', 'переставить head на следующий узел'],
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

export function StructuresPage({ initialDemo = 'stack-array-push' }: StructuresPageProps) {
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
          <button className="control-button" onClick={() => setDemoKey('stack-array-push')} type="button">Стек push (массив)</button>
          <button className="control-button" onClick={() => setDemoKey('stack-array-pop')} type="button">Стек pop (массив)</button>
          <button className="control-button" onClick={() => setDemoKey('stack-list-push')} type="button">Стек push (список)</button>
          <button className="control-button" onClick={() => setDemoKey('stack-list-pop')} type="button">Стек pop (список)</button>
          <button className="control-button" onClick={() => setDemoKey('queue-array-enqueue')} type="button">Очередь enqueue (массив)</button>
          <button className="control-button" onClick={() => setDemoKey('queue-array-dequeue')} type="button">Очередь dequeue (массив)</button>
          <button className="control-button" onClick={() => setDemoKey('queue-list-enqueue')} type="button">Очередь enqueue (список)</button>
          <button className="control-button" onClick={() => setDemoKey('queue-list-dequeue')} type="button">Очередь dequeue (список)</button>
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
    demoKey === 'stack-array-push'
      ? stackArrayPushDemo({ values })
      : demoKey === 'stack-array-pop'
        ? stackArrayPopDemo({ values })
        : demoKey === 'stack-list-push'
          ? stackListPushDemo({ values })
          : demoKey === 'stack-list-pop'
            ? stackListPopDemo({ values })
            : demoKey === 'queue-array-enqueue'
              ? queueArrayEnqueueDemo({ values })
              : demoKey === 'queue-array-dequeue'
                ? queueArrayDequeueDemo({ values })
                : demoKey === 'queue-list-enqueue'
                  ? queueListEnqueueDemo({ values })
                  : demoKey === 'queue-list-dequeue'
                    ? queueListDequeueDemo({ values })
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
