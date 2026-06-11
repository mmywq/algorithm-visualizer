import type { StructureAlgorithmFrame, StructureSnapshot } from '@/types';

interface MutNode {
  value: number;
  height: number;
  left: MutNode | null;
  right: MutNode | null;
}

const MAX_CELLS = 31;

const heightOf = (node: MutNode | null): number => node?.height ?? 0;

const updateHeight = (node: MutNode): void => {
  node.height = 1 + Math.max(heightOf(node.left), heightOf(node.right));
};

const balanceFactor = (node: MutNode): number => heightOf(node.left) - heightOf(node.right);

const rotateRight = (node: MutNode): MutNode => {
  const pivot = node.left!;
  node.left = pivot.right;
  pivot.right = node;
  updateHeight(node);
  updateHeight(pivot);
  return pivot;
};

const rotateLeft = (node: MutNode): MutNode => {
  const pivot = node.right!;
  node.right = pivot.left;
  pivot.left = node;
  updateHeight(node);
  updateHeight(pivot);
  return pivot;
};

const toSnapshot = (root: MutNode | null): StructureSnapshot => {
  const values: Array<number | null> = Array.from({ length: MAX_CELLS }, () => null);
  const visit = (node: MutNode | null, index: number): void => {
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

const createFrame = (
  step: number,
  root: MutNode | null,
  message: string,
  line: number,
  activeValue?: number,
  phase: StructureAlgorithmFrame['phase'] = 'inspect',
): StructureAlgorithmFrame => {
  const data = toSnapshot(root);
  const activeIndex = findIndex(data, activeValue);
  return {
    step,
    domain: 'tree',
    phase,
    status: phase === 'complete' ? 'completed' : 'running',
    data,
    activeIds: activeIndex === undefined ? [] : [data.cells[activeIndex]?.id ?? ''],
    pseudocode: { line },
    message,
    description: message,
    meta: {
      operation: 'index',
      ...(activeIndex === undefined ? {} : { activeIndex, pointerIndex: activeIndex }),
    },
  };
};

export function* avlScenario(values: readonly number[]): Generator<StructureAlgorithmFrame, void, unknown> {
  let root: MutNode | null = null;
  let step = 0;
  let rotationCount = 0;

  yield createFrame(
    step++,
    root,
    `АВЛ-дерево — самобалансирующееся дерево поиска: после каждой вставки проверяются балансы узлов на пути, и при перекосе выполняется поворот. Порядок вставки: ${values.join(', ')}.`,
    1,
    undefined,
    'initial',
  );

  for (const value of values) {
    if (root === null) {
      root = { value, height: 1, left: null, right: null };
      yield createFrame(step++, root, `Дерево пусто: ключ ${value} становится корнем.`, 1, value, 'push');
      continue;
    }

    // спуск по правилу дерева поиска — кадры показывают дерево до вставки
    const path: MutNode[] = [];
    let node: MutNode = root;
    let created: MutNode | null = null;
    let createdSide = 'левый';

    yield createFrame(step++, root, `Вставка ключа ${value}: сравнения начинаются от корня ${root.value}.`, 1, root.value);

    while (created === null) {
      path.push(node);
      const goLeft = value < node.value;
      yield createFrame(
        step++,
        root,
        `${value} ${goLeft ? '<' : '≥'} ${node.value}: переходим в ${goLeft ? 'левое' : 'правое'} поддерево узла ${node.value}.`,
        1,
        node.value,
      );

      if (goLeft) {
        if (node.left === null) {
          created = { value, height: 1, left: null, right: null };
          node.left = created;
          createdSide = 'левый';
        } else {
          node = node.left;
        }
      } else {
        if (node.right === null) {
          created = { value, height: 1, left: null, right: null };
          node.right = created;
          createdSide = 'правый';
        } else {
          node = node.right;
        }
      }
    }

    yield createFrame(
      step++,
      root,
      `Достигнута пустая позиция: ключ ${value} вставлен как ${createdSide} ребёнок узла ${path[path.length - 1]!.value}. Теперь проверяются балансы узлов на пути вставки — снизу вверх.`,
      2,
      value,
      'push',
    );

    // подъём по пути вставки: обновление высот и проверка балансов
    for (let i = path.length - 1; i >= 0; i -= 1) {
      const current = path[i]!;
      updateHeight(current);
      const balance = balanceFactor(current);

      if (Math.abs(balance) <= 1) {
        yield createFrame(
          step++,
          root,
          `Узел ${current.value}: высота слева ${heightOf(current.left)}, справа ${heightOf(current.right)}, баланс-фактор ${balance} — в допустимых пределах.`,
          3,
          current.value,
        );
        continue;
      }

      // обнаружен перекос: дерево на экране в этот момент действительно разбалансировано
      const parent = i > 0 ? path[i - 1]! : null;
      const attach = (oldChild: MutNode, newChild: MutNode): void => {
        if (parent === null) {
          root = newChild;
        } else if (parent.left === oldChild) {
          parent.left = newChild;
        } else {
          parent.right = newChild;
        }
      };

      rotationCount += 1;

      if (balance > 1) {
        const leftChild = current.left!;
        if (balanceFactor(leftChild) >= 0) {
          yield createFrame(
            step++,
            root,
            `Узел ${current.value}: баланс-фактор ${balance} — перекос влево «по прямой» (случай LL). Требуется малый правый поворот вокруг ${current.value}.`,
            4,
            current.value,
          );
          const newRoot = rotateRight(current);
          attach(current, newRoot);
          yield createFrame(step++, root, `Правый поворот выполнен: корнем поддерева стал узел ${newRoot.value}, узел ${current.value} опустился вправо. Баланс восстановлен.`, 4, newRoot.value, 'swap');
        } else {
          yield createFrame(
            step++,
            root,
            `Узел ${current.value}: баланс-фактор ${balance} — перекос влево «зигзагом» (случай LR). Сначала левый поворот вокруг ${leftChild.value}.`,
            4,
            current.value,
          );
          current.left = rotateLeft(leftChild);
          yield createFrame(step++, root, `Первый поворот выполнен: в левом поддереве поднялся узел ${current.left.value}. Перекос стал «прямым» — остаётся правый поворот вокруг ${current.value}.`, 4, current.left.value, 'swap');
          const newRoot = rotateRight(current);
          attach(current, newRoot);
          yield createFrame(step++, root, `Второй поворот выполнен: корнем поддерева стал узел ${newRoot.value}. Баланс восстановлен.`, 4, newRoot.value, 'swap');
        }
      } else {
        const rightChild = current.right!;
        if (balanceFactor(rightChild) <= 0) {
          yield createFrame(
            step++,
            root,
            `Узел ${current.value}: баланс-фактор ${balance} — перекос вправо «по прямой» (случай RR). Требуется малый левый поворот вокруг ${current.value}.`,
            4,
            current.value,
          );
          const newRoot = rotateLeft(current);
          attach(current, newRoot);
          yield createFrame(step++, root, `Левый поворот выполнен: корнем поддерева стал узел ${newRoot.value}, узел ${current.value} опустился влево. Баланс восстановлен.`, 4, newRoot.value, 'swap');
        } else {
          yield createFrame(
            step++,
            root,
            `Узел ${current.value}: баланс-фактор ${balance} — перекос вправо «зигзагом» (случай RL). Сначала правый поворот вокруг ${rightChild.value}.`,
            4,
            current.value,
          );
          current.right = rotateRight(rightChild);
          yield createFrame(step++, root, `Первый поворот выполнен: в правом поддереве поднялся узел ${current.right.value}. Перекос стал «прямым» — остаётся левый поворот вокруг ${current.value}.`, 4, current.right.value, 'swap');
          const newRoot = rotateLeft(current);
          attach(current, newRoot);
          yield createFrame(step++, root, `Второй поворот выполнен: корнем поддерева стал узел ${newRoot.value}. Баланс восстановлен.`, 4, newRoot.value, 'swap');
        }
      }

      // при вставке в АВЛ-дерево достаточно одной балансировки;
      // выше по пути обновляются только высоты
      for (let j = i - 1; j >= 0; j -= 1) {
        updateHeight(path[j]!);
      }
      break;
    }
  }

  yield createFrame(
    step,
    root,
    `Построение AVL-дерева завершено: вставлено ${values.length} ключей, выполнено поворотов: ${rotationCount}. Высота дерева — ${heightOf(root)}; для каждого узла разность высот поддеревьев находится в пределах от −1 до 1, поэтому поиск гарантированно выполняется за O(log n).`,
    5,
    undefined,
    'complete',
  );
}
