import type { StructureAlgorithmFrame, StructureSnapshot } from '@/types';

interface AvlNode {
  readonly value: number;
  readonly height: number;
  readonly left: AvlNode | null;
  readonly right: AvlNode | null;
}

interface AvlEvent {
  readonly message: string;
  readonly line: number;
  readonly activeValue?: number;
}

const MAX_CELLS = 31;

const height = (node: AvlNode | null): number => node?.height ?? 0;
const balanceFactor = (node: AvlNode | null): number => node === null ? 0 : height(node.left) - height(node.right);
const withHeight = (node: Omit<AvlNode, 'height'>): AvlNode => ({ ...node, height: 1 + Math.max(height(node.left), height(node.right)) });

const rotateRight = (root: AvlNode): AvlNode => {
  const pivot = root.left;
  if (pivot === null) return root;
  const movedSubtree = pivot.right;
  const newRight = withHeight({ value: root.value, left: movedSubtree, right: root.right });
  return withHeight({ value: pivot.value, left: pivot.left, right: newRight });
};

const rotateLeft = (root: AvlNode): AvlNode => {
  const pivot = root.right;
  if (pivot === null) return root;
  const movedSubtree = pivot.left;
  const newLeft = withHeight({ value: root.value, left: root.left, right: movedSubtree });
  return withHeight({ value: pivot.value, left: newLeft, right: pivot.right });
};

const insert = (node: AvlNode | null, value: number, events: AvlEvent[]): AvlNode => {
  if (node === null) {
    events.push({ activeValue: value, line: 3, message: `Пустая позиция найдена: создаём новый узел ${value}.` });
    return { value, height: 1, left: null, right: null };
  }

  if (value < node.value) {
    events.push({ activeValue: node.value, line: 2, message: `${value} < ${node.value}: идём в левое поддерево.` });
    node = withHeight({ value: node.value, left: insert(node.left, value, events), right: node.right });
  } else {
    events.push({ activeValue: node.value, line: 2, message: `${value} ≥ ${node.value}: идём в правое поддерево.` });
    node = withHeight({ value: node.value, left: node.left, right: insert(node.right, value, events) });
  }

  const balance = balanceFactor(node);
  events.push({ activeValue: node.value, line: 4, message: `Проверяем баланс узла ${node.value}: высота слева ${height(node.left)}, справа ${height(node.right)}, баланс = ${balance}.` });

  if (balance > 1 && node.left !== null && value < node.left.value) {
    events.push({ activeValue: node.value, line: 5, message: `Случай LL: левое поддерево узла ${node.value} слишком высокое. Выполняем малый правый поворот.` });
    return rotateRight(node);
  }

  if (balance < -1 && node.right !== null && value >= node.right.value) {
    events.push({ activeValue: node.value, line: 5, message: `Случай RR: правое поддерево узла ${node.value} слишком высокое. Выполняем малый левый поворот.` });
    return rotateLeft(node);
  }

  if (balance > 1 && node.left !== null && value >= node.left.value) {
    events.push({ activeValue: node.value, line: 6, message: `Случай LR: сначала левый поворот у левого ребёнка, затем правый поворот у узла ${node.value}.` });
    const newLeft = rotateLeft(node.left);
    return rotateRight(withHeight({ value: node.value, left: newLeft, right: node.right }));
  }

  if (balance < -1 && node.right !== null && value < node.right.value) {
    events.push({ activeValue: node.value, line: 6, message: `Случай RL: сначала правый поворот у правого ребёнка, затем левый поворот у узла ${node.value}.` });
    const newRight = rotateRight(node.right);
    return rotateLeft(withHeight({ value: node.value, left: node.left, right: newRight }));
  }

  return node;
};

const toSnapshot = (root: AvlNode | null): StructureSnapshot => {
  const values: Array<number | null> = Array.from({ length: MAX_CELLS }, () => null);
  const visit = (node: AvlNode | null, index: number): void => {
    if (node === null || index >= MAX_CELLS) return;
    values[index] = node.value;
    visit(node.left, 2 * index + 1);
    visit(node.right, 2 * index + 2);
  };
  visit(root, 0);
  return { label: 'AVL-дерево', cells: values.map((value, index) => ({ id: `avl-${index}`, value })) };
};

const findIndex = (snapshot: StructureSnapshot, value: number | undefined): number | undefined => {
  if (value === undefined) return undefined;
  const index = snapshot.cells.findIndex((cell) => cell.value === value);
  return index < 0 ? undefined : index;
};

const createFrame = (step: number, root: AvlNode | null, event: AvlEvent, phase: StructureAlgorithmFrame['phase'] = 'inspect'): StructureAlgorithmFrame => {
  const data = toSnapshot(root);
  const activeIndex = findIndex(data, event.activeValue);
  return {
    step,
    domain: 'array',
    phase,
    status: phase === 'complete' ? 'completed' : 'running',
    data,
    activeIds: activeIndex === undefined ? [] : [data.cells[activeIndex]?.id ?? ''],
    pseudocode: { line: event.line },
    message: event.message,
    description: event.message,
    meta: {
      operation: 'index',
      ...(activeIndex === undefined ? {} : { activeIndex, pointerIndex: activeIndex }),
    },
  };
};

export function* avlScenario(values: readonly number[]): Generator<StructureAlgorithmFrame, void, unknown> {
  let root: AvlNode | null = null;
  let step = 0;

  yield createFrame(step++, root, {
    line: 1,
    message: `AVL-дерево — самобалансирующееся BST. После каждой вставки проверяем баланс высот и при необходимости выполняем повороты. Порядок вставки: ${values.join(', ')}.`,
  }, 'initial');

  for (const value of values) {
    const events: AvlEvent[] = [{ ...(root === null ? {} : { activeValue: root.value }), line: 1, message: `Начинаем вставку ${value} от корня дерева.` }];
    root = insert(root, value, events);
    for (const event of events) {
      yield createFrame(step++, root, event, event.line === 3 ? 'push' : 'inspect');
    }
  }

  yield createFrame(step, root, {
    line: 7,
    message: 'Построение AVL-дерева завершено. Для каждого узла разность высот левого и правого поддерева находится в пределах -1, 0 или 1.',
  }, 'complete');
}
