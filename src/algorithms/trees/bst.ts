import type { TreeTone } from '@/types/tree';
import { buildBst, createNode, inorderValues, snapshotTree, treeFrame, treeHeight, type MutableNode, type TreeFrame } from './treeFrames';

type TreeGenerator = Generator<TreeFrame, void, unknown>;

const LABEL = 'Двоичное дерево поиска';

const tones =
  (active: MutableNode | null, path: ReadonlySet<MutableNode>, found?: MutableNode | null) =>
  (node: MutableNode): TreeTone | undefined => {
    if (found !== undefined && found === node) return 'found';
    if (node === active) return 'active';
    if (path.has(node)) return 'path';
    return undefined;
  };

/** Построение дерева поиска последовательными вставками. */
export function* bstBuildScenario(values: readonly number[]): TreeGenerator {
  let root: MutableNode | null = null;
  let step = 0;
  let comparisons = 0;

  yield treeFrame(
    step++,
    'initial',
    LABEL,
    [],
    1,
    `Начинаем с пустого дерева. Ключи вставляются по порядку: ${values.join(', ')}. Каждый новый ключ спускается от корня: меньше — налево, больше или равно — направо.`,
  );

  for (const value of values) {
    if (root === null) {
      root = createNode(value);
      yield treeFrame(
        step++,
        'push',
        LABEL,
        snapshotTree(root, (node) => (node === root ? 'new' : undefined)),
        1,
        `Дерево пусто — ключ ${value} становится корнем.`,
      );
      continue;
    }

    const path = new Set<MutableNode>();
    let current: MutableNode = root;
    for (;;) {
      comparisons += 1;
      const goLeft = value < current.value;
      yield treeFrame(
        step++,
        'compare',
        LABEL,
        snapshotTree(root, tones(current, path)),
        goLeft ? 3 : 4,
        `Вставляем ${value}: сравниваем с узлом ${current.value}. ${goLeft ? `${value} < ${current.value} — идём в левое поддерево.` : `${value} ≥ ${current.value} — идём в правое поддерево.`}`,
      );
      path.add(current);
      const next: MutableNode | null = goLeft ? current.left : current.right;
      if (next === null) {
        const created = createNode(value, current);
        if (goLeft) current.left = created;
        else current.right = created;
        yield treeFrame(
          step++,
          'push',
          LABEL,
          snapshotTree(root, (node) => (node === created ? 'new' : path.has(node) ? 'path' : undefined)),
          5,
          `Место ${goLeft ? 'левого' : 'правого'} ребёнка узла ${current.value} свободно — ставим туда ${value}. Глубина нового узла: ${path.size}.`,
        );
        break;
      }
      current = next;
    }
  }

  const height = treeHeight(root);
  const ideal = Math.ceil(Math.log2(values.length + 1));
  yield treeFrame(
    step,
    'complete',
    LABEL,
    snapshotTree(root),
    6,
    `Дерево построено: ${values.length} узлов, высота ${height}, сравнений при вставке — ${comparisons}. ${
      height > ideal + 1
        ? `Идеально сбалансированное дерево из стольких узлов имело бы высоту ${ideal}: порядок вставки перекосил дерево, и поиск в нём стал медленнее.`
        : `Это близко к оптимуму (${ideal}): поиск любого ключа займёт не больше ${height} сравнений.`
    } Симметричный обход выдаёт ключи по возрастанию: ${inorderValues(root).join(', ')}.`,
  );
}

/** Поиск ключа: путь сравнений от корня вниз. */
export function* bstSearchNodeScenario(values: readonly number[], target: number): TreeGenerator {
  const root = buildBst(values);
  const path = new Set<MutableNode>();
  const visited: number[] = [];
  let step = 0;

  yield treeFrame(step++, 'initial', LABEL, snapshotTree(root), 1, `Дерево построено из ключей [${values.join(', ')}]. Ищем ${target}, начиная с корня.`);

  let current = root;
  while (current !== null) {
    visited.push(current.value);
    yield treeFrame(step++, 'compare', LABEL, snapshotTree(root, tones(current, path)), 2, `Сравнение №${visited.length}: ${target} и ${current.value}.`, {
      output: visited.map(String),
      outputLabel: 'Путь поиска',
    });
    if (target === current.value) {
      const found = current;
      yield treeFrame(
        step,
        'complete',
        LABEL,
        snapshotTree(root, tones(null, path, found)),
        5,
        `Ключ ${target} найден за ${visited.length} ${visited.length === 1 ? 'сравнение' : visited.length < 5 ? 'сравнения' : 'сравнений'}. Путь: ${visited.join(' → ')}. В дереве ${values.length} узлов, но просмотрена лишь одна ветка.`,
        { output: visited.map(String), outputLabel: 'Путь поиска', found: true },
      );
      return;
    }
    const goLeft = target < current.value;
    path.add(current);
    yield treeFrame(
      step++,
      'inspect',
      LABEL,
      snapshotTree(root, tones(current, path)),
      3,
      `${target} ${goLeft ? '<' : '>'} ${current.value} — переходим в ${goLeft ? 'левое' : 'правое'} поддерево. Всё ${goLeft ? 'правое' : 'левое'} поддерево отброшено.`,
      {
        output: visited.map(String),
        outputLabel: 'Путь поиска',
      },
    );
    current = goLeft ? current.left : current.right;
  }

  yield treeFrame(
    step,
    'complete',
    LABEL,
    snapshotTree(root, tones(null, path)),
    4,
    `Дошли до пустого места — ключа ${target} в дереве нет. Выполнено сравнений: ${visited.length}, путь: ${visited.join(' → ') || 'пустое дерево'}.`,
    {
      output: visited.map(String),
      outputLabel: 'Путь поиска',
      outcome: 'miss',
    },
  );
}

const replaceInParent = (root: MutableNode | null, node: MutableNode, replacement: MutableNode | null): MutableNode | null => {
  if (replacement !== null) replacement.parent = node.parent;
  if (node.parent === null) return replacement;
  if (node.parent.left === node) node.parent.left = replacement;
  else node.parent.right = replacement;
  return root;
};

/** Удаление: лист, узел с одним ребёнком, узел с двумя детьми (через преемника). */
export function* bstDeleteScenario(values: readonly number[], target: number): TreeGenerator {
  let root = buildBst(values);
  const path = new Set<MutableNode>();
  let step = 0;
  const label = 'Удаление из дерева поиска';

  yield treeFrame(
    step++,
    'initial',
    label,
    snapshotTree(root),
    1,
    `Дерево построено из ключей [${values.join(', ')}]. Удаляем ${target}: сначала найдём узел.`,
  );

  let node = root;
  while (node !== null && node.value !== target) {
    yield treeFrame(
      step++,
      'compare',
      label,
      snapshotTree(root, tones(node, path)),
      1,
      `${target} ${target < node.value ? '<' : '>'} ${node.value} — идём ${target < node.value ? 'влево' : 'вправо'}.`,
    );
    path.add(node);
    node = target < node.value ? node.left : node.right;
  }

  if (node === null) {
    yield treeFrame(step, 'complete', label, snapshotTree(root, tones(null, path)), 1, `Ключа ${target} в дереве нет — удалять нечего. Дерево не изменилось.`, {
      outcome: 'miss',
    });
    return;
  }

  const victim = node;
  yield treeFrame(
    step++,
    'inspect',
    label,
    snapshotTree(root, tones(null, path, victim)),
    2,
    `Узел ${target} найден. Детей у него: ${(victim.left === null ? 0 : 1) + (victim.right === null ? 0 : 1)}. От этого зависит, какой случай удаления применить.`,
  );

  if (victim.left === null && victim.right === null) {
    yield treeFrame(
      step++,
      'pop',
      label,
      snapshotTree(root, (item) => (item === victim ? 'red' : undefined)),
      2,
      `Случай 1: ${target} — лист. Его можно просто убрать: ссылка родителя становится пустой.`,
    );
    root = replaceInParent(root, victim, null);
  } else if (victim.left === null || victim.right === null) {
    const child = (victim.left ?? victim.right)!;
    yield treeFrame(
      step++,
      'pop',
      label,
      snapshotTree(root, (item) => (item === victim ? 'red' : item === child ? 'active' : undefined)),
      3,
      `Случай 2: у ${target} один ребёнок (${child.value}). Ребёнок занимает место удаляемого узла вместе со всем своим поддеревом.`,
    );
    root = replaceInParent(root, victim, child);
  } else {
    const successorPath = new Set<MutableNode>();
    let successor: MutableNode = victim.right;
    yield treeFrame(
      step++,
      'inspect',
      label,
      snapshotTree(root, (item) => (item === victim ? 'found' : item === successor ? 'active' : undefined)),
      4,
      `Случай 3: у ${target} два ребёнка. Ищем преемника — наименьший ключ правого поддерева: шаг вправо к ${successor.value}, затем до упора влево.`,
    );
    while (successor.left !== null) {
      successorPath.add(successor);
      successor = successor.left;
      const current = successor;
      yield treeFrame(
        step++,
        'inspect',
        label,
        snapshotTree(root, (item) => (item === victim ? 'found' : item === current ? 'active' : successorPath.has(item) ? 'path' : undefined)),
        4,
        `Идём влево к ${current.value}: левее могут быть только ещё меньшие ключи.`,
      );
    }
    const successorValue = successor.value;
    yield treeFrame(
      step++,
      'swap',
      label,
      snapshotTree(root, (item) => (item === victim || item === successor ? 'new' : undefined)),
      5,
      `Преемник — ${successorValue}: это следующий по величине ключ после ${target}. Копируем ${successorValue} в удаляемый узел — порядок ключей при этом не нарушится.`,
    );
    victim.value = successorValue;
    const successorChild = successor.right;
    root = replaceInParent(root, successor, successorChild);
    yield treeFrame(
      step++,
      'pop',
      label,
      snapshotTree(root, (item) => (item === victim ? 'found' : undefined)),
      6,
      `Старый узел преемника удаляем${successorChild === null ? ' — у него нет левого ребёнка, это лист' : `: его правый ребёнок ${successorChild.value} поднимается на его место`}.`,
    );
  }

  yield treeFrame(
    step,
    'complete',
    label,
    snapshotTree(root),
    7,
    `Удаление ${target} завершено. Свойство дерева поиска сохранено — симметричный обход: ${inorderValues(root).join(', ') || 'дерево пусто'}. Высота дерева: ${treeHeight(root)}.`,
  );
}

export type TraversalOrder = 'preorder' | 'inorder' | 'postorder' | 'level';

export const traversalNames: Record<TraversalOrder, string> = {
  preorder: 'Прямой (узел → лево → право)',
  inorder: 'Симметричный (лево → узел → право)',
  postorder: 'Обратный (лево → право → узел)',
  level: 'По уровням (в ширину)',
};

/** Обходы дерева: рекурсивные через явный стек вызовов и по уровням через очередь. */
export function* traversalScenario(values: readonly number[], order: TraversalOrder): TreeGenerator {
  const root = buildBst(values);
  const visited = new Set<MutableNode>();
  const output: string[] = [];
  let step = 0;
  const label = 'Обход дерева';
  const tone =
    (current: MutableNode | null) =>
    (node: MutableNode): TreeTone | undefined =>
      node === current ? 'active' : visited.has(node) ? 'done' : undefined;

  yield treeFrame(
    step++,
    'initial',
    label,
    snapshotTree(root),
    1,
    `Обход «${traversalNames[order]}» посетит каждый из ${values.length} узлов ровно один раз. Порядок посещения и есть результат.`,
    { output, outputLabel: 'Порядок посещения' },
  );

  if (order === 'level') {
    const queue: MutableNode[] = root === null ? [] : [root];
    while (queue.length > 0) {
      const node = queue.shift()!;
      yield treeFrame(step++, 'dequeue', label, snapshotTree(root, tone(node)), 2, `Берём ${node.value} из начала очереди.`, {
        output: [...output],
        outputLabel: 'Порядок посещения',
        aux: queue.map((item) => String(item.value)),
        auxLabel: 'Очередь',
      });
      visited.add(node);
      output.push(String(node.value));
      if (node.left !== null) queue.push(node.left);
      if (node.right !== null) queue.push(node.right);
      yield treeFrame(
        step++,
        'enqueue',
        label,
        snapshotTree(root, tone(node)),
        3,
        `Посещаем ${node.value}${
          node.left !== null || node.right !== null
            ? ` и ставим в очередь детей: ${[node.left, node.right]
                .filter((child) => child !== null)
                .map((child) => child!.value)
                .join(', ')}`
            : ' — детей нет'
        }.`,
        { output: [...output], outputLabel: 'Порядок посещения', aux: queue.map((item) => String(item.value)), auxLabel: 'Очередь' },
      );
    }
  } else {
    const stack: string[] = [];
    function* walk(node: MutableNode | null): TreeGenerator {
      if (node === null) return;
      stack.push(String(node.value));
      yield treeFrame(step++, 'push', label, snapshotTree(root, tone(node)), 2, `Входим в узел ${node.value} (глубина рекурсии ${stack.length}).`, {
        output: [...output],
        outputLabel: 'Порядок посещения',
        aux: [...stack],
        auxLabel: 'Стек вызовов',
      });
      if (order === 'preorder') {
        visited.add(node);
        output.push(String(node.value));
        yield treeFrame(step++, 'visit', label, snapshotTree(root, tone(node)), 3, `Прямой обход посещает узел сразу при входе: ${node.value}.`, {
          output: [...output],
          outputLabel: 'Порядок посещения',
          aux: [...stack],
          auxLabel: 'Стек вызовов',
        });
      }
      yield* walk(node.left);
      if (order === 'inorder') {
        visited.add(node);
        output.push(String(node.value));
        yield treeFrame(
          step++,
          'visit',
          label,
          snapshotTree(root, tone(node)),
          3,
          `Левое поддерево ${node.value} пройдено — посещаем сам узел: ${node.value}.`,
          { output: [...output], outputLabel: 'Порядок посещения', aux: [...stack], auxLabel: 'Стек вызовов' },
        );
      }
      yield* walk(node.right);
      if (order === 'postorder') {
        visited.add(node);
        output.push(String(node.value));
        yield treeFrame(
          step++,
          'visit',
          label,
          snapshotTree(root, tone(node)),
          3,
          `Оба поддерева ${node.value} пройдены — только теперь посещаем узел: ${node.value}.`,
          { output: [...output], outputLabel: 'Порядок посещения', aux: [...stack], auxLabel: 'Стек вызовов' },
        );
      }
      stack.pop();
      yield treeFrame(
        step++,
        'pop',
        label,
        snapshotTree(root, tone(node.parent)),
        4,
        `Выходим из узла ${node.value}, возвращаемся ${node.parent === null ? 'из корня — обход почти завершён' : `к ${node.parent.value}`}.`,
        { output: [...output], outputLabel: 'Порядок посещения', aux: [...stack], auxLabel: 'Стек вызовов' },
      );
    }
    yield* walk(root);
  }

  const note =
    order === 'inorder'
      ? 'Для дерева поиска симметричный обход всегда выдаёт ключи по возрастанию.'
      : order === 'preorder'
        ? 'Прямой обход удобен для копирования дерева: корень записывается раньше потомков.'
        : order === 'postorder'
          ? 'Обратный обход нужен, когда сначала надо обработать детей — например, при удалении дерева.'
          : 'Обход по уровням — это поиск в ширину: ближние к корню узлы посещаются первыми.';
  yield treeFrame(
    step,
    'complete',
    label,
    snapshotTree(root, () => 'done'),
    5,
    `Обход завершён: ${output.join(' → ')}. ${note}`,
    { output, outputLabel: 'Порядок посещения' },
  );
}
