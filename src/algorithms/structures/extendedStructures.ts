import { avlScenario } from './avlTree';
import { hashBlockAddressingScenario, hashChainingScenario, hashOpenAddressingScenario } from './hashTable';
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


export const balancedBstScenario = (inputValues?: readonly number[]) =>
  avlScenario(inputValues !== undefined && inputValues.length > 0 ? inputValues : [50, 30, 70, 20, 40, 60, 80]);

export const hashOpenScenario = (inputValues?: readonly number[]) =>
  hashChainingScenario(inputValues !== undefined && inputValues.length > 0 ? inputValues : [12, 22, 32, 42, 52], 7);

export const hashClosedScenario = (inputValues?: readonly number[]) =>
  hashOpenAddressingScenario(inputValues !== undefined && inputValues.length > 0 ? inputValues : [12, 22, 32, 42, 52], 11);

export const hashBlockScenario = (inputValues?: readonly number[]) =>
  hashBlockAddressingScenario(inputValues !== undefined && inputValues.length > 0 ? inputValues : [12, 22, 32, 42, 52], 5, 2);

export const heapScenario = (inputValues?: readonly number[]) => runScenario({
  title: 'Бинарная куча',
  operation: 'push',
  values: inputValues !== undefined && inputValues.length > 0 ? inputValues : [40, 15, 60, 5, 30, 55],
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
