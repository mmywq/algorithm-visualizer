import type { AlgorithmPhase } from '@/types';
import type { TreeDiagramNode } from '@/types/tree';
import { createNode, inorderValues, snapshotTree, treeFrame, treeHeight, type MutableNode, type TreeFrame } from './treeFrames';

type Generator_ = Generator<TreeFrame, void, unknown>;

const LABEL = 'Красно-чёрное дерево';

const isRed = (node: MutableNode | null): boolean => node !== null && node.color === 'red';

/** Число чёрных узлов на любом пути от узла вниз до пустого листа; -1 — если свойство нарушено. */
export const blackHeight = (node: MutableNode | null): number => {
  if (node === null) return 1;
  const left = blackHeight(node.left);
  const right = blackHeight(node.right);
  if (left === -1 || right === -1 || left !== right) return -1;
  return left + (node.color === 'black' ? 1 : 0);
};

/** Нет ли красного узла с красным ребёнком. */
export const noRedRed = (node: MutableNode | null): boolean =>
  node === null || (!(isRed(node) && (isRed(node.left) || isRed(node.right))) && noRedRed(node.left) && noRedRed(node.right));

/** Пошаговая вставка в красно-чёрное дерево (по Кормену): перекраска и повороты. */
export function* redBlackInsertScenario(values: readonly number[]): Generator_ {
  let root: MutableNode | null = null;
  let step = 0;

  const rotateLeft = (x: MutableNode): void => {
    const y = x.right!;
    x.right = y.left;
    if (y.left !== null) y.left.parent = x;
    y.parent = x.parent;
    if (x.parent === null) root = y;
    else if (x === x.parent.left) x.parent.left = y;
    else x.parent.right = y;
    y.left = x;
    x.parent = y;
  };

  const rotateRight = (x: MutableNode): void => {
    const y = x.left!;
    x.left = y.right;
    if (y.right !== null) y.right.parent = x;
    y.parent = x.parent;
    if (x.parent === null) root = y;
    else if (x === x.parent.right) x.parent.right = y;
    else x.parent.left = y;
    y.right = x;
    x.parent = y;
  };

  /** снимок с подписями: x — кольцо, P/U/G — родственники текущего узла */
  const snap = (focus: MutableNode | null, marks: ReadonlyMap<MutableNode, string> = new Map()): TreeDiagramNode[] =>
    snapshotTree(root, undefined, (node) => ({
      ...(node === focus ? { ring: 'brand' as const } : {}),
      ...(marks.has(node) ? { badge: marks.get(node)! } : {}),
    }));

  const frame = (
    phase: AlgorithmPhase,
    line: number,
    message: string,
    focus: MutableNode | null,
    marks?: ReadonlyMap<MutableNode, string>,
    inserted?: readonly number[],
  ) =>
    treeFrame(step++, phase, LABEL, snap(focus, marks), line, message, {
      output: (inserted ?? []).map(String),
      outputLabel: 'Вставлены',
    });

  const relatives = (z: MutableNode): Map<MutableNode, string> => {
    const marks = new Map<MutableNode, string>();
    const parent = z.parent;
    const grand = parent?.parent ?? null;
    if (parent !== null) marks.set(parent, 'P');
    if (grand !== null) {
      marks.set(grand, 'G');
      const uncle = parent === grand.left ? grand.right : grand.left;
      if (uncle !== null) marks.set(uncle, 'U');
    }
    return marks;
  };

  yield treeFrame(
    step++,
    'initial',
    LABEL,
    [],
    1,
    `Вставим ключи [${values.join(', ')}] по одному. Новый узел всегда красный; если рядом окажутся два красных узла, дерево чинится перекраской и поворотами.`,
  );

  const inserted: number[] = [];
  for (const value of values) {
    // обычная вставка в дерево поиска
    let parent: MutableNode | null = null;
    let current: MutableNode | null = root;
    const path: number[] = [];
    while (current !== null) {
      parent = current;
      path.push(current.value);
      current = value < current.value ? current.left : current.right;
    }
    const z = createNode(value, parent);
    z.color = 'red';
    if (parent === null) root = z;
    else if (value < parent.value) parent.left = z;
    else parent.right = z;
    inserted.push(value);

    yield frame(
      'push',
      1,
      path.length === 0
        ? `Вставляем ${value} — дерево было пустым, узел становится корнем. Пока он красный.`
        : `Вставляем ${value} как в обычное дерево поиска (путь: ${path.join(' → ')}) и красим в красный: так не меняется число чёрных узлов на путях.`,
      z,
      undefined,
      inserted,
    );

    let x = z;
    let rotated = false;
    while (isRed(x.parent)) {
      const p = x.parent!;
      const g = p.parent!;
      const parentIsLeft = p === g.left;
      const uncle = parentIsLeft ? g.right : g.left;

      if (isRed(uncle)) {
        yield frame(
          'inspect',
          3,
          `Конфликт: ${x.value} и его родитель ${p.value} — оба красные. Дядя ${uncle!.value} тоже красный — значит, хватит перекраски.`,
          x,
          relatives(x),
          inserted,
        );
        p.color = 'black';
        uncle!.color = 'black';
        g.color = 'red';
        yield frame(
          'swap',
          3,
          `Перекраска: родитель ${p.value} и дядя ${uncle!.value} — чёрные, дед ${g.value} — красный. Чёрная высота путей не изменилась, но теперь конфликт мог подняться к деду.`,
          g,
          new Map([[g, 'G']]),
          inserted,
        );
        x = g;
        continue;
      }

      const inner = parentIsLeft ? x === p.right : x === p.left;
      if (inner) {
        yield frame(
          'inspect',
          4,
          `Конфликт ${x.value}–${p.value}, а дядя ${uncle === null ? 'пуст (считается чёрным)' : `${uncle.value} чёрный`}. ${x.value} — «внутренний» внук: сначала выпрямим излом поворотом вокруг родителя.`,
          x,
          relatives(x),
          inserted,
        );
        if (parentIsLeft) rotateLeft(p);
        else rotateRight(p);
        yield frame(
          'swap',
          4,
          `Поворот ${parentIsLeft ? 'влево' : 'вправо'} вокруг ${p.value}: теперь ${x.value} и ${p.value} стоят на одной линии с дедом. Продолжаем с узла ${p.value}.`,
          p,
          relatives(p),
          inserted,
        );
        x = p;
      }

      const parent2 = x.parent!;
      const grand2 = parent2.parent!;
      yield frame(
        'inspect',
        5,
        `${x.value} — «внешний» внук: красный родитель ${parent2.value} и дед ${grand2.value} на одной линии. Перекрасим их и повернём дерево вокруг деда.`,
        x,
        relatives(x),
        inserted,
      );
      parent2.color = 'black';
      grand2.color = 'red';
      if (parentIsLeft) rotateRight(grand2);
      else rotateLeft(grand2);
      yield frame(
        'swap',
        5,
        `Поворот ${parentIsLeft ? 'вправо' : 'влево'} вокруг ${grand2.value}: чёрный ${parent2.value} поднялся на место деда, красные ${x.value} и ${grand2.value} — его дети. Конфликт устранён.`,
        parent2,
        new Map([[parent2, 'P']]),
        inserted,
      );
      rotated = true;
      break;
    }

    if (root !== null && isRed(root)) {
      root.color = 'black';
      yield frame(
        'swap',
        6,
        `Корень ${root.value} красим в чёрный — это всегда безопасно: чёрная высота растёт сразу на всех путях.`,
        root,
        undefined,
        inserted,
      );
    } else if (!rotated && x.parent !== null) {
      yield frame(
        'visit',
        2,
        x === z
          ? `Родитель ${x.parent.value} чёрный — два красных подряд не встретились, свойства не нарушены.`
          : `У ${x.value} чёрный родитель ${x.parent.value} — конфликт выше не поднялся, дерево в порядке.`,
        x,
        undefined,
        inserted,
      );
    }
  }

  const r: MutableNode | null = root;
  yield treeFrame(
    step,
    'complete',
    LABEL,
    snapshotTree(r),
    6,
    `Готово: ${values.length} ключей, высота ${treeHeight(r)}, чёрная высота ${Math.max(0, blackHeight(r) - 1)}. Симметричный обход: ${inorderValues(r).join(', ')}. Высота красно-чёрного дерева не превышает 2·log₂(n + 1).`,
    { output: inserted.map(String), outputLabel: 'Вставлены' },
  );
}

/** Построение без анимации — для проверок. */
export const buildRedBlack = (values: readonly number[]): MutableNode | null => {
  let last: TreeFrame | undefined;
  for (const frame of redBlackInsertScenario(values)) last = frame;
  return last === undefined ? null : rebuild(last.meta.nodes);
};

const rebuild = (nodes: readonly TreeDiagramNode[]): MutableNode | null => {
  const byKey = new Map<string, MutableNode>();
  let root: MutableNode | null = null;
  for (const item of nodes) {
    const node: MutableNode = { id: item.key, value: Number(item.label), left: null, right: null, parent: null, color: item.tone === 'red' ? 'red' : 'black' };
    byKey.set(item.key, node);
    if (item.parentKey === null) root = node;
    else {
      const parent = byKey.get(item.parentKey)!;
      node.parent = parent;
      if (item.side === 0) parent.left = node;
      else parent.right = node;
    }
  }
  return root;
};
