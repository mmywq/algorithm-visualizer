import { useEffect, useMemo } from 'react';
import { compareSortsDemo, blockSortDemo, countingSortDemo, radixSortDemo } from '@/algorithms/sorting/extra';
import { connectedComponentsDemo, dijkstraDemo, mstDemo } from '@/algorithms/graphs';
import { balancedBstScenario, binomialHeapScenario, bstScenario, hashBlockScenario, hashClosedScenario, hashOpenScenario, heapScenario } from '@/algorithms/structures/extendedStructures';
import { PlayerControls } from '@/components/player/PlayerControls';
import { StepTutorPanel } from '@/components/player/StepTutorPanel';
import { ArrayVisualizer } from '@/components/visualizers/arrays/ArrayVisualizer';
import { GraphVisualizer } from '@/components/visualizers/graphs/GraphVisualizer';
import { StructureVisualizer } from '@/components/visualizers/structures/StructureVisualizer';
import { useAlgorithmPlayerStore } from '@/stores';
import type { AlgorithmFrame, ArrayAlgorithmFrame, GraphAlgorithmFrame, StructureAlgorithmFrame } from '@/types';

type Mode = 'array' | 'graph' | 'structure';

interface AlgorithmPageProps {
  readonly title: string;
  readonly mode: Mode;
  readonly generatorFactory: () => Generator<AlgorithmFrame<unknown, Record<string, unknown>>, void, unknown>;
}

interface TheoryContent {
  readonly description: string;
  readonly complexity: string;
  readonly useCases: readonly string[];
  readonly pseudocodeLines: readonly string[];
}

export function AlgorithmPage({ title, mode, generatorFactory }: AlgorithmPageProps) {
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
    const generator = generatorFactory();
    const first = generator.next();
    if (first.done) {
    loadAlgorithm(generator);
  } else {
    loadAlgorithm(generator, { initialFrame: first.value });
  }
  }, [generatorFactory, loadAlgorithm]);

  const frame = currentFrame;
  const theory = getTheoryByTitle(title, mode);
  const stepsHistory = useMemo(() => frames.map((stepFrame) => stepFrame.description ?? stepFrame.message), [frames]);

  return (
    <div className="flex w-full flex-col gap-6">
      <section className="rounded-3xl border border-app bg-surface p-6">
        <h1 className="text-3xl font-bold text-app-primary">{title}</h1>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
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
        onReset={() => {
          const generator = generatorFactory();
          const first = generator.next();
          if (first.done) {
    loadAlgorithm(generator);
  } else {
    loadAlgorithm(generator, { initialFrame: first.value });
  }
        }}
        onSpeedChange={setPlaybackSpeed}
        playbackSpeedMs={playbackSpeedMs}
        status={status}
        totalFrames={frames.length}
      />
    </div>
  );
}

const isArrayFrame = (frame: AlgorithmFrame<unknown, Record<string, unknown>> | null): frame is ArrayAlgorithmFrame => frame?.domain === 'array' && Array.isArray(frame.data) && frame.data.every((item) => typeof item === 'object' && item !== null && 'value' in item);
const isGraphFrame = (frame: AlgorithmFrame<unknown, Record<string, unknown>> | null): frame is GraphAlgorithmFrame => frame?.domain === 'graph';
const isStructureFrame = (frame: AlgorithmFrame<unknown, Record<string, unknown>> | null): frame is StructureAlgorithmFrame => frame?.domain === 'array' && typeof frame.data === 'object' && frame.data !== null && 'cells' in frame.data;

const getTheoryByTitle = (title: string, mode: Mode): TheoryContent => {
  if (title.includes('Двоичное дерево поиска')) {
    return {
      description: 'BST хранит ключи так, что слева меньше, справа больше. Это ускоряет поиск, вставку и удаление по сравнению с линейным списком.',
      complexity: 'Поиск/вставка/удаление: O(h), в среднем O(log n)',
      useCases: ['Индексные структуры', 'Поддержка отсортированного множества', 'Поиск диапазонов'],
      pseudocodeLines: [
        'если корень пуст, создаём узел',
        'если key < node.key, идём влево',
        'иначе идём вправо',
        'повторяем, пока не найдём позицию',
      ],
    };
  }

  if (title.includes('хеш-таблицы')) {
    return {
      description: 'Хеш-таблица вычисляет индекс корзины по ключу. Коллизии решаются цепочками, пробированием или блочными схемами.',
      complexity: 'В среднем O(1), в худшем O(n)',
      useCases: ['Словари и кэш', 'Проверка принадлежности', 'Подсчёт частот'],
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
      description: 'Куча — полное бинарное дерево с инвариантом приоритета. Корень хранит минимум/максимум.',
      complexity: 'insert/extract: O(log n), peek: O(1)',
      useCases: ['Очередь с приоритетом', 'Планировщики задач', 'Алгоритм Дейкстры/Прима'],
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
      description: 'Графовые алгоритмы анализируют вершины и связи между ними: обход, поиск путей, связность и остовы.',
      complexity: 'Часто O(V + E), зависит от задачи',
      useCases: ['Маршрутизация', 'Социальные графы', 'Сетевой анализ'],
      pseudocodeLines: [
        'инициализировать структуру frontier',
        'добавить стартовую вершину',
        'извлечь вершину и обработать',
        'для соседей добавить непосещённые',
      ],
    };
  }

  if (mode === 'array') {
    return {
      description: 'Алгоритмы сортировки упорядочивают данные для ускорения поиска, агрегации и аналитики.',
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
    description: 'Пошаговое объяснение текущего алгоритма.',
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
