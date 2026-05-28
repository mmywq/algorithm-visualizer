import type { StructureAlgorithmFrame, StructureSnapshot } from '@/types';

interface DemoScenario {
  readonly title: string;
  readonly operation: StructureAlgorithmFrame['meta']['operation'];
  readonly values: readonly number[];
  readonly messages: readonly string[];
  readonly pseudocodeLines?: readonly number[];
}

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
    ...(activeIndex === undefined ? {} : { activeIndex, pointerIndex: activeIndex }),
  },
});

function* runScenario(s: DemoScenario): Generator<StructureAlgorithmFrame, void, unknown> {
  const values = [...s.values] as (number | null)[];
  let step = 0;
  const lines = s.pseudocodeLines ?? [1, 2, 3, 4, 5, 6];
  yield frame(step++, 'initial', 'running', snapshot(s.title, values), s.messages[0] ?? 'Старт.', s.operation, lines[0] ?? 1);
  for (let i = 0; i < values.length; i += 1) {
    yield frame(step++, 'inspect', 'running', snapshot(s.title, values), s.messages[(i + 1) % s.messages.length] ?? 'Шаг.', s.operation, lines[(i + 1) % lines.length] ?? 2, i);
  }
  yield frame(step, 'complete', 'completed', snapshot(s.title, values), `${s.title}: демонстрация завершена.`, s.operation, lines[lines.length - 1] ?? 6);
}

export const stackListScenario = () => runScenario({
  title: 'Стек (список)',
  operation: 'push',
  values: [9, 4, 7, 2, 1],
  messages: ['Создаём связный стек.', 'Добавляем узел в head.', 'Снимаем узел с head.'],
});

export const queueListScenario = () => runScenario({
  title: 'Очередь (список)',
  operation: 'enqueue',
  values: [3, 8, 5, 1, 6],
  messages: ['Создаём очередь на списке.', 'Добавляем в tail.', 'Удаляем из head.'],
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


export function* balancedBstScenario(inputValues?: readonly number[]): Generator<StructureAlgorithmFrame, void, unknown> {
  const sourceValues = inputValues !== undefined && inputValues.length > 0 ? [...new Set(inputValues)] : [30, 20, 40, 10, 25, 35, 50];
  const sortedValues = [...sourceValues].sort((a, b) => a - b);
  const insertionOrder = createMedianFirstOrder(sortedValues);
  const cells: Array<number | null> = Array.from({ length: 15 }, () => null);
  let step = 0;

  yield frame(step++, 'initial', 'running', snapshot('Сбалансированное BST', cells), `Чтобы дерево не выродилось в цепочку, берём значения в медианном порядке: [${insertionOrder.join(', ')}]. Медиана становится корнем, медианы половин — детьми.`, 'index', 1);

  for (const value of insertionOrder) {
    let index = 0;
    while (cells[index] !== null) {
      const current = cells[index]!;
      const goLeft = value < current;
      yield frame(step++, 'compare', 'running', snapshot('Сбалансированное BST', cells), `Сравниваем ${value} с ${current}. ${goLeft ? `${value} меньше — идём в левое поддерево` : `${value} больше или равно — идём в правое поддерево`}.`, 'index', 2, index);
      index = goLeft ? 2 * index + 1 : 2 * index + 2;
      if (index >= cells.length) {
        yield frame(step++, 'inspect', 'running', snapshot('Сбалансированное BST', cells), `Для ${value} не хватило места в текущей сетке. В реальном AVL/Red-Black дереве здесь применялась бы балансировка/расширение представления.`, 'index', 5);
        index = -1;
        break;
      }
    }

    if (index >= 0) {
      cells[index] = value;
      yield frame(step++, 'push', 'running', snapshot('Сбалансированное BST', cells), `Вставляем ${value} в позицию ${index}. Медианный порядок сохраняет малую высоту дерева без длинной цепочки.`, 'index', 3, index);
    }
  }

  yield frame(step, 'complete', 'completed', snapshot('Сбалансированное BST', cells), `Сбалансированное построение завершено. Высота остаётся близкой к log₂(n), поэтому поиск проходит через небольшое число сравнений.`, 'index', 5);
}

export function* hashOpenScenario(inputValues?: readonly number[]): Generator<StructureAlgorithmFrame, void, unknown> {
  const values = inputValues !== undefined && inputValues.length > 0 ? [...inputValues] : [12, 22, 32, 42, 52];
  const inserted: Array<number | null> = [];
  let step = 0;
  const tableSize = 5;

  yield frame(step++, 'initial', 'running', snapshot('Хеш-таблица: цепочки', inserted), `Начинаем с пустой хеш-таблицы. Индекс корзины считаем как h(key) mod ${tableSize}; при коллизии добавляем ключ в цепочку выбранной корзины.`, 'index', 1);

  for (const value of values) {
    const bucketIndex = Math.abs(value) % tableSize;
    const bucketValues = inserted.filter((candidate) => candidate !== null && Math.abs(candidate) % tableSize === bucketIndex);
    yield frame(step++, 'inspect', 'running', snapshot('Хеш-таблица: цепочки', inserted), `Ключ ${value}: h(${value}) mod ${tableSize} = ${bucketIndex}. В корзине уже ${bucketValues.length === 0 ? 'нет элементов' : `есть цепочка [${bucketValues.join(' → ')}]`}.`, 'index', 2, bucketIndex);
    inserted.push(value);
    yield frame(step++, 'push', 'running', snapshot('Хеш-таблица: цепочки', inserted), `Вставляем ${value} в корзину ${bucketIndex}${bucketValues.length > 0 ? ' в конец цепочки коллизий' : ''}. Теперь поиск ${value} начнётся сразу с этой корзины, а не со всей таблицы.`, 'index', 3, inserted.length - 1);
  }

  yield frame(step, 'complete', 'completed', snapshot('Хеш-таблица: цепочки', inserted), `Построение хеш-таблицы с цепочками завершено. Размещено ключей: ${inserted.length}. Коллизии видны как цепочки внутри одной корзины.`, 'index', 4);
}

export function* hashClosedScenario(inputValues?: readonly number[]): Generator<StructureAlgorithmFrame, void, unknown> {
  const values = inputValues !== undefined && inputValues.length > 0 ? [...inputValues] : [15, 25, 35, 45, 55];
  const tableSize = Math.max(7, values.length * 2 + 1);
  const cells: Array<number | null> = Array.from({ length: tableSize }, () => null);
  let step = 0;

  yield frame(step++, 'initial', 'running', snapshot('Хеш-таблица: открытая адресация', cells), `Начинаем с пустой таблицы на ${tableSize} ячеек. Открытая адресация хранит ключ прямо в массиве; при коллизии ищем следующую свободную ячейку линейным пробированием.`, 'index', 1);

  for (const value of values) {
    const startIndex = Math.abs(value) % tableSize;
    yield frame(step++, 'inspect', 'running', snapshot('Хеш-таблица: открытая адресация', cells), `Ключ ${value}: начальная позиция h(${value}) mod ${tableSize} = ${startIndex}. Проверяем ячейку ${startIndex}.`, 'index', 2, startIndex);

    let probe = startIndex;
    let attempts = 0;
    while (cells[probe] !== null && attempts < tableSize) {
      yield frame(step++, 'compare', 'running', snapshot('Хеш-таблица: открытая адресация', cells), `Коллизия: ячейка ${probe} уже содержит ${cells[probe]}. Сдвигаемся на следующую позицию: (${probe} + 1) mod ${tableSize}.`, 'index', 3, probe);
      probe = (probe + 1) % tableSize;
      attempts += 1;
    }

    if (attempts >= tableSize) {
      yield frame(step++, 'inspect', 'running', snapshot('Хеш-таблица: открытая адресация', cells), `Таблица заполнена: ключ ${value} вставить нельзя без расширения таблицы.`, 'index', 5);
      continue;
    }

    cells[probe] = value;
    yield frame(step++, 'push', 'running', snapshot('Хеш-таблица: открытая адресация', cells), `Вставляем ${value} в ячейку ${probe}. Количество проб для этого ключа: ${attempts + 1}.`, 'index', 4, probe);
  }

  yield frame(step, 'complete', 'completed', snapshot('Хеш-таблица: открытая адресация', cells), 'Построение хеш-таблицы с открытой адресацией завершено: все доступные ключи размещены прямо в ячейках таблицы.', 'index', 5);
}

export function* hashBlockScenario(inputValues?: readonly number[]): Generator<StructureAlgorithmFrame, void, unknown> {
  const values = inputValues !== undefined && inputValues.length > 0 ? [...inputValues] : [11, 21, 31, 41, 51];
  const blockSize = 2;
  const blockCount = 4;
  const cells: Array<number | null> = Array.from({ length: blockSize * blockCount }, () => null);
  const overflow: number[] = [];
  let step = 0;

  yield frame(step++, 'initial', 'running', snapshot('Хеш-таблица: блочная адресация', cells), `Таблица разделена на ${blockCount} блоков по ${blockSize} ячейки. h(key) выбирает блок, а внутри блока ищем свободное место; при переполнении используем overflow-блок.`, 'index', 1);

  for (const value of values) {
    const blockIndex = Math.abs(value) % blockCount;
    const start = blockIndex * blockSize;
    const end = start + blockSize;
    yield frame(step++, 'inspect', 'running', snapshot('Хеш-таблица: блочная адресация', cells), `Ключ ${value}: h(${value}) mod ${blockCount} = ${blockIndex}. Проверяем блок ${blockIndex}, ячейки ${start}..${end - 1}.`, 'index', 2, start);

    const freeOffset = cells.slice(start, end).findIndex((cell) => cell === null);
    if (freeOffset === -1) {
      overflow.push(value);
      yield frame(step++, 'push', 'running', snapshot('Хеш-таблица: блочная адресация', [...cells, ...overflow]), `Блок ${blockIndex} заполнен, поэтому ${value} уходит в overflow-область. Overflow сейчас: [${overflow.join(', ')}].`, 'index', 4, cells.length + overflow.length - 1);
      continue;
    }

    const targetIndex = start + freeOffset;
    cells[targetIndex] = value;
    yield frame(step++, 'push', 'running', snapshot('Хеш-таблица: блочная адресация', [...cells, ...overflow]), `Вставляем ${value} в блок ${blockIndex}, ячейку ${targetIndex}. Локальность блока сохраняет поиск коротким.`, 'index', 3, targetIndex);
  }

  yield frame(step, 'complete', 'completed', snapshot('Хеш-таблица: блочная адресация', [...cells, ...overflow]), `Блочная хеш-таблица построена. Основная область содержит ${cells.filter((cell) => cell !== null).length} ключей, overflow — ${overflow.length}.`, 'index', 5);
}

export function* heapScenario(inputValues?: readonly number[]): Generator<StructureAlgorithmFrame, void, unknown> {
  const values = inputValues !== undefined && inputValues.length > 0 ? [...inputValues] : [40, 15, 60, 5, 30, 55];
  const heap: number[] = [];
  let step = 0;

  yield frame(step++, 'initial', 'running', snapshot('Бинарная куча', heap), `Начинаем с пустой min-heap. Min-heap означает: родитель всегда не больше детей, поэтому минимальный приоритет находится в корне. Порядок вставки: ${values.join(', ')}.`, 'push', 1);

  for (const value of values) {
    heap.push(value);
    let index = heap.length - 1;
    yield frame(step++, 'push', 'running', snapshot('Бинарная куча', heap), `Добавляем ${value} в конец массива-кучи на индекс ${index}. Теперь выполняем sift-up — «подъём» элемента к корню, пока родитель больше ребёнка.`, 'push', 2, index);

    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parentValue = heap[parentIndex]!;
      const currentValue = heap[index]!;
      yield frame(step++, 'compare', 'running', snapshot('Бинарная куча', heap), `Сравниваем ребёнка ${currentValue} на индексе ${index} с родителем ${parentValue} на индексе ${parentIndex}. ${currentValue < parentValue ? 'Ребёнок меньше родителя — меняем их местами.' : 'Порядок min-heap уже выполнен — подъём остановлен.'}`, 'push', 3, index);

      if (currentValue >= parentValue) {
        break;
      }

      [heap[parentIndex], heap[index]] = [heap[index]!, heap[parentIndex]!];
      yield frame(step++, 'swap', 'running', snapshot('Бинарная куча', heap), `После обмена ${currentValue} поднялся на индекс ${parentIndex}, а ${parentValue} опустился на индекс ${index}. Инвариант проверяем выше по дереву.`, 'push', 4, parentIndex);
      index = parentIndex;
    }
  }

  yield frame(step, 'complete', 'completed', snapshot('Бинарная куча', heap), `Построение min-heap завершено. Корень ${heap[0] ?? '—'} — минимальный элемент; массив-куча: [${heap.join(', ')}].`, 'push', 5, 0);
}

export function* binomialHeapScenario(inputValues?: readonly number[]): Generator<StructureAlgorithmFrame, void, unknown> {
  const values = inputValues !== undefined && inputValues.length > 0 ? [...inputValues] : [18, 7, 24, 3, 12, 30];
  const roots: number[] = [];
  let step = 0;

  yield frame(step++, 'initial', 'running', snapshot('Биномиальная куча', roots), `Начинаем с пустой биномиальной кучи. Каждый новый ключ сначала создаёт отдельное биномиальное дерево степени 0.`, 'push', 1);

  for (const value of values) {
    roots.push(value);
    yield frame(step++, 'push', 'running', snapshot('Биномиальная куча', roots), `Вставляем ${value}: создаём новое дерево степени 0 и добавляем его в список корней.`, 'push', 1, roots.length - 1);
    roots.sort((a, b) => a - b);
    yield frame(step++, 'merge', 'running', snapshot('Биномиальная куча', roots), `Выполняем union: упорядочиваем корневой список по ключам для наглядности. Минимальный корень сейчас ${roots[0]}. В настоящей биномиальной куче деревья одинаковой степени сливаются.`, 'push', 2, 0);
  }

  yield frame(step, 'complete', 'completed', snapshot('Биномиальная куча', roots), `Биномиальная куча построена. Минимальный ключ среди корней — ${roots[0] ?? '—'}, список корней: [${roots.join(', ')}].`, 'push', 4, 0);
}



const createRandomUniqueValues = (size: number, min: number, max: number): number[] => {
  const values = new Set<number>();
  while (values.size < size) {
    values.add(Math.floor(Math.random() * (max - min + 1)) + min);
  }
  return [...values];
};

const createMedianFirstOrder = (values: readonly number[]): number[] => {
  if (values.length === 0) return [];
  const middle = Math.floor(values.length / 2);
  return [values[middle]!, ...createMedianFirstOrder(values.slice(0, middle)), ...createMedianFirstOrder(values.slice(middle + 1))];
};
