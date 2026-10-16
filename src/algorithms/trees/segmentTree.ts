import type { AlgorithmPhase } from '@/types';
import type { TreeDiagramNode, TreeTone } from '@/types/tree';
import { treeFrame, type TreeFrame } from './treeFrames';
import { countOf } from '@/lib/plural';

type SegmentGenerator = Generator<TreeFrame, void, unknown>;

interface SegNode {
  readonly id: string;
  readonly l: number;
  readonly r: number;
  sum: number | null;
  left: SegNode | null;
  right: SegNode | null;
  parent: SegNode | null;
}

export interface SegmentMeta {
  /** исходный массив под деревом */
  readonly array: readonly number[];
  /** подсветка ячеек массива */
  readonly arrayRange?: readonly [number, number];
  readonly arrayActive?: number;
}

const LABEL = 'Дерево отрезков';

const range = (node: SegNode): string => (node.l === node.r ? `[${node.l}]` : `[${node.l}…${node.r}]`);

/** Пустой каркас дерева: суммы заполняются при построении. */
const skeleton = (l: number, r: number, parent: SegNode | null = null): SegNode => {
  const node: SegNode = { id: `s${l}-${r}`, l, r, sum: null, left: null, right: null, parent };
  if (l < r) {
    const m = Math.floor((l + r) / 2);
    node.left = skeleton(l, m, node);
    node.right = skeleton(m + 1, r, node);
  }
  return node;
};

const fill = (node: SegNode, values: readonly number[]): number => {
  node.sum = node.left === null || node.right === null ? values[node.l]! : fill(node.left, values) + fill(node.right, values);
  return node.sum;
};

const snapshot = (root: SegNode, toneOf: (node: SegNode) => TreeTone | undefined): TreeDiagramNode[] => {
  const nodes: TreeDiagramNode[] = [];
  const visit = (node: SegNode | null, parentKey: string | null, side: 0 | 1): void => {
    if (node === null) return;
    nodes.push({
      key: node.id,
      label: node.sum === null ? '?' : String(node.sum),
      parentKey,
      side,
      tone: toneOf(node) ?? (node.sum === null ? 'muted' : 'idle'),
      sublabel: range(node),
    });
    visit(node.left, node.id, 0);
    visit(node.right, node.id, 1);
  };
  visit(root, null, 0);
  return nodes;
};

const makeFrame =
  (root: SegNode, values: () => readonly number[], counter: { step: number }) =>
  (
    phase: AlgorithmPhase,
    line: number,
    message: string,
    toneOf: (node: SegNode) => TreeTone | undefined,
    meta: Partial<SegmentMeta> & Record<string, unknown> = {},
  ): TreeFrame =>
    treeFrame(counter.step++, phase, LABEL, snapshot(root, toneOf), line, message, { array: [...values()], ...meta });

/** Построение снизу вверх: листья — элементы массива, родитель — сумма детей. */
export function* segmentBuildScenario(values: readonly number[]): SegmentGenerator {
  const root = skeleton(0, values.length - 1);
  const counter = { step: 0 };
  const frame = makeFrame(root, () => values, counter);
  const done = new Set<SegNode>();

  yield frame(
    'initial',
    1,
    `Массив из ${countOf(values.length, 'элемента', 'элементов', 'элементов')}. Каждый узел дерева отвечает за отрезок массива (подписан под узлом) и хранит сумму на нём. Корень — весь массив [0…${values.length - 1}].`,
    () => undefined,
  );

  function* build(node: SegNode): SegmentGenerator {
    if (node.left === null || node.right === null) {
      node.sum = values[node.l]!;
      done.add(node);
      yield frame(
        'push',
        1,
        `Лист ${range(node)}: отрезок из одного элемента, сумма — сам элемент A[${node.l}] = ${node.sum}.`,
        (item) => (item === node ? 'active' : done.has(item) ? 'done' : undefined),
        {
          arrayActive: node.l,
        },
      );
      return;
    }
    yield* build(node.left);
    yield* build(node.right);
    node.sum = node.left.sum! + node.right.sum!;
    done.add(node);
    yield frame(
      'merge',
      3,
      `Узел ${range(node)}: ${node.left.sum} + ${node.right.sum} = ${node.sum}.`,
      (item) => (item === node ? 'active' : item === node.left || item === node.right ? 'path' : done.has(item) ? 'done' : undefined),
      { arrayRange: [node.l, node.r] },
    );
  }
  yield* build(root);

  const count = done.size;
  yield frame(
    'complete',
    4,
    `Дерево построено: ${countOf(count, 'узел', 'узла', 'узлов')} (всегда 2n − 1), уровней — ${Math.ceil(Math.log2(values.length)) + 1}. Каждый узел посчитан один раз, поэтому построение заняло O(n).`,
    () => undefined,
  );
}

/** Сумма на отрезке [ql, qr]: узлы целиком внутри берутся готовыми, остальные делятся пополам. */
export function* segmentQueryScenario(values: readonly number[], ql: number, qr: number): SegmentGenerator {
  const root = skeleton(0, values.length - 1);
  fill(root, values);
  const counter = { step: 0 };
  const frame = makeFrame(root, () => values, counter);
  const lo = Math.max(0, Math.min(ql, qr));
  const hi = Math.min(values.length - 1, Math.max(ql, qr));
  const taken = new Set<SegNode>();
  const skipped = new Set<SegNode>();
  const visited = new Set<SegNode>();
  const tone =
    (current: SegNode | null) =>
    (item: SegNode): TreeTone | undefined =>
      item === current ? 'active' : taken.has(item) ? 'done' : skipped.has(item) ? 'muted' : visited.has(item) ? 'path' : undefined;
  const parts: number[] = [];

  yield frame(
    'initial',
    1,
    `Найдём сумму A[${lo}] + … + A[${hi}]. Спускаемся от корня и разбиваем запрос на отрезки, суммы которых уже посчитаны.`,
    tone(null),
    {
      arrayRange: [lo, hi],
    },
  );

  function* query(node: SegNode): SegmentGenerator {
    visited.add(node);
    if (node.r < lo || node.l > hi) {
      skipped.add(node);
      yield frame('discard', 2, `${range(node)} не пересекается с [${lo}…${hi}] — этот узел не нужен, вклад 0.`, tone(node), { arrayRange: [lo, hi] });
      return;
    }
    if (lo <= node.l && node.r <= hi) {
      taken.add(node);
      parts.push(node.sum!);
      yield frame(
        'visit',
        3,
        `${range(node)} целиком внутри запроса — берём готовую сумму ${node.sum}, не спускаясь глубже. Сумма пока: ${parts.join(' + ')} = ${parts.reduce((a, b) => a + b, 0)}.`,
        tone(node),
        {
          arrayRange: [lo, hi],
          output: parts.map(String),
          outputLabel: 'Взятые узлы',
        },
      );
      return;
    }
    yield frame('inspect', 4, `${range(node)} пересекается с запросом лишь частично — спрашиваем обоих детей.`, tone(node), {
      arrayRange: [lo, hi],
      output: parts.map(String),
      outputLabel: 'Взятые узлы',
    });
    yield* query(node.left!);
    yield* query(node.right!);
  }
  yield* query(root);

  const total = parts.reduce((a, b) => a + b, 0);
  yield frame(
    'complete',
    5,
    `Сумма на [${lo}…${hi}] = ${parts.join(' + ')} = ${total}. Посещено ${visited.size} из ${countOf(countNodes(root), 'узла', 'узлов', 'узлов')}; простой перебор сложил бы ${countOf(hi - lo + 1, 'число', 'числа', 'чисел')}. На любом уровне дерева в ответ входят не больше двух узлов — отсюда O(log n).`,
    tone(null),
    { arrayRange: [lo, hi], output: parts.map(String), outputLabel: 'Взятые узлы', found: true },
  );
}

/** Точечное обновление A[i] ← x: меняется один лист и суммы на пути к корню. */
export function* segmentUpdateScenario(input: readonly number[], index: number, x: number): SegmentGenerator {
  const values = [...input];
  const root = skeleton(0, values.length - 1);
  fill(root, values);
  const counter = { step: 0 };
  const frame = makeFrame(root, () => values, counter);
  const i = Math.max(0, Math.min(values.length - 1, index));
  const path = new Set<SegNode>();
  const tone =
    (current: SegNode | null) =>
    (item: SegNode): TreeTone | undefined =>
      item === current ? 'active' : path.has(item) ? 'path' : undefined;

  yield frame('initial', 1, `Запишем A[${i}] ← ${x} (было ${values[i]}). Изменятся только узлы, отрезки которых содержат позицию ${i}.`, tone(null), {
    arrayActive: i,
  });

  let node = root;
  while (node.left !== null && node.right !== null) {
    path.add(node);
    const next: SegNode = i <= node.left.r ? node.left : node.right;
    yield frame(
      'visit',
      1,
      `${range(node)}: позиция ${i} в ${next === node.left ? 'левой' : 'правой'} половине ${range(next)} — спускаемся туда.`,
      tone(node),
      { arrayActive: i },
    );
    node = next;
  }

  path.add(node);
  values[i] = x;
  node.sum = x;
  yield frame('swap', 2, `Лист [${i}]: записываем новое значение ${x}.`, (item) => (item === node ? 'new' : path.has(item) ? 'path' : undefined), {
    arrayActive: i,
  });

  let current = node.parent;
  const updated = new Set<SegNode>([node]);
  while (current !== null) {
    const before = current.sum;
    current.sum = current.left!.sum! + current.right!.sum!;
    updated.add(current);
    const target = current;
    yield frame(
      'merge',
      3,
      `${range(target)}: пересчитываем ${target.left!.sum} + ${target.right!.sum} = ${target.sum}${before === target.sum ? '' : ` (было ${before})`}.`,
      (item) => (item === target ? 'active' : updated.has(item) ? 'new' : undefined),
      { arrayActive: i },
    );
    current = current.parent;
  }

  yield frame(
    'complete',
    4,
    `Обновлено узлов: ${updated.size} — по одному на уровне, не больше ⌈log₂ n⌉ + 1 = ${Math.ceil(Math.log2(values.length)) + 1}. Остальные суммы остались верными без пересчёта: O(log n).`,
    (item) => (updated.has(item) ? 'new' : undefined),
  );
}

const countNodes = (node: SegNode | null): number => (node === null ? 0 : 1 + countNodes(node.left) + countNodes(node.right));
