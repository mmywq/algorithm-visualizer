import { useEffect, useMemo, useState } from 'react';
import { compareSortsDemo, blockSortDemo, countingSortDemo, radixSortDemo } from '@/algorithms/sorting/extra';
import { connectedComponentsDemo, dijkstraDemo, mstDemo } from '@/algorithms/graphs';
import { balancedBstScenario, binomialHeapScenario, bstScenario, hashBlockScenario, hashClosedScenario, hashOpenScenario, heapScenario } from '@/algorithms/structures/extendedStructures';
import { PlayerControls } from '@/components/player/PlayerControls';
import { StepTutorPanel } from '@/components/player/StepTutorPanel';
import { ArrayVisualizer } from '@/components/visualizers/arrays/ArrayVisualizer';
import { GraphVisualizer } from '@/components/visualizers/graphs/GraphVisualizer';
import { StructureVisualizer } from '@/components/visualizers/structures/StructureVisualizer';
import { loadArrayPresets, loadStructurePresets, removeArrayPreset, removeStructurePreset, renameArrayPreset, renameStructurePreset, saveArrayPreset, saveStructurePreset } from '@/lib/storage';
import { useAlgorithmPlayerStore } from '@/stores';
import type { AlgorithmFrame, ArrayAlgorithmFrame, ArrayPreset, GraphAlgorithmFrame, StructureAlgorithmFrame } from '@/types';

type Mode = 'array' | 'graph' | 'structure';

type PageGeneratorFactory = (
  inputValues?: readonly number[],
) => Generator<AlgorithmFrame<unknown, Record<string, unknown>>, void, unknown>;

interface AlgorithmPageProps {
  readonly title: string;
  readonly mode: Mode;
  readonly generatorFactory: PageGeneratorFactory;
}

interface TheoryContent {
  readonly description: string;
  readonly complexity: string;
  readonly useCases: readonly string[];
  readonly pseudocodeLines: readonly string[];
}

const MIN_INPUT_VALUE = -100;
const MAX_INPUT_VALUE = 100;
const MIN_INPUT_SIZE = 2;
const MAX_INPUT_SIZE = 16;

export function AlgorithmPage({ title, mode, generatorFactory }: AlgorithmPageProps) {
  const [values, setValues] = useState<readonly number[]>(() => getDefaultValues(title, mode));
  const [manualInput, setManualInput] = useState(() => getDefaultValues(title, mode).join(', '));
  const [inputError, setInputError] = useState<string | null>(null);
  const [presetName, setPresetName] = useState('');
  const [renamePresetState, setRenamePresetState] = useState<{ id: string; name: string } | null>(null);
  const [arrayPresets, setArrayPresets] = useState(loadArrayPresets());
  const [structurePresets, setStructurePresets] = useState(loadStructurePresets());

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

  const canUseNumericInput = mode !== 'graph';
  const presets = mode === 'structure' ? structurePresets : arrayPresets;

  useEffect(() => {
    loadPageAlgorithm(generatorFactory, canUseNumericInput ? values : undefined, loadAlgorithm);
  }, [canUseNumericInput, generatorFactory, loadAlgorithm, values]);

  const frame = currentFrame;
  const theory = getTheoryByTitle(title, mode);
  const stepsHistory = useMemo(() => frames.map((stepFrame) => stepFrame.description ?? stepFrame.message), [frames]);

  const applyValues = (): void => {
    const result = parseInputValues(manualInput);
    if (result.ok === false) {
      setInputError(result.error);
      return;
    }

    setInputError(null);
    setValues(result.values);
    setManualInput(result.values.join(', '));
  };

  const randomizeValues = (): void => {
    const size = Math.min(MAX_INPUT_SIZE, Math.max(MIN_INPUT_SIZE, values.length || 8));
    const unique = title.includes('Двоичное дерево поиска');
    const next = createRandomValues(size, unique);
    setInputError(null);
    setValues(next);
    setManualInput(next.join(', '));
  };

  const savePreset = (): void => {
    const name = presetName.trim() || `${mode === 'structure' ? 'Структура' : 'Массив'} ${new Date().toLocaleTimeString()}`;
    if (mode === 'structure') {
      saveStructurePreset(name, values);
      setStructurePresets(loadStructurePresets());
    } else {
      saveArrayPreset(name, values);
      setArrayPresets(loadArrayPresets());
    }
    setPresetName('');
  };

  const loadPreset = (preset: ArrayPreset): void => {
    setValues(preset.values);
    setManualInput(preset.values.join(', '));
    setInputError(null);
  };

  const renamePreset = (): void => {
    if (renamePresetState === null) return;
    if (mode === 'structure') {
      renameStructurePreset(renamePresetState.id, renamePresetState.name);
      setStructurePresets(loadStructurePresets());
    } else {
      renameArrayPreset(renamePresetState.id, renamePresetState.name);
      setArrayPresets(loadArrayPresets());
    }
    setRenamePresetState(null);
  };

  const removePreset = (id: string): void => {
    if (mode === 'structure') {
      removeStructurePreset(id);
      setStructurePresets(loadStructurePresets());
    } else {
      removeArrayPreset(id);
      setArrayPresets(loadArrayPresets());
    }
  };

  const resetAlgorithm = (): void => {
    loadPageAlgorithm(generatorFactory, canUseNumericInput ? values : undefined, loadAlgorithm);
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <section className="rounded-3xl border border-app bg-surface p-6">
        <h1 className="text-3xl font-bold text-app-primary">{title}</h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-app-muted">
          Единый шаблон страницы: входные данные сверху, визуализация слева, теория и пояснение текущего шага справа, история шагов появляется после завершения.
        </p>
      </section>

      {canUseNumericInput && (
        <section className="app-panel">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <label className="block flex-1 text-sm text-app-muted">
              Введите целые числа через запятую
              <input
                className="control-input mt-2 w-full"
                onChange={(event) => setManualInput(event.target.value)}
                placeholder="Например: 42, -7, 0, 15"
                value={manualInput}
              />
              <span className="mt-2 block text-xs text-slate-400">
                Диапазон строго от {MIN_INPUT_VALUE} до {MAX_INPUT_VALUE}. Пустая строка, текст и полностью одинаковый набор вроде 0, 0, 0 не запускаются: так мы избегаем неинформативной демонстрации.
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              <button className="control-button control-button-primary" onClick={applyValues} type="button">Применить значения</button>
              <button className="control-button" onClick={randomizeValues} type="button">Случайные −100…100</button>
              <input className="control-input" onChange={(event) => setPresetName(event.target.value)} placeholder="Имя пресета" value={presetName} />
              <button className="control-button" onClick={savePreset} type="button">Сохранить пресет</button>
            </div>
          </div>

          <p className="mt-3 text-sm text-app-muted">Текущий набор: <strong className="text-app-primary">[{values.join(', ')}]</strong></p>
          {inputError !== null && <p className="mt-2 text-sm text-rose-300">{inputError}</p>}

          {presets.length > 0 && (
            <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {presets.slice(0, 8).map((preset) => (
                <div className="flex items-center gap-2" key={preset.id}>
                  <button className="control-button flex-1" onClick={() => loadPreset(preset)} type="button">{preset.name}</button>
                  <button className="control-button" onClick={() => setRenamePresetState({ id: preset.id, name: preset.name })} type="button">Переим.</button>
                  <button className="control-button" onClick={() => removePreset(preset.id)} type="button">Удалить</button>
                </div>
              ))}
            </div>
          )}

          {renamePresetState !== null && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-app bg-surface p-3">
              <p className="text-sm text-app-muted">Новое имя пресета</p>
              <input className="control-input" onChange={(event) => setRenamePresetState({ ...renamePresetState, name: event.target.value })} value={renamePresetState.name} />
              <button className="control-button" onClick={renamePreset} type="button">Сохранить</button>
              <button className="control-button" onClick={() => setRenamePresetState(null)} type="button">Отмена</button>
            </div>
          )}
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div>
          {mode === 'array' && <ArrayVisualizer frame={isArrayFrame(frame) ? frame : null} />}
          {mode === 'graph' && <GraphVisualizer frame={isGraphFrame(frame) ? frame : null} graph={isGraphFrame(frame) ? frame.data : { nodes: [], edges: [] }} />}
          {mode === 'structure' && <StructureVisualizer frame={isStructureFrame(frame) ? frame : null} />}
        </div>
        <StepTutorPanel
          complexity={theory.complexity}
          frame={frame}
          pseudocodeLines={theory.pseudocodeLines}
          title={theory.description}
          useCases={theory.useCases}
        />
      </section>

      {status === 'completed' && stepsHistory.length > 0 && (
        <section className="app-panel">
          <h3 className="text-xl font-semibold text-app-primary">История шагов</h3>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-app-muted">
            {stepsHistory.map((entry, index) => (<li key={`${index}-${entry}`}>{entry}</li>))}
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
        onReset={resetAlgorithm}
        onSpeedChange={setPlaybackSpeed}
        playbackSpeedMs={playbackSpeedMs}
        status={status}
        totalFrames={frames.length}
      />
    </div>
  );
}

const loadPageAlgorithm = (
  generatorFactory: PageGeneratorFactory,
  values: readonly number[] | undefined,
  loadAlgorithm: ReturnType<typeof useAlgorithmPlayerStore.getState>['loadAlgorithm'],
): void => {
  const generator = generatorFactory(values);
  const first = generator.next();
  if (first.done) {
    loadAlgorithm(generator);
  } else {
    loadAlgorithm(generator, { initialFrame: first.value });
  }
};

const parseInputValues = (source: string): { ok: true; values: readonly number[] } | { ok: false; error: string } => {
  const segments = source.split(',').map((value) => value.trim()).filter((value) => value.length > 0);
  if (segments.length === 0) {
    return { ok: false, error: 'Введите хотя бы два целых числа через запятую.' };
  }

  const values: number[] = [];
  for (const segment of segments) {
    if (/^-?\d+$/.test(segment) === false) {
      return { ok: false, error: `Недопустимое значение «${segment}». Используйте только целые числа.` };
    }
    const value = Number(segment);
    if (value < MIN_INPUT_VALUE || value > MAX_INPUT_VALUE) {
      return { ok: false, error: `Число ${value} вне диапазона ${MIN_INPUT_VALUE}…${MAX_INPUT_VALUE}.` };
    }
    values.push(value);
  }

  if (values.length < MIN_INPUT_SIZE) {
    return { ok: false, error: `Введите минимум ${MIN_INPUT_SIZE} числа.` };
  }
  if (values.length > MAX_INPUT_SIZE) {
    return { ok: false, error: `Слишком много значений: максимум ${MAX_INPUT_SIZE}.` };
  }
  if (new Set(values).size === 1) {
    return { ok: false, error: 'Все значения одинаковые. Такой набор корректен математически, но не показывает ветвления/сравнения; добавьте хотя бы одно отличающееся число.' };
  }

  return { ok: true, values };
};

const createRandomValues = (size: number, unique: boolean): readonly number[] => {
  if (!unique) {
    return Array.from({ length: size }, () => Math.floor(Math.random() * (MAX_INPUT_VALUE - MIN_INPUT_VALUE + 1)) + MIN_INPUT_VALUE);
  }

  const values = new Set<number>();
  while (values.size < size) {
    values.add(Math.floor(Math.random() * (MAX_INPUT_VALUE - MIN_INPUT_VALUE + 1)) + MIN_INPUT_VALUE);
  }
  return [...values];
};

const getDefaultValues = (title: string, mode: Mode): readonly number[] => {
  if (mode === 'array') return [34, -12, 56, 7, 7, 89, -3, 22];
  if (title.includes('хеш')) return [12, 22, 32, 42, 52];
  if (title.includes('Куча')) return [40, 15, 60, 5, 30, 55];
  if (title.includes('Двоичное дерево поиска')) return [50, 30, 70, 20, 40, 60, 80];
  return [18, 7, 24, 3, 12, 30];
};

const isArrayFrame = (frame: AlgorithmFrame<unknown, Record<string, unknown>> | null): frame is ArrayAlgorithmFrame => frame?.domain === 'array' && Array.isArray(frame.data) && frame.data.every((item) => typeof item === 'object' && item !== null && 'value' in item);
const isGraphFrame = (frame: AlgorithmFrame<unknown, Record<string, unknown>> | null): frame is GraphAlgorithmFrame => frame?.domain === 'graph';
const isStructureFrame = (frame: AlgorithmFrame<unknown, Record<string, unknown>> | null): frame is StructureAlgorithmFrame => (frame?.domain === 'tree' || frame?.domain === 'array') && typeof frame.data === 'object' && frame.data !== null && 'cells' in frame.data;

const getTheoryByTitle = (title: string, mode: Mode): TheoryContent => {
  if (title.includes('Двоичное дерево поиска')) {
    return {
      description: 'BST (Binary Search Tree, двоичное дерево поиска) хранит ключи по правилу: слева от узла находятся меньшие значения, справа — большие или равные. Благодаря этому поиск похож на игру «больше/меньше»: на каждом узле мы отбрасываем половину подходящих направлений. В реальных системах идея лежит в основе индексов, словарей и поиска диапазонов, но качество зависит от высоты дерева.',
      complexity: 'Поиск/вставка/удаление: O(h), в среднем O(log n), в худшем O(n)',
      useCases: ['Индексные структуры', 'Поддержка отсортированного множества', 'Поиск диапазонов', 'Обучение рекурсивному ветвлению'],
      pseudocodeLines: ['если корень пуст, создаём узел', 'сравнить key с текущим node.key', 'если key < node.key, идём влево', 'иначе идём вправо', 'вставить в первое пустое место', 'повторять, пока ключ не размещён'],
    };
  }

  if (title.includes('хеш')) {
    return {
      description: 'Хеш-таблица (hash table) хранит ключи в корзинах, вычисляя адрес через хеш-функцию h(key). Коллизия — ситуация, когда разные ключи дают один индекс. В цепочках элементы связываются внутри корзины, в открытой адресации ищется другая свободная ячейка, а в блочной адресации сначала заполняется небольшой блок.',
      complexity: 'В среднем O(1), при плохой хеш-функции или переполнении — O(n)',
      useCases: ['Словари и кэш', 'Проверка принадлежности', 'Подсчёт частот', 'Индексы по ключу без полного перебора'],
      pseudocodeLines: ['index = abs(hash(key)) mod tableSize', 'проверить корзину или ячейку', 'если место свободно — вставить', 'если коллизия — применить стратегию разрешения', 'повторить для всех ключей'],
    };
  }

  if (title.includes('Куча')) {
    return {
      description: 'Куча (heap) — почти полное бинарное дерево, обычно хранимое прямо в массиве. В min-heap родитель не больше детей, поэтому минимум всегда находится в корне. Sift-up («просеивание вверх») поднимает новый элемент после вставки; sift-down («просеивание вниз») используется после удаления корня.',
      complexity: 'insert/extract: O(log n), peek: O(1), build пошаговыми вставками: O(n log n)',
      useCases: ['Очередь с приоритетом', 'Планировщики задач', 'Алгоритмы Дейкстры и Прима', 'Heap Sort', 'Обработка событий по приоритету'],
      pseudocodeLines: ['добавить элемент в конец массива', 'пока родитель больше ребёнка', 'поменять родителя и ребёнка местами', 'продолжить проверку выше', 'корень содержит минимум'],
    };
  }

  if (mode === 'graph') {
    return {
      description: 'Граф описывает объекты (вершины) и связи между ними (рёбра). Алгоритмы графов позволяют находить маршруты, компоненты связности, кратчайшие пути и минимальные остовы. Визуализация показывает, какие вершины уже обработаны, какие находятся на границе поиска, и какие рёбра стали частью решения.',
      complexity: 'Часто O(V + E), зависит от задачи',
      useCases: ['Маршрутизация', 'Социальные графы', 'Сетевой анализ', 'Зависимости задач'],
      pseudocodeLines: ['инициализировать структуру frontier', 'добавить стартовую вершину', 'извлечь вершину и обработать', 'для соседей добавить непосещённые', 'завершить при пустой frontier'],
    };
  }

  if (mode === 'array') {
    return {
      description: 'Сортировка упорядочивает элементы по ключу сравнения. Это базовая операция для поиска, объединения данных, дедупликации и ранжирования. Визуализация подсвечивает текущий элемент фиолетовым/голубым, обмены и отсортированную область, чтобы было видно, как локальные сравнения постепенно дают глобальный порядок.',
      complexity: 'От O(n) до O(n log n) и O(n²), зависит от алгоритма',
      useCases: ['Подготовка к бинарному поиску', 'Сравнение наборов', 'Обработка таблиц', 'Ранжирование результатов'],
      pseudocodeLines: ['выбрать стратегию сортировки', 'сравнивать элементы по правилу', 'переставлять/сливать элементы', 'расширять отсортированную область', 'завершить, когда весь массив упорядочен'],
    };
  }

  return {
    description: 'Пошаговое объяснение текущего алгоритма с акцентом на инварианты: что уже построено, что проверяется сейчас и почему следующий шаг безопасен.',
    complexity: 'Зависит от операций',
    useCases: ['Обучение структурам данных', 'Понимание инвариантов'],
    pseudocodeLines: ['инициализация', 'основной цикл', 'обработка шага', 'завершение'],
  };
};

export const algorithmRouteRegistry = {
  '/trees/bst': { title: 'Двоичное дерево поиска', mode: 'structure' as const, generatorFactory: bstScenario },
  '/trees/balanced-bst': { title: 'Сбалансированное двоичное дерево поиска', mode: 'structure' as const, generatorFactory: balancedBstScenario },
  '/hash/open-chaining': { title: 'Открытые хеш-таблицы (закрытая адресация)', mode: 'structure' as const, generatorFactory: hashOpenScenario },
  '/hash/open-addressing': { title: 'Закрытые хеш-таблицы (открытая адресация)', mode: 'structure' as const, generatorFactory: hashClosedScenario },
  '/hash/block-addressing': { title: 'Закрытые хеш-таблицы (с использованием блоков)', mode: 'structure' as const, generatorFactory: hashBlockScenario },
  '/heaps/heap': { title: 'Куча', mode: 'structure' as const, generatorFactory: heapScenario },
  '/heaps/binomial': { title: 'Биномиальная куча', mode: 'structure' as const, generatorFactory: binomialHeapScenario },
  '/sorting/compare': { title: 'Сравнение 6 сортировок', mode: 'array' as const, generatorFactory: compareSortsDemo },
  '/sorting/block': { title: 'Блочная сортировка', mode: 'array' as const, generatorFactory: blockSortDemo },
  '/sorting/counting': { title: 'Сортировка подсчётом', mode: 'array' as const, generatorFactory: countingSortDemo },
  '/sorting/radix': { title: 'Поразрядная сортировка', mode: 'array' as const, generatorFactory: radixSortDemo },
  '/graphs/components': { title: 'Компоненты связности', mode: 'graph' as const, generatorFactory: connectedComponentsDemo },
  '/graphs/dijkstra': { title: 'Алгоритм Дейкстры', mode: 'graph' as const, generatorFactory: dijkstraDemo },
  '/graphs/mst': { title: 'Минимальное остовное дерево', mode: 'graph' as const, generatorFactory: mstDemo },
};
