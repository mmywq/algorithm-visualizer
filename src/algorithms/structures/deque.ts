import type { AlgorithmFrame, AlgorithmPhase } from '@/types';

export type DequeOp =
  | { readonly kind: 'push-front'; readonly value: number }
  | { readonly kind: 'push-back'; readonly value: number }
  | { readonly kind: 'pop-front' }
  | { readonly kind: 'pop-back' };

export interface DequeSnapshot {
  readonly cells: readonly (number | null)[];
  readonly front: number;
  readonly size: number;
}

export interface DequeMeta extends Record<string, unknown> {
  readonly activeIndex?: number;
  readonly written?: boolean;
  readonly cleared?: boolean;
  /** номер текущей операции сценария */
  readonly opIndex?: number;
  /** извлечённые значения по порядку */
  readonly output: readonly number[];
  readonly rejected?: 'full' | 'empty';
}

export type DequeFrame = AlgorithmFrame<DequeSnapshot, DequeMeta>;

export const DEQUE_CAPACITY = 8;

export const opLabel = (op: DequeOp): string => {
  switch (op.kind) {
    case 'push-front':
      return `push_front(${op.value})`;
    case 'push-back':
      return `push_back(${op.value})`;
    case 'pop-front':
      return 'pop_front()';
    case 'pop-back':
      return 'pop_back()';
  }
};

/** Сценарий в адресной строке: f5 — в начало, b5 — в конец, pf / pb — извлечь. */
export const encodeOps = (ops: readonly DequeOp[]): string =>
  ops.map((op) => (op.kind === 'push-front' ? `f${op.value}` : op.kind === 'push-back' ? `b${op.value}` : op.kind === 'pop-front' ? 'pf' : 'pb')).join(',');

export const decodeOps = (raw: string): DequeOp[] | null => {
  const ops: DequeOp[] = [];
  for (const token of raw.split(',').filter((item) => item.length > 0)) {
    if (token === 'pf') ops.push({ kind: 'pop-front' });
    else if (token === 'pb') ops.push({ kind: 'pop-back' });
    else {
      const match = /^([fb])(-?\d{1,2})$/.exec(token);
      if (match === null) return null;
      const value = Number(match[2]);
      ops.push(match[1] === 'f' ? { kind: 'push-front', value } : { kind: 'push-back', value });
    }
  }
  return ops.length === 0 ? null : ops.slice(0, 24);
};

/** Дек на кольцевом буфере фиксированной ёмкости: все операции — O(1), индексы берутся по модулю. */
export function* dequeScript(ops: readonly DequeOp[], capacity = DEQUE_CAPACITY): Generator<DequeFrame, void, unknown> {
  const cells: (number | null)[] = Array.from({ length: capacity }, () => null);
  let front = 0;
  let size = 0;
  let step = 0;
  const output: number[] = [];

  const frame = (phase: AlgorithmPhase, line: number, message: string, meta: Omit<DequeMeta, 'output'> = {}): DequeFrame => ({
    step: step++,
    domain: 'array',
    phase,
    status: phase === 'complete' ? 'completed' : 'running',
    data: { cells: [...cells], front, size },
    activeIds: meta.activeIndex === undefined ? [] : [`cell-${meta.activeIndex}`],
    pseudocode: { line },
    message,
    description: message,
    meta: { ...meta, output: [...output] },
  });

  const order = (): string => {
    if (size === 0) return 'дек пуст';
    const values: number[] = [];
    for (let k = 0; k < size; k += 1) values.push(cells[(front + k) % capacity]!);
    return `[${values.join(' ⇄ ')}]`;
  };

  yield frame(
    'initial',
    1,
    `Буфер из ${capacity} ячеек, front = 0, size = 0. Ячейки замкнуты в кольцо: за последней сразу идёт первая, поэтому дек может расти в обе стороны без сдвигов.`,
  );

  for (let opIndex = 0; opIndex < ops.length; opIndex += 1) {
    const op = ops[opIndex]!;
    const name = opLabel(op);

    if ((op.kind === 'push-front' || op.kind === 'push-back') && size === capacity) {
      yield frame(
        'inspect',
        6,
        `${name}: size = ${capacity} — все ячейки заняты, дек полон. Операция отклонена; в реальной реализации буфер пришлось бы увеличить и переложить элементы.`,
        {
          opIndex,
          rejected: 'full',
        },
      );
      continue;
    }
    if ((op.kind === 'pop-front' || op.kind === 'pop-back') && size === 0) {
      yield frame('inspect', 6, `${name}: size = 0 — дек пуст, извлекать нечего. Операция отклонена.`, { opIndex, rejected: 'empty' });
      continue;
    }

    switch (op.kind) {
      case 'push-back': {
        const index = (front + size) % capacity;
        const wrapped = front + size >= capacity;
        yield frame(
          'inspect',
          2,
          `${name}: свободная ячейка за последним элементом — (front + size) mod ${capacity} = (${front} + ${size}) mod ${capacity} = ${index}${wrapped ? '. Индекс перешёл через конец массива — кольцо в действии' : ''}.`,
          {
            opIndex,
            activeIndex: index,
          },
        );
        cells[index] = op.value;
        size += 1;
        yield frame('push', 2, `Записываем ${op.value} в A[${index}], size = ${size}. Дек: ${order()}.`, { opIndex, activeIndex: index, written: true });
        break;
      }
      case 'push-front': {
        const index = (front - 1 + capacity) % capacity;
        yield frame(
          'inspect',
          3,
          `${name}: front сдвигается на шаг назад — (${front} − 1 + ${capacity}) mod ${capacity} = ${index}${front === 0 ? '. Слева от нуля ячеек нет, поэтому front «перепрыгивает» в конец массива' : ''}.`,
          { opIndex, activeIndex: index },
        );
        front = index;
        cells[index] = op.value;
        size += 1;
        yield frame('push', 3, `Записываем ${op.value} в A[${index}] — это новый первый элемент, size = ${size}. Дек: ${order()}.`, {
          opIndex,
          activeIndex: index,
          written: true,
        });
        break;
      }
      case 'pop-front': {
        const index = front;
        const value = cells[index]!;
        yield frame('inspect', 4, `${name}: первый элемент лежит в A[front] = A[${index}] — это ${value}.`, { opIndex, activeIndex: index });
        cells[index] = null;
        front = (front + 1) % capacity;
        size -= 1;
        output.push(value);
        yield frame('pop', 4, `Извлекаем ${value}; front ← (${index} + 1) mod ${capacity} = ${front}, size = ${size}. Дек: ${order()}.`, {
          opIndex,
          activeIndex: index,
          cleared: true,
        });
        break;
      }
      case 'pop-back': {
        const index = (front + size - 1) % capacity;
        const value = cells[index]!;
        yield frame('inspect', 5, `${name}: последний элемент — A[(front + size − 1) mod ${capacity}] = A[${index}] = ${value}.`, {
          opIndex,
          activeIndex: index,
        });
        cells[index] = null;
        size -= 1;
        output.push(value);
        yield frame('pop', 5, `Извлекаем ${value}, size = ${size}. front не меняется. Дек: ${order()}.`, { opIndex, activeIndex: index, cleared: true });
        break;
      }
    }
  }

  yield frame(
    'complete',
    1,
    `Сценарий выполнен. Дек: ${order()}${output.length > 0 ? `, извлечены по порядку: ${output.join(', ')}` : ''}. Ни одна операция не сдвигала элементы — каждая заняла O(1).`,
  );
}
