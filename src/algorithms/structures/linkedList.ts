import type { AlgorithmPhase, LinkedListFrame, LinkedListMeta, ListNode } from '@/types';

type ListGenerator = Generator<LinkedListFrame, void, unknown>;

interface MutableNode {
  id: string;
  value: number;
  next: string | null;
}

/** Рабочее состояние: узлы в порядке раскладки + голова. Ссылки next меняются независимо от раскладки. */
class ListState {
  readonly nodes: MutableNode[];
  head: string | null;
  private counter = 0;

  constructor(values: readonly number[]) {
    this.nodes = values.map((value) => ({ id: this.nextId(), value, next: null }));
    this.nodes.forEach((node, index) => (node.next = this.nodes[index + 1]?.id ?? null));
    this.head = this.nodes[0]?.id ?? null;
  }

  nextId(): string {
    this.counter += 1;
    return `n${this.counter}`;
  }

  get(id: string | null): MutableNode | undefined {
    return id === null ? undefined : this.nodes.find((node) => node.id === id);
  }

  snapshot(): { nodes: ListNode[]; head: string | null } {
    return { nodes: this.nodes.map((node) => ({ ...node })), head: this.head };
  }

  /** значения в порядке обхода по ссылкам от head */
  chain(): number[] {
    const result: number[] = [];
    const seen = new Set<string>();
    let current = this.get(this.head);
    while (current !== undefined && !seen.has(current.id)) {
      seen.add(current.id);
      result.push(current.value);
      current = this.get(current.next);
    }
    return result;
  }
}

const makeFrame = (list: ListState, step: number, phase: AlgorithmPhase, line: number, message: string, meta: LinkedListMeta = {}): LinkedListFrame => ({
  step,
  domain: 'list',
  phase,
  status: phase === 'complete' ? 'completed' : 'running',
  data: list.snapshot(),
  activeIds: [meta.activeId, meta.foundId, meta.newId].filter((id): id is string => id !== undefined),
  pseudocode: { line },
  message,
  description: message,
  meta,
});

const word = (count: number, one: string, few: string, many: string): string => {
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  const mod10 = count % 10;
  return mod10 === 1 ? one : mod10 >= 2 && mod10 <= 4 ? few : many;
};

const chainText = (list: ListState): string => {
  const values = list.chain();
  return values.length === 0 ? 'пустой список' : `${values.join(' → ')} → ∅`;
};

/** Вставка в начало: O(1), достаточно переставить head. */
export function* pushFront(values: readonly number[], x: number): ListGenerator {
  const list = new ListState(values);
  let step = 0;
  const frame = (phase: AlgorithmPhase, line: number, message: string, meta?: LinkedListMeta) => makeFrame(list, step++, phase, line, message, meta);

  yield frame('initial', 1, `Список: ${chainText(list)}. Вставим ${x} в начало — для этого не нужно проходить по списку.`);

  const node: MutableNode = { id: list.nextId(), value: x, next: null };
  list.nodes.unshift(node);
  yield frame('push', 1, `Создаём новый узел со значением ${x}. Пока он ни с чем не связан.`, { newId: node.id, pointers: { node: node.id } });

  node.next = list.head;
  yield frame('visit', 2, `node.next ← head: новый узел указывает на прежнее начало списка${list.head === null ? ' — список был пуст, поэтому ∅' : ''}.`, {
    newId: node.id,
    changedLink: node.id,
    pointers: { node: node.id },
  });

  list.head = node.id;
  yield frame('complete', 3, `head ← node: теперь список начинается с ${x}. Получилось: ${chainText(list)}. Всего три действия — O(1) при любой длине.`, {
    newId: node.id,
  });
}

/** Вставка в конец без указателя tail: приходится дойти до последнего узла, O(n). */
export function* pushBack(values: readonly number[], x: number): ListGenerator {
  const list = new ListState(values);
  let step = 0;
  const frame = (phase: AlgorithmPhase, line: number, message: string, meta?: LinkedListMeta) => makeFrame(list, step++, phase, line, message, meta);

  yield frame('initial', 1, `Список: ${chainText(list)}. Вставим ${x} в конец. Указателя на последний узел нет — его придётся найти.`);

  const node: MutableNode = { id: list.nextId(), value: x, next: null };
  list.nodes.push(node);
  yield frame('push', 1, `Создаём узел ${x}; его next = ∅, ведь он станет последним.`, { newId: node.id, pointers: { node: node.id } });

  if (list.head === null) {
    list.head = node.id;
    yield frame('complete', 2, `Список был пуст, поэтому новый узел сразу становится головой: ${chainText(list)}.`, { newId: node.id });
    return;
  }

  let curr = list.get(list.head)!;
  let hops = 0;
  yield frame('visit', 3, `curr ← head: начинаем с узла ${curr.value}.`, { activeId: curr.id, newId: node.id, pointers: { curr: curr.id } });

  while (curr.next !== null) {
    curr = list.get(curr.next)!;
    hops += 1;
    yield frame('visit', 4, `У текущего узла есть следующий — переходим: curr ← curr.next = ${curr.value}.`, {
      activeId: curr.id,
      newId: node.id,
      pointers: { curr: curr.id },
    });
  }

  curr.next = node.id;
  yield frame('visit', 5, `curr.next = ∅ — это последний узел. Прицепляем к нему новый: curr.next ← node.`, {
    activeId: curr.id,
    newId: node.id,
    changedLink: curr.id,
    pointers: { curr: curr.id },
  });

  yield frame(
    'complete',
    5,
    `Готово: ${chainText(list)}. Чтобы добраться до конца, пришлось пройти ${hops + 1} ${word(hops + 1, 'узел', 'узла', 'узлов')} — O(n). С указателем tail было бы O(1).`,
    { newId: node.id },
  );
}

/** Удаление первого узла с заданным ключом. */
export function* deleteKey(values: readonly number[], x: number): ListGenerator {
  const list = new ListState(values);
  let step = 0;
  const frame = (phase: AlgorithmPhase, line: number, message: string, meta?: LinkedListMeta) => makeFrame(list, step++, phase, line, message, meta);

  yield frame('initial', 1, `Список: ${chainText(list)}. Удалим первый узел со значением ${x}.`);

  const head = list.get(list.head);
  if (head === undefined) {
    yield frame('complete', 4, 'Список пуст — удалять нечего.', { outcome: 'miss' });
    return;
  }

  yield frame('compare', 1, `Сначала проверяем голову: ${head.value} ${head.value === x ? '=' : '≠'} ${x}.`, {
    activeId: head.id,
    pointers: { curr: head.id },
  });
  if (head.value === x) {
    yield frame('pop', 1, `Удаляется сам head. Достаточно сдвинуть голову: head ← head.next.`, { removedId: head.id, pointers: { curr: head.id } });
    list.head = head.next;
    yield frame('pop', 1, `Узел ${x} больше не достижим от head.`, { removedId: head.id, changedLink: head.id });
    list.nodes.splice(list.nodes.indexOf(head), 1);
    yield frame('complete', 6, `Узел освобождён. Список: ${chainText(list)}. Удаление из начала — O(1).`);
    return;
  }

  let prev = head;
  let curr = list.get(head.next);
  yield frame('visit', 2, `prev ← head, curr ← head.next. Узел перед удаляемым понадобится, чтобы переставить его ссылку.`, {
    ...(curr === undefined ? {} : { activeId: curr.id }),
    pointers: { prev: prev.id, curr: curr?.id ?? null },
  });

  while (curr !== undefined) {
    const equal = curr.value === x;
    yield frame('compare', 3, `Сравниваем curr = ${curr.value} с ключом: ${equal ? 'совпадает' : `${curr.value} ≠ ${x}`}.`, {
      activeId: curr.id,
      ...(equal ? { foundId: curr.id } : {}),
      pointers: { prev: prev.id, curr: curr.id },
    });
    if (equal) break;
    prev = curr;
    curr = list.get(curr.next);
    yield frame('visit', 3, curr === undefined ? 'Шагаем дальше: curr ← curr.next = ∅.' : `Шагаем дальше: prev ← curr, curr ← ${curr.value}.`, {
      ...(curr === undefined ? {} : { activeId: curr.id }),
      pointers: { prev: prev.id, curr: curr?.id ?? null },
    });
  }

  if (curr === undefined) {
    yield frame('complete', 4, `curr = ∅ — список закончился, узла со значением ${x} в нём нет. Список не изменился.`, { outcome: 'miss' });
    return;
  }

  const target = curr;
  prev.next = target.next;
  yield frame('pop', 5, `prev.next ← curr.next: узел ${prev.value} теперь ссылается в обход ${x}${target.next === null ? ', то есть на ∅' : ''}.`, {
    removedId: target.id,
    changedLink: prev.id,
    pointers: { prev: prev.id, curr: target.id },
  });

  list.nodes.splice(list.nodes.indexOf(target), 1);
  yield frame('complete', 6, `Узел ${x} выпал из цепочки и освобождён. Список: ${chainText(list)}. Сама перестановка ссылки — O(1), поиск узла — O(n).`, {
    pointers: { prev: prev.id },
  });
}

/** Разворот на месте тремя указателями: prev, curr, next. */
export function* reverseList(values: readonly number[]): ListGenerator {
  const list = new ListState(values);
  let step = 0;
  const frame = (phase: AlgorithmPhase, line: number, message: string, meta?: LinkedListMeta) => makeFrame(list, step++, phase, line, message, meta);

  yield frame('initial', 1, `Список: ${chainText(list)}. Развернём его, не создавая новых узлов, — только перенаправим ссылки.`);

  let prev: MutableNode | undefined;
  let curr = list.get(list.head);
  yield frame('visit', 1, 'prev ← ∅, curr ← head. Слева от curr будет растущий развёрнутый кусок, справа — ещё не тронутый.', {
    ...(curr === undefined ? {} : { activeId: curr.id }),
    pointers: { prev: null, curr: curr?.id ?? null },
  });

  while (curr !== undefined) {
    const next = list.get(curr.next);
    yield frame(
      'inspect',
      3,
      `next ← curr.next${next === undefined ? ' = ∅' : ` = ${next.value}`}: запоминаем, куда идти дальше, — иначе после разворота стрелки хвост потеряется.`,
      {
        activeId: curr.id,
        pointers: { prev: prev?.id ?? null, curr: curr.id, next: next?.id ?? null },
      },
    );

    curr.next = prev?.id ?? null;
    yield frame(
      'swap',
      4,
      `curr.next ← prev: стрелка узла ${curr.value} развернулась ${prev === undefined ? 'в ∅ — он станет последним' : `назад, к ${prev.value}`}.`,
      {
        activeId: curr.id,
        changedLink: curr.id,
        pointers: { prev: prev?.id ?? null, curr: curr.id, next: next?.id ?? null },
      },
    );

    prev = curr;
    curr = next;
    yield frame(
      'visit',
      5,
      curr === undefined ? 'prev ← curr, curr ← next = ∅. Узлы закончились.' : `prev ← curr, curr ← next: сдвигаемся к узлу ${curr.value}.`,
      {
        ...(curr === undefined ? {} : { activeId: curr.id }),
        pointers: { prev: prev.id, curr: curr?.id ?? null },
      },
    );
  }

  list.head = prev?.id ?? null;
  yield frame('complete', 6, `head ← prev. Список развёрнут: ${chainText(list)}. Каждый узел посещён один раз — O(n) времени и O(1) памяти.`, {});
}
