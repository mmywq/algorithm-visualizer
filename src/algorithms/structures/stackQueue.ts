import type { StructureAlgorithmFrame, StructureSnapshot } from '@/types';

interface DemoInput {
  readonly values: readonly number[];
  readonly capacity?: number;
}

const createSnapshot = (label: string, storage: readonly (number | null)[]): StructureSnapshot => ({
  label,
  cells: storage.map((value, index) => ({ id: `${label}-${index}`, value })),
});

const makeFrame = (
  step: number,
  phase: StructureAlgorithmFrame['phase'],
  status: StructureAlgorithmFrame['status'],
  pseudocodeLine: number,
  message: string,
  snapshot: StructureSnapshot,
  operation: StructureAlgorithmFrame['meta']['operation'],
  pointerIndex?: number,
  activeIndex?: number,
  pointers?: Readonly<Record<string, number>>,
): StructureAlgorithmFrame => ({
  step,
  domain: 'array',
  phase,
  status,
  data: snapshot,
  activeIds: activeIndex === undefined ? [] : [snapshot.cells[activeIndex]?.id ?? ''],
  pseudocode: { line: pseudocodeLine },
  message,
  description: message,
  meta: {
    operation,
    ...(pointerIndex === undefined ? {} : { pointerIndex }),
    ...(activeIndex === undefined ? {} : { activeIndex }),
    ...(pointers === undefined ? {} : { pointers }),
  },
});

export function* stackArrayDemo({ values, capacity = 8 }: DemoInput): Generator<StructureAlgorithmFrame, void, unknown> {
  const storage: (number | null)[] = Array.from({ length: capacity }, () => null);
  let top = -1;
  let step = 0;
  for (const value of values) {
    top += 1;
    storage[top] = value;
    yield makeFrame(step++, 'push', 'running', 2, `Добавляем значение ${value} в вершину стека: указатель top смещается на одну позицию вправо.`, createSnapshot('Стек (массив)', storage), 'push', top, top, { top: -1 });
  }
  while (top >= 0) {
    const popped = storage[top];
    storage[top] = null;
    yield makeFrame(step++, 'pop', 'running', 4, `Снимаем элемент ${popped} с вершины стека и уменьшаем указатель top.`, createSnapshot('Стек (массив)', storage), 'pop', top - 1, top, { top: top - 1 });
    top -= 1;
  }
  yield makeFrame(step, 'complete', 'completed', 6, 'Демонстрация Стек (массив) завершена.', createSnapshot('Стек (массив)', storage), 'pop', undefined, undefined, { top: -1 });
}

export function* queueArrayDemo({ values, capacity = 10 }: DemoInput): Generator<StructureAlgorithmFrame, void, unknown> {
  const storage: (number | null)[] = Array.from({ length: capacity }, () => null);
  let head = 0;
  let tail = 0;
  let step = 0;

  for (const value of values) {
    storage[tail] = value;
    yield makeFrame(step++, 'enqueue', 'running', 2, `Добавляем значение ${value} в хвост очереди: элемент встаёт после текущего tail.`, createSnapshot('Очередь (массив)', storage), 'enqueue', tail, tail, { head: 0, tail: 0 });
    tail += 1;
  }

  while (head < tail) {
    const taken = storage[head];
    storage[head] = null;
    yield makeFrame(step++, 'dequeue', 'running', 4, `Извлекаем элемент ${taken} из головы очереди: указатель head смещается вправо.`, createSnapshot('Очередь (массив)', storage), 'dequeue', head + 1, head, { head: head + 1, tail });
    head += 1;
  }

  yield makeFrame(step, 'complete', 'completed', 6, 'Демонстрация Очередь (массив) завершена.', createSnapshot('Очередь (массив)', storage), 'dequeue', undefined, undefined, { head: 0, tail: 0 });
}

export function* indexingDemo({ values }: DemoInput): Generator<StructureAlgorithmFrame, void, unknown> {
  let step = 0;
  const storage: (number | null)[] = [...values];
  for (let index = 0; index < storage.length; index += 1) {
    yield makeFrame(step++, 'inspect', 'running', 2, `Читаем элемент по индексу i=${index}: a[i] = ${storage[index]}.`, createSnapshot('Индексирование', storage), 'index', index, index, { i: index });
  }
  yield makeFrame(step, 'complete', 'completed', 4, 'Индексирование завершено: все позиции массива просмотрены последовательно.', createSnapshot('Индексирование', storage), 'index', undefined, undefined, { i: -1 });
}


export function* stackListDemo({ values }: DemoInput): Generator<StructureAlgorithmFrame, void, unknown> {
  const list: (number | null)[] = [];
  let step = 0;
  for (const value of values) {
    list.unshift(value);
    yield makeFrame(step++, 'push', 'running', 2, `Добавляем значение ${value} в голову связного списка: это новая вершина стека.`, createSnapshot('Стек (список)', list), 'push', 0, 0, { head: 0, top: 0 });
  }
  while (list.length > 0) {
    const popped = list.shift();
    yield makeFrame(step++, 'pop', 'running', 4, `Снимаем элемент ${popped} с вершины стека и уменьшаем указатель top.`, createSnapshot('Стек (список)', list), 'pop', 0, 0, { head: 0, top: 0 });
  }
  yield makeFrame(step, 'complete', 'completed', 6, 'Демонстрация Стек (список) завершена.', createSnapshot('Стек (список)', list), 'pop', undefined, undefined, { top: -1 });
}

export function* queueListDemo({ values }: DemoInput): Generator<StructureAlgorithmFrame, void, unknown> {
  const list: (number | null)[] = [];
  let step = 0;
  for (const value of values) {
    list.push(value);
    yield makeFrame(step++, 'enqueue', 'running', 2, `Добавляем значение ${value} в хвост списка: tail ссылается на новый узел.`, createSnapshot('Очередь (список)', list), 'enqueue', list.length - 1, list.length - 1, { head: 0, tail: list.length - 1 });
  }
  while (list.length > 0) {
    const taken = list.shift();
    yield makeFrame(step++, 'dequeue', 'running', 4, `Извлекаем элемент ${taken} из головы очереди: указатель head смещается вправо.`, createSnapshot('Очередь (список)', list), 'dequeue', 0, 0, { head: 0, tail: Math.max(0, list.length - 1) });
  }
  yield makeFrame(step, 'complete', 'completed', 6, 'Демонстрация Очередь (список) завершена.', createSnapshot('Очередь (список)', list), 'dequeue', undefined, undefined, { head: 0, tail: 0 });
}
