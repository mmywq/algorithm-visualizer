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

const createArrayStorage = (values: readonly number[], capacity: number): (number | null)[] =>
  Array.from({ length: Math.max(capacity, values.length) }, (_, index) => values[index] ?? null);

export function* stackArrayDemo(input: DemoInput): Generator<StructureAlgorithmFrame, void, unknown> {
  yield* stackArrayPushDemo(input);
}

export function* stackArrayPushDemo({ values, capacity = 8 }: DemoInput): Generator<StructureAlgorithmFrame, void, unknown> {
  const storage: (number | null)[] = Array.from({ length: Math.max(capacity, values.length) }, () => null);
  let top = -1;
  let step = 0;

  yield makeFrame(
    step++,
    'initial',
    1,
    `Операция push изучается отдельно. Стек на массиве начинается пустым: top = -1, поэтому вершины ещё нет. Значения будут добавляться по одному: [${values.join(', ')}].`,
    createSnapshot('Стек push (массив)', storage),
    'push',
    undefined,
    { top },
  );

  for (const value of values) {
    top += 1;
    yield makeFrame(
      step++,
      'inspect',
      2,
      `Перед push(${value}) увеличиваем top до ${top}. Этот индекс указывает, куда будет записан новый элемент.`,
      createSnapshot('Стек push (массив)', storage),
      'push',
      top,
      { top },
    );
    storage[top] = value;
    yield makeFrame(
      step++,
      'push',
      3,
      `Записываем ${value} в a[${top}]. Теперь ${value} находится на вершине стека и будет удалён первым, если затем выполнить pop.`,
      createSnapshot('Стек push (массив)', storage),
      'push',
      top,
      { top },
    );
  }

  yield makeFrame(
    step,
    'complete',
    4,
    `Операция push завершена: стек содержит [${storage.filter((value) => value !== null).join(', ')}], вершина находится в ячейке ${top}. Удаление pop здесь не выполняется — оно вынесено в отдельный режим.`,
    createSnapshot('Стек push (массив)', storage),
    'push',
    top,
    { top },
  );
}

export function* stackArrayPopDemo({ values, capacity = 8 }: DemoInput): Generator<StructureAlgorithmFrame, void, unknown> {
  const storage = createArrayStorage(values, capacity);
  let top = values.length - 1;
  let step = 0;

  yield makeFrame(
    step++,
    'initial',
    1,
    `Операция pop изучается отдельно. Стек уже заполнен значениями [${values.join(', ')}], вершина находится в ячейке top = ${top}. Pop всегда удаляет именно вершину.`,
    createSnapshot('Стек pop (массив)', storage),
    'pop',
    top,
    { top },
  );

  while (top >= 0) {
    const popped = storage[top];
    yield makeFrame(
      step++,
      'pop',
      2,
      `Читаем a[${top}] = ${popped}. Это верхний элемент стека, поэтому он удаляется раньше всех остальных по правилу LIFO.`,
      createSnapshot('Стек pop (массив)', storage),
      'pop',
      top,
      { top },
    );
    storage[top] = null;
    top -= 1;
    yield makeFrame(
      step++,
      'inspect',
      3,
      top >= 0
        ? `Очищаем удалённую ячейку и переносим top к ${top}. Следующей вершиной становится a[${top}] = ${storage[top]}.`
        : 'Очищаем последнюю ячейку и получаем top = -1. Это означает, что стек пуст.',
      createSnapshot('Стек pop (массив)', storage),
      'pop',
      top >= 0 ? top : undefined,
      { top },
    );
  }

  yield makeFrame(step, 'complete', 4, 'Операция pop завершена: все элементы были извлечены сверху вниз, стек пуст.', createSnapshot('Стек pop (массив)', storage), 'pop', undefined, { top: -1 });
}

export function* queueArrayDemo(input: DemoInput): Generator<StructureAlgorithmFrame, void, unknown> {
  yield* queueArrayEnqueueDemo(input);
}

export function* queueArrayEnqueueDemo({ values, capacity = 10 }: DemoInput): Generator<StructureAlgorithmFrame, void, unknown> {
  const storage: (number | null)[] = Array.from({ length: Math.max(capacity, values.length) }, () => null);
  let head = 0;
  let tail = 0;
  let step = 0;

  yield makeFrame(
    step++,
    'initial',
    1,
    `Операция enqueue изучается отдельно. Очередь на массиве начинается пустой: head = ${head}, tail = ${tail}. Новые элементы будут записываться в позицию tail.`,
    createSnapshot('Очередь enqueue (массив)', storage),
    'enqueue',
    undefined,
    { head, tail },
  );

  for (const value of values) {
    yield makeFrame(
      step++,
      'inspect',
      2,
      `Готовим enqueue(${value}): свободная позиция для вставки — tail = ${tail}. Голова head = ${head} не меняется, потому что удаление сейчас не выполняется.`,
      createSnapshot('Очередь enqueue (массив)', storage),
      'enqueue',
      tail,
      { head, tail },
    );
    storage[tail] = value;
    yield makeFrame(
      step++,
      'enqueue',
      3,
      `Записываем ${value} в a[${tail}]. Элемент становится последним в очереди.`,
      createSnapshot('Очередь enqueue (массив)', storage),
      'enqueue',
      tail,
      { head, tail },
    );
    tail += 1;
    yield makeFrame(
      step++,
      'inspect',
      4,
      `Сдвигаем tail к ${tail}. В очереди сейчас элементы на полуинтервале индексов [${head}, ${tail}).`,
      createSnapshot('Очередь enqueue (массив)', storage),
      'enqueue',
      tail < storage.length ? tail : undefined,
      { head, tail },
    );
  }

  yield makeFrame(
    step,
    'complete',
    5,
    `Операция enqueue завершена: очередь содержит [${values.join(', ')}]. Удаление dequeue здесь не выполняется — оно вынесено в отдельный режим.`,
    createSnapshot('Очередь enqueue (массив)', storage),
    'enqueue',
    tail > head ? head : undefined,
    { head, tail },
  );
}

export function* queueArrayDequeueDemo({ values, capacity = 10 }: DemoInput): Generator<StructureAlgorithmFrame, void, unknown> {
  const storage = createArrayStorage(values, capacity);
  let head = 0;
  const tail = values.length;
  let step = 0;

  yield makeFrame(
    step++,
    'initial',
    1,
    `Операция dequeue изучается отдельно. Очередь уже заполнена значениями [${values.join(', ')}]. head = ${head} указывает на первый добавленный элемент, tail = ${tail} — на позицию после конца очереди.`,
    createSnapshot('Очередь dequeue (массив)', storage),
    'dequeue',
    head,
    { head, tail },
  );

  while (head < tail) {
    const taken = storage[head];
    yield makeFrame(
      step++,
      'dequeue',
      2,
      `Читаем a[${head}] = ${taken}. Это голова очереди и самый ранний из оставшихся элементов, поэтому он удаляется по правилу FIFO.`,
      createSnapshot('Очередь dequeue (массив)', storage),
      'dequeue',
      head,
      { head, tail },
    );
    storage[head] = null;
    head += 1;
    yield makeFrame(
      step++,
      'inspect',
      3,
      head < tail
        ? `Очищаем прежнюю голову и сдвигаем head к ${head}. Следующим будет извлечён a[${head}] = ${storage[head]}.`
        : `Очищаем последнюю голову и получаем head = tail = ${tail}. Очередь пуста.`,
      createSnapshot('Очередь dequeue (массив)', storage),
      'dequeue',
      head < tail ? head : undefined,
      { head, tail },
    );
  }

  yield makeFrame(step, 'complete', 4, 'Операция dequeue завершена: все элементы извлечены в том же порядке, в котором находились в очереди.', createSnapshot('Очередь dequeue (массив)', storage), 'dequeue', undefined, { head, tail });
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

export function* stackListDemo(input: DemoInput): Generator<StructureAlgorithmFrame, void, unknown> {
  yield* stackListPushDemo(input);
}

export function* stackListPushDemo({ values }: DemoInput): Generator<StructureAlgorithmFrame, void, unknown> {
  const list: (number | null)[] = [];
  let step = 0;

  yield makeFrame(step++, 'initial', 1, `Операция push изучается отдельно. Стек на связном списке начинается с пустой головы head. Новый узел всегда добавляется перед текущей головой и становится вершиной стека.`, createSnapshot('Стек push (список)', list), 'push', undefined, { head: -1, top: -1 });

  for (const value of values) {
    yield makeFrame(step++, 'inspect', 2, `Готовим push(${value}): создаём новый узел со значением ${value} и ссылкой на прежний head.`, createSnapshot('Стек push (список)', list), 'push', list.length > 0 ? 0 : undefined, { head: list.length > 0 ? 0 : -1, top: list.length > 0 ? 0 : -1 });
    list.unshift(value);
    yield makeFrame(step++, 'push', 3, `Новый узел со значением ${value} помещён в начало списка. head и вершина стека теперь указывают на этот узел.`, createSnapshot('Стек push (список)', list), 'push', 0, { head: 0, top: 0 });
  }

  yield makeFrame(step, 'complete', 4, `Операция push завершена: связный стек содержит ${list.length} узл. от вершины к основанию. Pop здесь не выполняется.`, createSnapshot('Стек push (список)', list), 'push', list.length > 0 ? 0 : undefined, { head: list.length > 0 ? 0 : -1, top: list.length > 0 ? 0 : -1 });
}

export function* stackListPopDemo({ values }: DemoInput): Generator<StructureAlgorithmFrame, void, unknown> {
  const list: (number | null)[] = [...values];
  let step = 0;

  yield makeFrame(step++, 'initial', 1, `Операция pop изучается отдельно. Связный стек уже заполнен: head указывает на первый узел со значением ${list[0]}. Именно этот узел является вершиной.`, createSnapshot('Стек pop (список)', list), 'pop', 0, { head: 0, top: 0 });

  while (list.length > 0) {
    const popped = list[0];
    yield makeFrame(step++, 'pop', 2, `Читаем head со значением ${popped}. Этот узел удаляется первым, потому что находится на вершине стека.`, createSnapshot('Стек pop (список)', list), 'pop', 0, { head: 0, top: 0 });
    list.shift();
    yield makeFrame(step++, 'inspect', 3, list.length > 0 ? `Переставляем head на следующий узел со значением ${list[0]}. Он становится новой вершиной стека.` : 'После удаления последнего узла head не указывает ни на один элемент: стек пуст.', createSnapshot('Стек pop (список)', list), 'pop', list.length > 0 ? 0 : undefined, { head: list.length > 0 ? 0 : -1, top: list.length > 0 ? 0 : -1 });
  }

  yield makeFrame(step, 'complete', 4, 'Операция pop завершена: все узлы удалены с головы списка.', createSnapshot('Стек pop (список)', list), 'pop', undefined, { head: -1, top: -1 });
}

export function* queueListDemo(input: DemoInput): Generator<StructureAlgorithmFrame, void, unknown> {
  yield* queueListEnqueueDemo(input);
}

export function* queueListEnqueueDemo({ values }: DemoInput): Generator<StructureAlgorithmFrame, void, unknown> {
  const list: (number | null)[] = [];
  let step = 0;

  yield makeFrame(step++, 'initial', 1, `Операция enqueue изучается отдельно. Связная очередь начинается пустой: head и tail не указывают на узлы. Новый узел будет добавляться после tail.`, createSnapshot('Очередь enqueue (список)', list), 'enqueue', undefined, { head: -1, tail: -1 });

  for (const value of values) {
    yield makeFrame(step++, 'inspect', 2, `Готовим enqueue(${value}): создаём новый узел и присоединяем его в конец очереди.`, createSnapshot('Очередь enqueue (список)', list), 'enqueue', list.length > 0 ? list.length - 1 : undefined, { head: list.length > 0 ? 0 : -1, tail: list.length > 0 ? list.length - 1 : -1 });
    list.push(value);
    yield makeFrame(step++, 'enqueue', 3, `Узел со значением ${value} добавлен после прежнего tail. head остаётся первым узлом, tail теперь указывает на индекс ${list.length - 1}.`, createSnapshot('Очередь enqueue (список)', list), 'enqueue', list.length - 1, { head: 0, tail: list.length - 1 });
  }

  yield makeFrame(step, 'complete', 4, `Операция enqueue завершена: очередь содержит [${list.join(', ')}] от head к tail. Dequeue здесь не выполняется.`, createSnapshot('Очередь enqueue (список)', list), 'enqueue', list.length > 0 ? list.length - 1 : undefined, { head: list.length > 0 ? 0 : -1, tail: list.length > 0 ? list.length - 1 : -1 });
}

export function* queueListDequeueDemo({ values }: DemoInput): Generator<StructureAlgorithmFrame, void, unknown> {
  const list: (number | null)[] = [...values];
  let step = 0;

  yield makeFrame(step++, 'initial', 1, `Операция dequeue изучается отдельно. Связная очередь уже заполнена: head указывает на ${list[0]}, tail — на ${list[list.length - 1]}. Удаление всегда идёт из head.`, createSnapshot('Очередь dequeue (список)', list), 'dequeue', 0, { head: 0, tail: list.length - 1 });

  while (list.length > 0) {
    const taken = list[0];
    yield makeFrame(step++, 'dequeue', 2, `Читаем head со значением ${taken}. Это самый ранний элемент очереди, поэтому он удаляется первым по правилу FIFO.`, createSnapshot('Очередь dequeue (список)', list), 'dequeue', 0, { head: 0, tail: list.length - 1 });
    list.shift();
    yield makeFrame(step++, 'inspect', 3, list.length > 0 ? `Переставляем head на следующий узел со значением ${list[0]}; tail остаётся на последнем узле со значением ${list[list.length - 1]}.` : 'После удаления последнего узла head и tail сброшены: очередь пуста.', createSnapshot('Очередь dequeue (список)', list), 'dequeue', list.length > 0 ? 0 : undefined, { head: list.length > 0 ? 0 : -1, tail: list.length > 0 ? list.length - 1 : -1 });
  }

  yield makeFrame(step, 'complete', 4, 'Операция dequeue завершена: все узлы извлечены из головы очереди в порядке FIFO.', createSnapshot('Очередь dequeue (список)', list), 'dequeue', undefined, { head: -1, tail: -1 });
}
