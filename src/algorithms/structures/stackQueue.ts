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
): StructureAlgorithmFrame => ({
  step,
  domain: 'array',
  phase,
  status,
  data: snapshot,
  activeIds: activeIndex === undefined ? [] : [snapshot.cells[activeIndex]?.id ?? ''],
  pseudocode: { line: pseudocodeLine },
  message,
  meta: {
    operation,
    ...(pointerIndex === undefined ? {} : { pointerIndex }),
    ...(activeIndex === undefined ? {} : { activeIndex }),
  },
});

export function* stackArrayDemo({ values, capacity = 8 }: DemoInput): Generator<StructureAlgorithmFrame, void, unknown> {
  const storage: (number | null)[] = Array.from({ length: capacity }, () => null);
  let top = -1;
  let step = 0;
  for (const value of values) {
    top += 1;
    storage[top] = value;
    yield makeFrame(step++, 'push', 'running', 2, `push(${value}) в стек (array).`, createSnapshot('Stack(Array)', storage), 'push', top, top);
  }
  while (top >= 0) {
    const popped = storage[top];
    storage[top] = null;
    yield makeFrame(step++, 'pop', 'running', 4, `pop() => ${popped}.`, createSnapshot('Stack(Array)', storage), 'pop', top - 1, top);
    top -= 1;
  }
  yield makeFrame(step, 'complete', 'completed', 6, 'Демонстрация Stack(Array) завершена.', createSnapshot('Stack(Array)', storage), 'pop');
}

export function* queueArrayDemo({ values, capacity = 10 }: DemoInput): Generator<StructureAlgorithmFrame, void, unknown> {
  const storage: (number | null)[] = Array.from({ length: capacity }, () => null);
  let head = 0;
  let tail = 0;
  let step = 0;

  for (const value of values) {
    storage[tail] = value;
    yield makeFrame(step++, 'enqueue', 'running', 2, `enqueue(${value}) в очередь (array).`, createSnapshot('Queue(Array)', storage), 'enqueue', tail, tail);
    tail += 1;
  }

  while (head < tail) {
    const taken = storage[head];
    storage[head] = null;
    yield makeFrame(step++, 'dequeue', 'running', 4, `dequeue() => ${taken}.`, createSnapshot('Queue(Array)', storage), 'dequeue', head + 1, head);
    head += 1;
  }

  yield makeFrame(step, 'complete', 'completed', 6, 'Демонстрация Queue(Array) завершена.', createSnapshot('Queue(Array)', storage), 'dequeue');
}

export function* indexingDemo({ values }: DemoInput): Generator<StructureAlgorithmFrame, void, unknown> {
  let step = 0;
  const storage: (number | null)[] = [...values];
  for (let index = 0; index < storage.length; index += 1) {
    yield makeFrame(step++, 'inspect', 'running', 2, `Читаем a[${index}] = ${storage[index]}.`, createSnapshot('Indexing', storage), 'index', index, index);
  }
  yield makeFrame(step, 'complete', 'completed', 4, 'Индексирование завершено.', createSnapshot('Indexing', storage), 'index');
}


export function* stackListDemo({ values }: DemoInput): Generator<StructureAlgorithmFrame, void, unknown> {
  const list: (number | null)[] = [];
  let step = 0;
  for (const value of values) {
    list.unshift(value);
    yield makeFrame(step++, 'push', 'running', 2, `push(${value}) в стек (list head).`, createSnapshot('Stack(List)', list), 'push', 0, 0);
  }
  while (list.length > 0) {
    const popped = list.shift();
    yield makeFrame(step++, 'pop', 'running', 4, `pop() => ${popped}.`, createSnapshot('Stack(List)', list), 'pop', 0, 0);
  }
  yield makeFrame(step, 'complete', 'completed', 6, 'Демонстрация Stack(List) завершена.', createSnapshot('Stack(List)', list), 'pop');
}

export function* queueListDemo({ values }: DemoInput): Generator<StructureAlgorithmFrame, void, unknown> {
  const list: (number | null)[] = [];
  let step = 0;
  for (const value of values) {
    list.push(value);
    yield makeFrame(step++, 'enqueue', 'running', 2, `enqueue(${value}) в очередь (list tail).`, createSnapshot('Queue(List)', list), 'enqueue', list.length - 1, list.length - 1);
  }
  while (list.length > 0) {
    const taken = list.shift();
    yield makeFrame(step++, 'dequeue', 'running', 4, `dequeue() => ${taken}.`, createSnapshot('Queue(List)', list), 'dequeue', 0, 0);
  }
  yield makeFrame(step, 'complete', 'completed', 6, 'Демонстрация Queue(List) завершена.', createSnapshot('Queue(List)', list), 'dequeue');
}
