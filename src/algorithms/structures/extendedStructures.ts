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
  domain: 'array',
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

export function* bstScenario(): Generator<StructureAlgorithmFrame, void, unknown> {
  const insertionOrder = createRandomUniqueValues(7, -100, 100);
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


export const balancedBstScenario = () => runScenario({
  title: 'Сбалансированное BST',
  operation: 'index',
  values: [30, 20, 40, 10, 25, 35, 50],
  messages: [
    'Вставляем ключи как в BST, но после каждой вставки проверяем баланс высот.',
    'Если разность высот поддеревьев выходит за пределы {-1,0,1}, требуется балансировка.',
    'Случай LL/RR: применяем одиночный поворот.',
    'Случай LR/RL: применяем двойной поворот.',
    'После поворотов структура снова обеспечивает логарифмическую высоту.',
  ],
  pseudocodeLines: [1, 2, 3, 4, 5],
});

export const hashOpenScenario = () => runScenario({
  title: 'Хеш-таблица: цепочки',
  operation: 'index',
  values: [12, 22, 32, 42, 52],
  messages: [
    'Вычисляем индекс корзины: h(key) mod m.',
    'Если корзина занята, добавляем элемент в связный список этой корзины.',
    'Поиск проходит по элементам одной корзины, а не всей таблицы.',
  ],
});

export const hashClosedScenario = () => runScenario({
  title: 'Хеш-таблица: открытая адресация',
  operation: 'index',
  values: [15, 25, 35, 45, 55],
  messages: [
    'Вычисляем начальную позицию: h(key).',
    'При коллизии пробируем следующие позиции (линейно/квадратично/двойным хешем).',
    'Вставляем элемент в первую найденную свободную ячейку.',
  ],
});

export const hashBlockScenario = () => runScenario({
  title: 'Хеш-таблица: блочная адресация',
  operation: 'index',
  values: [11, 21, 31, 41, 51],
  messages: [
    'Хешируем ключ и определяем номер блока таблицы.',
    'Заполняем ячейки выбранного блока по локальным правилам размещения.',
    'Если блок переполнен, переходим к связанному overflow-блоку.',
  ],
});

export const heapScenario = () => runScenario({
  title: 'Бинарная куча',
  operation: 'push',
  values: [40, 15, 60, 5, 30, 55],
  messages: [
    'Добавляем элемент в конец массива-кучи.',
    'Поднимаем элемент вверх (sift-up), пока не выполнится инвариант кучи.',
    'При извлечении корня переносим последний элемент вверх и выполняем sift-down.',
    'После перестройки корень снова содержит минимальный/максимальный приоритет.',
  ],
  pseudocodeLines: [1, 2, 3, 4],
});

export const binomialHeapScenario = () => runScenario({
  title: 'Биномиальная куча',
  operation: 'push',
  values: [18, 7, 24, 3, 12, 30],
  messages: [
    'Каждый вставленный элемент создаёт биномиальное дерево степени 0.',
    'Операция union сливает корневые списки по возрастанию степеней.',
    'Деревья одинаковой степени объединяются, сохраняя свойство min-heap.',
    'extract-min выбирает корень с минимальным ключом и повторно объединяет поддеревья.',
  ],
  pseudocodeLines: [1, 2, 3, 4],
});


const createRandomUniqueValues = (size: number, min: number, max: number): number[] => {
  const values = new Set<number>();
  while (values.size < size) {
    values.add(Math.floor(Math.random() * (max - min + 1)) + min);
  }
  return [...values];
};
