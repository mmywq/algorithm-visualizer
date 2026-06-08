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

  const resetAlgorithm = (): void => {
    loadPageAlgorithm(generatorFactory, canUseNumericInput ? values : undefined, loadAlgorithm);
  };

  const applyValues = (): void => {
    const parsed = parseInputValues(manualInput);
    if (!parsed.ok) {
      setInputError(parsed.error);
      return;
    }
    setInputError(null);
    setValues(parsed.values);
  };

  const randomizeValues = (): void => {
    const nextValues = createRandomValues(Math.min(MAX_INPUT_SIZE, Math.max(8, values.length)), mode === 'structure');
    setValues(nextValues);
    setManualInput(nextValues.join(', '));
    setInputError(null);
  };

  const refreshPresets = (): void => {
    setArrayPresets(loadArrayPresets());
    setStructurePresets(loadStructurePresets());
  };

  const savePreset = (): void => {
    const name = presetName.trim() || `${title} ${new Date().toLocaleTimeString()}`;
    if (mode === 'structure') {
      saveStructurePreset(name, values);
    } else {
      saveArrayPreset(name, values);
    }
    setPresetName('');
    refreshPresets();
  };

  const loadPreset = (preset: ArrayPreset): void => {
    setValues(preset.values);
    setManualInput(preset.values.join(', '));
    setInputError(null);
  };

  const removePreset = (id: string): void => {
    if (mode === 'structure') {
      removeStructurePreset(id);
    } else {
      removeArrayPreset(id);
    }
    refreshPresets();
  };

  const renamePreset = (): void => {
    if (renamePresetState === null) return;
    if (mode === 'structure') {
      renameStructurePreset(renamePresetState.id, renamePresetState.name);
    } else {
      renameArrayPreset(renamePresetState.id, renamePresetState.name);
    }
    setRenamePresetState(null);
    refreshPresets();
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
      description: 'Хеш-таблица (hash table) хранит пары ключ-значение и получает индекс ячейки через хеш-функцию. Коллизия — ситуация, когда разные ключи попадают в одну ячейку. Для обработки используют цепочки, открытую адресацию или блочное размещение.',
      complexity: 'В среднем O(1), в худшем O(n)',
      useCases: ['Словари и кэш', 'Проверка принадлежности', 'Подсчёт частот', 'Ускорение поиска по ключу без полного перебора'],
      pseudocodeLines: [
        'index = hash(key) mod m',
        'если корзина свободна, вставить',
        'иначе разрешить коллизию',
        'при поиске проверить соответствующий bucket',
      ],
    };
  }

  if (title.includes('Куча')) {
    return {
      description: 'Куча (heap) — почти полное бинарное дерево, обычно хранимое в массиве. В min-heap ключ родителя не больше ключей детей, поэтому минимум всегда в корне. В max-heap наоборот: в корне максимум.',
      complexity: 'insert/extract: O(log n), peek: O(1)',
      useCases: ['Очередь с приоритетом', 'Планировщики задач', 'Алгоритм Дейкстры/Прима', 'Heap Sort и обработка потока событий'],
      pseudocodeLines: [
        'insert: добавить элемент в конец',
        'sift-up до восстановления инварианта',
        'extract: заменить корень последним элементом',
        'sift-down до восстановления инварианта',
      ],
    };
  }

  if (mode === 'graph') {
    return {
      description: 'Граф описывает объекты (вершины) и связи между ними (рёбра). Алгоритмы графов позволяют находить маршруты, компоненты связности, кратчайшие пути и минимальные остовы.',
      complexity: 'Часто O(V + E), зависит от задачи',
      useCases: ['Маршрутизация', 'Социальные графы', 'Сетевой анализ', 'Зависимости задач'],
      pseudocodeLines: ['инициализировать структуру frontier', 'добавить стартовую вершину', 'извлечь вершину и обработать', 'для соседей добавить непосещённые', 'завершить при пустой frontier'],
    };
  }

  if (mode === 'array') {
    return {
      description: 'Сортировка упорядочивает элементы по ключу сравнения. После сортировки ускоряются поиск, группировка, слияние наборов и многие этапы обработки данных.',
      complexity: 'От O(n) до O(n log n) и O(n²)',
      useCases: ['Подготовка к бинарному поиску', 'Сравнение наборов', 'Обработка данных'],
      pseudocodeLines: [
        'выбрать стратегию сортировки',
        'сравнивать элементы по правилу',
        'переставлять/сливать элементы',
        'повторять до полной упорядоченности',
      ],
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
