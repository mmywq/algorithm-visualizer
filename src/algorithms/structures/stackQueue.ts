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
  pseudocodeLine: number,
  message: string,
  snapshot: StructureSnapshot,
  operation: StructureAlgorithmFrame['meta']['operation'],
  activeIndex?: number,
  pointers?: Readonly<Record<string, number>>,
): StructureAlgorithmFrame => ({
  step,
  domain: 'array',
  phase,
  status: phase === 'complete' ? 'completed' : 'running',
  data: snapshot,
  activeIds: activeIndex === undefined ? [] : [snapshot.cells[activeIndex]?.id ?? ''],
  pseudocode: { line: pseudocodeLine },
  message,
  description: message,
  meta: {
    operation,
    ...(activeIndex === undefined ? {} : { activeIndex, pointerIndex: activeIndex }),
    ...(pointers === undefined ? {} : { pointers }),
  },
});

export function* stackArrayDemo({ values, capacity = 8 }: DemoInput): Generator<StructureAlgorithmFrame, void, unknown> {
  const storage: (number | null)[] = Array.from({ length: Math.max(capacity, values.length) }, () => null);
  let top = -1;
  let step = 0;

  yield makeFrame(
    step++,
    'initial',
    1,
    `Стек на массиве начинается пустым. Указатель top равен -1: это означает, что в стеке нет вершины. Значения для добавления: [${values.join(', ')}].`,
    createSnapshot('Стек (массив)', storage),
    'push',
    undefined,
    { top },
  );

  for (const value of values) {
    top += 1;
    storage[top] = value;
    yield makeFrame(
      step++,
      'push',
      2,
      `Операция push(${value}): увеличиваем top до ${top} и записываем ${value} в ячейку ${top}. Эта ячейка становится новой вершиной стека.`,
      createSnapshot('Стек (массив)', storage),
      'push',
      top,
      { top },
    );
  }

  while (top >= 0) {
    const popped = storage[top];
    yield makeFrame(
      step++,
      'pop',
      4,
      `Операция pop(): читаем вершину a[${top}] = ${popped}. Именно этот элемент удаляется первым, потому что стек работает по правилу LIFO.`,
      createSnapshot('Стек (массив)', storage),
      'pop',
      top,
      { top },
    );
    storage[top] = null;
    top -= 1;
    yield makeFrame(
      step++,
      'inspect',
      5,
      `После удаления очищаем прежнюю вершину и сдвигаем top к ${top}. Теперь следующей вершиной будет элемент с индексом ${top}, если он существует.`,
      createSnapshot('Стек (массив)', storage),
      'pop',
      top >= 0 ? top : undefined,
      { top },
    );
  }

  yield makeFrame(step, 'complete', 6, 'Стек на массиве пуст: все добавленные элементы были извлечены в порядке, обратном порядку вставки.', createSnapshot('Стек (массив)', storage), 'pop', undefined, { top: -1 });
}

export function* queueArrayDemo({ values, capacity = 10 }: DemoInput): Generator<StructureAlgorithmFrame, void, unknown> {
  const storage: (number | null)[] = Array.from({ length: Math.max(capacity, values.length) }, () => null);
  let head = 0;
  let tail = 0;
  let step = 0;

  yield makeFrame(
    step++,
    'initial',
    1,
    `Очередь на массиве начинается пустой. head = ${head} указывает на позицию первого элемента, tail = ${tail} указывает на позицию следующей вставки. Значения для добавления: [${values.join(', ')}].`,
    createSnapshot('Очередь (массив)', storage),
    'enqueue',
    undefined,
    { head, tail },
  );

  for (const value of values) {
    storage[tail] = value;
    yield makeFrame(
      step++,
      'enqueue',
      3,
      `Операция enqueue(${value}): записываем ${value} в позицию tail = ${tail}. После вставки хвост очереди сдвинется на следующую свободную позицию.`,
      createSnapshot('Очередь (массив)', storage),
      'enqueue',
      tail,
      { head, tail },
    );
    tail += 1;
    yield makeFrame(
      step++,
      'inspect',
      3,
      `tail увеличен до ${tail}. В очереди находятся элементы на полуинтервале индексов [${head}, ${tail}).`,
      createSnapshot('Очередь (массив)', storage),
      'enqueue',
      tail < storage.length ? tail : undefined,
      { head, tail },
    );
  }

  while (head < tail) {
    const taken = storage[head];
    yield makeFrame(
      step++,
      'dequeue',
      4,
      `Операция dequeue(): читаем голову очереди a[${head}] = ${taken}. Этот элемент был добавлен раньше остальных, поэтому удаляется первым по правилу FIFO.`,
      createSnapshot('Очередь (массив)', storage),
      'dequeue',
      head,
      { head, tail },
    );
    storage[head] = null;
    head += 1;
    yield makeFrame(
      step++,
      'inspect',
      5,
      `После удаления очищаем прежнюю голову и сдвигаем head к ${head}. Очередь пуста, когда head становится равен tail.`,
      createSnapshot('Очередь (массив)', storage),
      'dequeue',
      head < tail ? head : undefined,
      { head, tail },
    );
  }

  yield makeFrame(step, 'complete', 6, 'Очередь на массиве пуста: все элементы извлечены в том же порядке, в котором были добавлены.', createSnapshot('Очередь (массив)', storage), 'dequeue', undefined, { head, tail });
}

export function* indexingDemo({ values }: DemoInput): Generator<StructureAlgorithmFrame, void, unknown> {
  let step = 0;
  const storage: (number | null)[] = [...values];

  yield makeFrame(
    step++,
    'initial',
    1,
    `Массив хранит элементы в последовательных ячейках. Индекс i задаёт позицию, поэтому обращение a[i] сразу выбирает нужную ячейку. Исходный массив: [${values.join(', ')}].`,
    createSnapshot('Индексирование', storage),
    'index',
    undefined,
    { i: 0 },
  );

  for (let index = 0; index < storage.length; index += 1) {
    yield makeFrame(step++, 'inspect', 2, `Читаем элемент по индексу i = ${index}: значение a[${index}] равно ${storage[index]}.`, createSnapshot('Индексирование', storage), 'index', index, { i: index });
  }
  yield makeFrame(step, 'complete', 4, `Индексирование завершено: просмотрены позиции от 0 до ${storage.length - 1}, значения массива сохранены без изменения.`, createSnapshot('Индексирование', storage), 'index', undefined, { i: -1 });
}

export function* stackListDemo({ values }: DemoInput): Generator<StructureAlgorithmFrame, void, unknown> {
  const list: (number | null)[] = [];
  let step = 0;

  yield makeFrame(step++, 'initial', 1, `Стек на связном списке начинается с пустой головы head. Новые элементы будут добавляться в начало списка, поэтому head одновременно является вершиной стека. Значения для добавления: [${values.join(', ')}].`, createSnapshot('Стек (список)', list), 'push', undefined, { head: -1, top: -1 });

  for (const value of values) {
    list.unshift(value);
    yield makeFrame(step++, 'push', 2, `Операция push(${value}): создаём новый узел и помещаем его перед прежней головой списка. Новый head содержит ${value}.`, createSnapshot('Стек (список)', list), 'push', 0, { head: 0, top: 0 });
  }

  while (list.length > 0) {
    const popped = list[0];
    yield makeFrame(step++, 'pop', 4, `Операция pop(): читаем узел head со значением ${popped}. Он удаляется первым, потому что находится на вершине стека.`, createSnapshot('Стек (список)', list), 'pop', 0, { head: 0, top: 0 });
    list.shift();
    yield makeFrame(step++, 'inspect', 5, list.length > 0 ? `head переставлен на следующий узел со значением ${list[0]}.` : 'После удаления список пуст: head не указывает ни на один узел.', createSnapshot('Стек (список)', list), 'pop', list.length > 0 ? 0 : undefined, { head: list.length > 0 ? 0 : -1, top: list.length > 0 ? 0 : -1 });
  }

  yield makeFrame(step, 'complete', 6, 'Стек на связном списке пуст: все узлы удалены с головы списка.', createSnapshot('Стек (список)', list), 'pop', undefined, { head: -1, top: -1 });
}

export function* queueListDemo({ values }: DemoInput): Generator<StructureAlgorithmFrame, void, unknown> {
  const list: (number | null)[] = [];
  let step = 0;

  yield makeFrame(step++, 'initial', 1, `Очередь на связном списке начинается пустой. head указывает на первый элемент очереди, tail — на последний. Значения для добавления: [${values.join(', ')}].`, createSnapshot('Очередь (список)', list), 'enqueue', undefined, { head: -1, tail: -1 });

  for (const value of values) {
    list.push(value);
    yield makeFrame(step++, 'enqueue', 2, `Операция enqueue(${value}): добавляем новый узел в конец списка. tail теперь указывает на узел с индексом ${list.length - 1}.`, createSnapshot('Очередь (список)', list), 'enqueue', list.length - 1, { head: 0, tail: list.length - 1 });
  }

  while (list.length > 0) {
    const taken = list[0];
    yield makeFrame(step++, 'dequeue', 4, `Операция dequeue(): читаем узел head со значением ${taken}. Это самый ранний добавленный элемент, поэтому он удаляется первым.`, createSnapshot('Очередь (список)', list), 'dequeue', 0, { head: 0, tail: list.length - 1 });
    list.shift();
    yield makeFrame(step++, 'inspect', 5, list.length > 0 ? `head переставлен на следующий узел со значением ${list[0]}, tail остаётся на последнем узле.` : 'После удаления очередь пуста: head и tail сброшены.', createSnapshot('Очередь (список)', list), 'dequeue', list.length > 0 ? 0 : undefined, { head: list.length > 0 ? 0 : -1, tail: list.length > 0 ? list.length - 1 : -1 });
  }

  yield makeFrame(step, 'complete', 6, 'Очередь на связном списке пуста: все узлы извлечены в порядке поступления.', createSnapshot('Очередь (список)', list), 'dequeue', undefined, { head: -1, tail: -1 });
}
