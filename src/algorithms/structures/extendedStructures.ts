import type { StructureAlgorithmFrame, StructureSnapshot } from '@/types';

interface DemoScenario {
  readonly title: string;
  readonly operation: StructureAlgorithmFrame['meta']['operation'];
  readonly values: readonly number[];
  readonly messages: readonly string[];
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
  activeIndex?: number,
): StructureAlgorithmFrame => ({
  step,
  domain: 'array',
  phase,
  status,
  data,
  activeIds: activeIndex === undefined ? [] : [data.cells[activeIndex]?.id ?? ''],
  pseudocode: { line: step + 1 },
  message,
  meta: { operation, activeIndex, pointerIndex: activeIndex },
});

function* runScenario(s: DemoScenario): Generator<StructureAlgorithmFrame, void, unknown> {
  const values = [...s.values] as (number | null)[];
  let step = 0;
  yield frame(step++, 'initial', 'running', snapshot(s.title, values), s.messages[0] ?? 'Старт.', s.operation);
  for (let i = 0; i < values.length; i += 1) {
    yield frame(step++, 'inspect', 'running', snapshot(s.title, values), s.messages[(i + 1) % s.messages.length] ?? 'Шаг.', s.operation, i);
  }
  yield frame(step, 'complete', 'completed', snapshot(s.title, values), `${s.title}: демонстрация завершена.`, s.operation);
}

export const stackListScenario = () => runScenario({
  title: 'Stack(List)',
  operation: 'push',
  values: [9, 4, 7, 2, 1],
  messages: ['Создаём связный стек.', 'Добавляем узел в head.', 'Снимаем узел с head.'],
});

export const queueListScenario = () => runScenario({
  title: 'Queue(List)',
  operation: 'enqueue',
  values: [3, 8, 5, 1, 6],
  messages: ['Создаём очередь на списке.', 'Добавляем в tail.', 'Удаляем из head.'],
});

export const bstScenario = () => runScenario({
  title: 'BST',
  operation: 'index',
  values: [50, 30, 70, 20, 40, 60, 80],
  messages: ['Вставка в BST.', 'Сравниваем и идём влево/вправо.', 'Поиск ключа в BST.'],
});

export const balancedBstScenario = () => runScenario({
  title: 'Balanced BST',
  operation: 'index',
  values: [30, 20, 40, 10, 25, 35, 50],
  messages: ['Вставка в AVL/Red-Black.', 'Проверяем баланс.', 'Выполняем вращение.'],
});

export const hashOpenScenario = () => runScenario({
  title: 'Hash Open Chaining',
  operation: 'index',
  values: [12, 22, 32, 42, 52],
  messages: ['Хешируем ключ.', 'Коллизия: вставка в цепочку.', 'Поиск по цепочке bucket.'],
});

export const hashClosedScenario = () => runScenario({
  title: 'Hash Open Addressing',
  operation: 'index',
  values: [15, 25, 35, 45, 55],
  messages: ['Хешируем ключ.', 'Коллизия: линейное/квадратичное пробирование.', 'Найдена свободная ячейка.'],
});

export const hashBlockScenario = () => runScenario({
  title: 'Hash Block Addressing',
  operation: 'index',
  values: [11, 21, 31, 41, 51],
  messages: ['Хешируем ключ.', 'Заполняем блок bucket.', 'Переход к overflow-блоку.'],
});

export const heapScenario = () => runScenario({
  title: 'Heap',
  operation: 'push',
  values: [40, 15, 60, 5, 30, 55],
  messages: ['Вставка в кучу.', 'Sift-up/sift-down.', 'Извлечение корня.'],
});

export const binomialHeapScenario = () => runScenario({
  title: 'Binomial Heap',
  operation: 'push',
  values: [18, 7, 24, 3, 12, 30],
  messages: ['Создаём биномиальные деревья.', 'Union по степеням.', 'Extract-min.'],
});
