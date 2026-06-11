import { avlScenario } from './avlTree';
import { hashBlockAddressingScenario, hashChainingScenario, hashOpenAddressingScenario } from './hashTable';
import type { StructureAlgorithmFrame, StructureSnapshot } from '@/types';

const snapshot = (label: string, values: readonly (number | null)[]): StructureSnapshot => ({
  label,
  cells: values.map((value, index) => ({ id: `${label}-${index}`, value })),
});

const frame = (
  step: number,
  phase: StructureAlgorithmFrame['phase'],
  status: StructureAlgorithmFrame['status'],
  data: StructureSnapshot,
  message: string,
  operation: StructureAlgorithmFrame['meta']['operation'],
  pseudocodeLine: number,
  activeIndex?: number,
  extraMeta: Partial<StructureAlgorithmFrame['meta']> = {},
): StructureAlgorithmFrame => ({
  step,
  domain: 'tree',
  phase,
  status,
  data,
  activeIds: activeIndex === undefined ? [] : [data.cells[activeIndex]?.id ?? ''],
  pseudocode: { line: pseudocodeLine },
  message,
  description: message,
  meta: {
    operation,
    ...extraMeta,
    ...(activeIndex === undefined ? {} : { activeIndex, pointerIndex: activeIndex }),
  },
});

export function* bstScenario(inputValues?: readonly number[]): Generator<StructureAlgorithmFrame, void, unknown> {
  const insertionOrder = inputValues !== undefined && inputValues.length > 0 ? [...inputValues] : createRandomUniqueValues(7, -100, 100);
  const cells: Array<number | null> = Array.from({ length: 15 }, () => null);
  let step = 0;

  yield frame(step++, 'initial', 'running', snapshot('Дерево BST', cells), `BST — это двоичное дерево поиска: для каждого узла все ключи слева меньше, справа больше. Начинаем с пустого дерева. Порядок вставки: ${insertionOrder.join(', ')}.`, 'index', 1);

  for (const value of insertionOrder) {
    let index = 0;
    while (cells[index] !== null) {
      const current = cells[index]!;
      const goLeft = value < current;
      yield frame(step++, 'inspect', 'running', snapshot('Дерево BST', cells), `Сравниваем ${value} с узлом ${current}: ${goLeft ? `${value} < ${current}, идём влево` : `${value} ≥ ${current}, идём вправо`}.`, 'index', 2, index);
      index = goLeft ? 2 * index + 1 : 2 * index + 2;
      if (index >= cells.length) {
        yield frame(step++, 'inspect', 'running', snapshot('Дерево BST', cells), `Глубина дерева превысила текущую сетку визуализации. Вставка ${value} пропущена, чтобы сохранить наглядность.`, 'index', 5);
        index = -1;
        break;
      }
    }

    if (index >= 0) {
      cells[index] = value;
      yield frame(step++, 'push', 'running', snapshot('Дерево BST', cells), `Вставляем ${value} в позицию узла. Свойство BST сохранено: левое поддерево меньше, правое больше.`, 'index', 4, index);
    }
  }

  yield frame(step, 'complete', 'completed', snapshot('Дерево BST', cells), 'Построение BST завершено. Теперь можно проследить путь поиска любого ключа через последовательность сравнений от корня.', 'index', 6);
}

const buildBstCells = (values: readonly number[]): Array<number | null> => {
  const cells: Array<number | null> = Array.from({ length: 15 }, () => null);

  for (const value of values) {
    let index = 0;
    while (index < cells.length && cells[index] !== null) {
      const current = cells[index]!;
      index = value < current ? 2 * index + 1 : 2 * index + 2;
    }

    if (index < cells.length) {
      cells[index] = value;
    }
  }

  return cells;
};

export function* bstSearchScenario(inputValues: readonly number[], target: number): Generator<StructureAlgorithmFrame, void, unknown> {
  const cells = buildBstCells(inputValues);
  let step = 0;
  const snapshotData = snapshot('Дерево BST', cells);
  const path: number[] = [];
  const pathValues: number[] = [];
  let index = 0;

  yield frame(step++, 'initial', 'running', snapshotData, `Поиск начинается с корня. Искомый ключ: ${target}. На каждом узле ключ сравнивается со значением узла, и поиск переходит в левое или правое поддерево.`, 'index', 1, 0, { searchTarget: target, pointers: { search: 0 } });

  while (index < cells.length) {
    const current = cells[index];
    if (current === null || current === undefined) {
      yield frame(step++, 'inspect', 'running', snapshotData, `Переход в поддерево, но узла там нет — достигнута пустая позиция. Ключ ${target} в дереве отсутствует.`, 'index', 6, undefined, { searchTarget: target, searchPath: path, pointers: { search: index } });
      yield frame(step, 'complete', 'completed', snapshotData, `Поиск завершён: ключ ${target} отсутствует. Пройденный путь: ${pathValues.join(' → ')} → пустое поддерево. Выполнено сравнений: ${pathValues.length}.`, 'index', 6, undefined, { searchTarget: target, searchPath: path });
      return;
    }

    path.push(index);
    pathValues.push(current);
    yield frame(step++, 'inspect', 'running', snapshotData, `Сравниваем искомый ключ ${target} с узлом ${current}. Это сравнение №${pathValues.length}.`, 'index', 2, index, { searchTarget: target, searchPath: [...path], pointers: { search: index } });

    if (target === current) {
      yield frame(step++, 'push', 'running', snapshotData, `${target} = ${current} — ключ найден.`, 'index', 5, index, { searchTarget: target, searchPath: [...path], pointers: { search: index } });
      yield frame(step, 'complete', 'completed', snapshotData, `Поиск завершён успешно: ключ ${target} найден. Путь от корня: ${pathValues.join(' → ')}. Выполнено сравнений: ${pathValues.length} — это глубина узла плюс один, а не размер всего дерева.`, 'index', 6, index, { searchTarget: target, searchPath: [...path], pointers: { search: index } });
      return;
    }

    const goLeft = target < current;
    const nextIndex = goLeft ? 2 * index + 1 : 2 * index + 2;
    yield frame(step++, 'inspect', 'running', snapshotData, `${target} ${goLeft ? '<' : '>'} ${current}: переходим в ${goLeft ? 'левое' : 'правое'} поддерево. ${goLeft ? 'Меньшие ключи по правилу BST находятся слева.' : 'Большие ключи по правилу BST находятся справа.'}`, 'index', 3, index, { searchTarget: target, searchPath: [...path], pointers: { search: index } });
    index = nextIndex;
  }

  yield frame(step, 'complete', 'completed', snapshotData, `Поиск завершён: ключ ${target} не найден. Пройденный путь: ${pathValues.join(' → ')}. Выполнено сравнений: ${pathValues.length}.`, 'index', 6, undefined, { searchTarget: target, searchPath: path });
}



export const balancedBstScenario = (inputValues?: readonly number[]) =>
  avlScenario(inputValues !== undefined && inputValues.length > 0 ? inputValues : [50, 30, 70, 20, 40, 60, 80]);

export const hashOpenScenario = (inputValues?: readonly number[]) =>
  hashChainingScenario(inputValues !== undefined && inputValues.length > 0 ? inputValues : [12, 22, 32, 42, 52], 7);

export const hashClosedScenario = (inputValues?: readonly number[]) =>
  hashOpenAddressingScenario(inputValues !== undefined && inputValues.length > 0 ? inputValues : [12, 22, 32, 42, 52], 11);

export const hashBlockScenario = (inputValues?: readonly number[]) =>
  hashBlockAddressingScenario(inputValues !== undefined && inputValues.length > 0 ? inputValues : [12, 22, 32, 42, 52], 5, 2);

export function* heapScenario(inputValues?: readonly number[]): Generator<StructureAlgorithmFrame, void, unknown> {
  const insertionOrder = inputValues !== undefined && inputValues.length > 0 ? [...inputValues] : [40, 15, 60, 5, 30, 55];
  const heap: number[] = [];
  let step = 0;

  const heapSnapshot = () => snapshot('Бинарная min-куча', heap);

  yield frame(
    step++,
    'initial',
    'running',
    heapSnapshot(),
    `Начинаем строить min-heap с пустого дерева. Min-heap — куча, где каждый родитель не больше своих детей; поэтому минимум всегда в корне. Порядок вставки: ${insertionOrder.join(', ')}.`,
    'push',
    1,
  );

  for (const value of insertionOrder) {
    heap.push(value);
    let index = heap.length - 1;
    yield frame(
      step++,
      'push',
      'running',
      heapSnapshot(),
      `Добавляем ${value} в первую свободную позицию почти полного дерева: индекс массива ${index}. Форма кучи сохранена, теперь проверяем порядок родитель ≤ ребёнок.`,
      'push',
      1,
      index,
    );

    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parentValue = heap[parentIndex]!;
      const childValue = heap[index]!;

      yield frame(
        step++,
        'compare',
        'running',
        heapSnapshot(),
        `Просеивание вверх (sift-up): сравниваем ребёнка ${childValue} (индекс ${index}) с родителем ${parentValue} (индекс ${parentIndex}). Если ребёнок меньше, они меняются местами.`,
        'push',
        2,
        index,
      );

      if (parentValue <= childValue) {
        yield frame(
          step++,
          'inspect',
          'running',
          heapSnapshot(),
          `Обмен не нужен: ${parentValue} ≤ ${childValue}. Свойство min-heap для этой ветви выполнено, просеивание останавливается.`,
          'push',
          2,
          parentIndex,
        );
        break;
      }

      [heap[parentIndex], heap[index]] = [heap[index]!, heap[parentIndex]!];
      yield frame(
        step++,
        'swap',
        'running',
        heapSnapshot(),
        `Обмен: ${childValue} и ${parentValue} меняются местами — меньшее значение поднимается ближе к корню. Массив кучи: [${heap.join(', ')}].`,
        'push',
        2,
        parentIndex,
      );
      index = parentIndex;
    }
  }

  yield frame(
    step,
    'complete',
    'completed',
    heapSnapshot(),
    `Построение min-heap завершено: вставлено ${insertionOrder.length} ключей, массив кучи [${heap.join(', ')}]. Корень ${heap[0] ?? '—'} — минимальный элемент; для каждого индекса i дети находятся в ячейках 2i+1 и 2i+2.`,
    'push',
    2,
  );
}

const buildMinHeap = (values: readonly number[]): number[] => {
  const heap: number[] = [];

  for (const value of values) {
    heap.push(value);
    let index = heap.length - 1;
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (heap[parentIndex]! <= heap[index]!) break;
      [heap[parentIndex], heap[index]] = [heap[index]!, heap[parentIndex]!];
      index = parentIndex;
    }
  }

  return heap;
};

export function* heapExtractMinScenario(inputValues?: readonly number[]): Generator<StructureAlgorithmFrame, void, unknown> {
  const sourceValues = inputValues !== undefined && inputValues.length > 0 ? [...inputValues] : [40, 15, 60, 5, 30, 55];
  const heap = buildMinHeap(sourceValues);
  let step = 0;

  const heapSnapshot = () => snapshot('Бинарная min-куча', heap);

  yield frame(
    step++,
    'initial',
    'running',
    heapSnapshot(),
    `Рассматривается уже построенная min-heap по значениям [${sourceValues.join(', ')}]. Минимум находится в корне: ${heap[0] ?? '—'} — его и извлекает операция extract-min.`,
    'pop',
    3,
    heap.length > 0 ? 0 : undefined,
    { pointers: heap.length > 0 ? { root: 0 } : {} },
  );

  if (heap.length === 0) {
    yield frame(step, 'complete', 'completed', heapSnapshot(), 'Куча пуста, извлекать нечего.', 'pop', 6);
    return;
  }

  const removed = heap[0]!;
  const last = heap.pop()!;

  if (heap.length === 0) {
    yield frame(
      step,
      'complete',
      'completed',
      heapSnapshot(),
      `Извлекаем единственный элемент ${removed}. Куча стала пустой.`,
      'pop',
      6,
    );
    return;
  }

  heap[0] = last;
  yield frame(
    step++,
    'pop',
    'running',
    heapSnapshot(),
    `Корень ${removed} удалён и сохранён как результат операции. Последний элемент ${last} переносится в корень, чтобы сохранить форму почти полного дерева. Далее — просеивание вниз (sift-down).`,
    'pop',
    4,
    0,
    { pointers: { current: 0 } },
  );

  let index = 0;
  while (true) {
    const leftIndex = 2 * index + 1;
    const rightIndex = 2 * index + 2;
    let smallestIndex = index;

    if (leftIndex < heap.length && heap[leftIndex]! < heap[smallestIndex]!) {
      smallestIndex = leftIndex;
    }
    if (rightIndex < heap.length && heap[rightIndex]! < heap[smallestIndex]!) {
      smallestIndex = rightIndex;
    }

    const pointers: Record<string, number> = { current: index };
    if (leftIndex < heap.length) pointers.left = leftIndex;
    if (rightIndex < heap.length) pointers.right = rightIndex;
    pointers.min = smallestIndex;

    yield frame(
      step++,
      'compare',
      'running',
      heapSnapshot(),
      `Просеивание вниз (sift-down): сравниваем узел ${heap[index]} с детьми${leftIndex < heap.length ? ` слева ${heap[leftIndex]}` : ''}${rightIndex < heap.length ? ` и справа ${heap[rightIndex]}` : ''}. Наименьший находится в индексе ${smallestIndex}.`,
      'pop',
      5,
      index,
      { pointers },
    );

    if (smallestIndex === index) {
      yield frame(
        step++,
        'inspect',
        'running',
        heapSnapshot(),
        `Обмен не нужен: узел ${heap[index]} не больше своих детей. Свойство min-heap восстановлено.`,
        'pop',
        6,
        index,
        { pointers: { current: index } },
      );
      break;
    }

    const parentValue = heap[index]!;
    const childValue = heap[smallestIndex]!;
    [heap[index], heap[smallestIndex]] = [heap[smallestIndex]!, heap[index]!];

    yield frame(
      step++,
      'swap',
      'running',
      heapSnapshot(),
      `Обмен: меньший ребёнок ${childValue} поднимается выше, а ${parentValue} опускается на индекс ${smallestIndex}.`,
      'pop',
      6,
      smallestIndex,
      { pointers: { current: smallestIndex } },
    );

    index = smallestIndex;
  }

  yield frame(
    step,
    'complete',
    'completed',
    heapSnapshot(),
    `Извлечение завершено: из кучи удалён минимум ${removed}, операция вернула его как результат. Новый массив кучи: [${heap.join(', ')}], новый минимум в корне: ${heap[0] ?? '—'}.`,
    'pop',
    6,
    0,
    { pointers: { root: 0 } },
  );
}


interface BinomialHeapNode {
  readonly id: string;
  readonly value: number;
  readonly children: readonly BinomialHeapNode[];
}

interface BinomialTreeViewNode {
  readonly id: string;
  readonly value: number;
  readonly degree: number;
  readonly children: readonly BinomialTreeViewNode[];
}

const getBinomialDegree = (tree: BinomialHeapNode): number => tree.children.length;

const linkBinomialTrees = (first: BinomialHeapNode, second: BinomialHeapNode): BinomialHeapNode => {
  if (first.value <= second.value) {
    return { ...first, children: [second, ...first.children] };
  }
  return { ...second, children: [first, ...second.children] };
};

const sortBinomialRoots = (roots: readonly BinomialHeapNode[]): BinomialHeapNode[] =>
  [...roots].sort((left, right) => getBinomialDegree(left) - getBinomialDegree(right) || left.value - right.value);

const findDuplicateDegreePair = (roots: readonly BinomialHeapNode[]): [number, number] | null => {
  const seen = new Map<number, number>();
  for (let index = 0; index < roots.length; index += 1) {
    const degree = getBinomialDegree(roots[index]!);
    const previousIndex = seen.get(degree);
    if (previousIndex !== undefined) return [previousIndex, index];
    seen.set(degree, index);
  }
  return null;
};

const toBinomialTreeView = (node: BinomialHeapNode): BinomialTreeViewNode => ({
  id: node.id,
  value: node.value,
  degree: getBinomialDegree(node),
  children: node.children.map(toBinomialTreeView),
});

const binomialSnapshot = (roots: readonly BinomialHeapNode[]): StructureSnapshot => ({
  label: 'Биномиальная куча',
  cells: roots.map((root, index) => ({ id: `binomial-root-${index}`, value: root.value })),
});

const binomialMeta = (
  roots: readonly BinomialHeapNode[],
  extra: Partial<StructureAlgorithmFrame['meta']> = {},
): Partial<StructureAlgorithmFrame['meta']> => ({
  binomialTrees: roots.map(toBinomialTreeView),
  ...extra,
});

export function* binomialHeapScenario(inputValues?: readonly number[]): Generator<StructureAlgorithmFrame, void, unknown> {
  const insertionOrder = inputValues !== undefined && inputValues.length > 0 ? [...inputValues] : [18, 7, 24, 3, 12, 30];
  let roots: BinomialHeapNode[] = [];
  let step = 0;
  let nodeCounter = 0;

  yield frame(
    step++,
    'initial',
    'running',
    binomialSnapshot(roots),
    `Начинаем построение биномиальной min-heap. Вставляем ключи по порядку: ${insertionOrder.join(', ')}. Корневой список сначала пуст.`,
    'push',
    1,
    undefined,
    binomialMeta(roots),
  );

  for (const value of insertionOrder) {
    const singleton: BinomialHeapNode = { id: `binomial-${nodeCounter++}`, value, children: [] };
    roots = sortBinomialRoots([...roots, singleton]);

    yield frame(
      step++,
      'push',
      'running',
      binomialSnapshot(roots),
      `Вставляем ${value}: создаём биномиальное дерево B0, то есть один узел степени 0, и добавляем его в корневой список.`,
      'push',
      1,
      undefined,
      binomialMeta(roots, { activeNodeIds: [singleton.id] }),
    );

    let duplicatePair = findDuplicateDegreePair(roots);
    while (duplicatePair !== null) {
      const [leftIndex, rightIndex] = duplicatePair;
      const leftTree = roots[leftIndex]!;
      const rightTree = roots[rightIndex]!;
      const degree = getBinomialDegree(leftTree);

      yield frame(
        step++,
        'compare',
        'running',
        binomialSnapshot(roots),
        `В корневом списке есть два дерева степени ${degree}: с корнями ${leftTree.value} и ${rightTree.value}. В биномиальной куче не должно быть двух деревьев одной степени, поэтому их нужно связать.`,
        'push',
        3,
        undefined,
        binomialMeta(roots, { activeNodeIds: [leftTree.id, rightTree.id] }),
      );

      const linked = linkBinomialTrees(leftTree, rightTree);
      roots = roots.filter((_, index) => index !== leftIndex && index !== rightIndex);
      roots = sortBinomialRoots([...roots, linked]);

      yield frame(
        step++,
        'swap',
        'running',
        binomialSnapshot(roots),
        `Связываем деревья: меньший корень ${linked.value} остаётся корнем, а второй корень становится его ребёнком. Получилось дерево степени ${getBinomialDegree(linked)}.`,
        'push',
        4,
        undefined,
        binomialMeta(roots, { activeNodeIds: [linked.id] }),
      );

      duplicatePair = findDuplicateDegreePair(roots);
    }

    const degrees = roots.map((root) => getBinomialDegree(root)).join(', ');
    yield frame(
      step++,
      'inspect',
      'running',
      binomialSnapshot(roots),
      `После вставки ${value} корневой список упорядочен по степеням: [${degrees}]. У каждой степени теперь не больше одного дерева.`,
      'push',
      5,
      undefined,
      binomialMeta(roots),
    );
  }

  const minRoot = roots.reduce<BinomialHeapNode | null>((best, root) => (best === null || root.value < best.value ? root : best), null);
  yield frame(
    step,
    'complete',
    'completed',
    binomialSnapshot(roots),
    `Построение биномиальной min-heap завершено. Корни деревьев: ${roots.map((root) => `${root.value} (степень ${getBinomialDegree(root)})`).join('; ')}. Минимальный ключ находится среди корней: ${minRoot?.value ?? '—'}.`,
    'push',
    6,
    undefined,
    binomialMeta(roots, minRoot === null ? {} : { activeNodeIds: [minRoot.id] }),
  );
}


const createRandomUniqueValues = (size: number, min: number, max: number): number[] => {
  const values = new Set<number>();
  while (values.size < size) {
    values.add(Math.floor(Math.random() * (max - min + 1)) + min);
  }
  return [...values];
};
