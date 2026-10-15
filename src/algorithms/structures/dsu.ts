import { treeFrame, type TreeFrame } from '@/algorithms/trees/treeFrames';
import type { AlgorithmPhase } from '@/types';
import type { TreeDiagramNode, TreeTone } from '@/types/tree';

export type DsuOp = { readonly kind: 'union'; readonly a: number; readonly b: number } | { readonly kind: 'find'; readonly x: number };

export const dsuOpLabel = (op: DsuOp): string => (op.kind === 'union' ? `union(${op.a}, ${op.b})` : `find(${op.x})`);

/** Сценарий в адресе: u0-1 — объединить 0 и 1, f3 — найти представителя 3. */
export const encodeDsuOps = (ops: readonly DsuOp[]): string => ops.map((op) => (op.kind === 'union' ? `u${op.a}-${op.b}` : `f${op.x}`)).join(',');

export const decodeDsuOps = (raw: string, size: number): DsuOp[] | null => {
  const ops: DsuOp[] = [];
  for (const token of raw.split(',').filter((item) => item.length > 0)) {
    const union = /^u(\d{1,2})-(\d{1,2})$/.exec(token);
    const find = /^f(\d{1,2})$/.exec(token);
    if (union !== null) {
      const a = Number(union[1]);
      const b = Number(union[2]);
      if (a >= size || b >= size) return null;
      ops.push({ kind: 'union', a, b });
    } else if (find !== null) {
      const x = Number(find[1]);
      if (x >= size) return null;
      ops.push({ kind: 'find', x });
    } else return null;
  }
  return ops.length === 0 ? null : ops.slice(0, 20);
};

export interface DsuMeta {
  readonly parent: readonly number[];
  readonly rank: readonly number[];
  readonly opIndex?: number;
  readonly highlight?: readonly number[];
}

const LABEL = 'Система непересекающихся множеств';

/** Объединение по рангу и сжатие путей; каждый шаг поиска и подвешивания — отдельный кадр. */
export function* dsuScenario(size: number, ops: readonly DsuOp[]): Generator<TreeFrame, void, unknown> {
  const parent = Array.from({ length: size }, (_, index) => index);
  const rank = Array.from({ length: size }, () => 0);
  let step = 0;

  const sets = (): number => parent.filter((value, index) => value === index).length;

  const nodes = (toneOf: (x: number) => TreeTone | undefined): TreeDiagramNode[] => {
    const result: TreeDiagramNode[] = [];
    const children = new Map<number, number[]>();
    parent.forEach((p, x) => {
      if (p !== x) children.set(p, [...(children.get(p) ?? []), x]);
    });
    const visit = (x: number): void => {
      const isRoot = parent[x] === x;
      result.push({
        key: `e${x}`,
        label: String(x),
        parentKey: isRoot ? null : `e${parent[x]}`,
        tone: toneOf(x) ?? (isRoot ? 'black' : 'idle'),
        ...(isRoot ? { sublabel: `ранг ${rank[x]}` } : {}),
      });
      (children.get(x) ?? []).sort((a, b) => a - b).forEach(visit);
    };
    parent.forEach((p, x) => {
      if (p === x) visit(x);
    });
    return result;
  };

  const frame = (
    phase: AlgorithmPhase,
    line: number,
    message: string,
    toneOf: (x: number) => TreeTone | undefined = () => undefined,
    extra: Partial<DsuMeta> & Record<string, unknown> = {},
  ) => treeFrame(step++, phase, LABEL, nodes(toneOf), line, message, { parent: [...parent], rank: [...rank], ...extra });

  yield frame('initial', 1, `${size} элементов, каждый — отдельное множество: parent[i] = i, ранг 0. Корень дерева — представитель множества.`);

  /** поиск корня с кадрами; затем сжатие пути */
  function* find(x: number, opIndex: number, role: string): Generator<TreeFrame, number, unknown> {
    const path: number[] = [x];
    let current = x;
    yield frame('visit', 2, `${role}: начинаем с ${x}.`, (item) => (item === x ? 'active' : undefined), { opIndex, highlight: [x] });
    while (parent[current] !== current) {
      current = parent[current]!;
      path.push(current);
      const at = current;
      yield frame(
        'visit',
        2,
        parent[at] === at ? `Поднимаемся к ${at} — parent[${at}] = ${at}, это корень и представитель.` : `parent = ${at}: поднимаемся выше.`,
        (item) => (item === at ? (parent[at] === at ? 'found' : 'active') : path.includes(item) ? 'path' : undefined),
        { opIndex, highlight: [at] },
      );
    }
    const root = current;
    const compress = path.slice(0, -2);
    if (compress.length > 0) {
      for (const item of compress) parent[item] = root;
      yield frame(
        'swap',
        3,
        `Сжатие пути: ${compress.join(', ')} теперь ссылаются прямо на корень ${root}. Следующий find для них займёт один шаг.`,
        (item) => (item === root ? 'found' : compress.includes(item) ? 'new' : undefined),
        { opIndex, highlight: compress },
      );
    }
    return root;
  }

  for (let opIndex = 0; opIndex < ops.length; opIndex += 1) {
    const op = ops[opIndex]!;
    if (op.kind === 'find') {
      const root = yield* find(op.x, opIndex, `find(${op.x})`);
      yield frame('inspect', 2, `find(${op.x}) = ${root}: представитель множества, в котором лежит ${op.x}.`, (item) => (item === root ? 'found' : undefined), {
        opIndex,
        highlight: [root],
      });
      continue;
    }

    const ra = yield* find(op.a, opIndex, `union(${op.a}, ${op.b}) — ищем корень ${op.a}`);
    const rb = yield* find(op.b, opIndex, `union(${op.a}, ${op.b}) — ищем корень ${op.b}`);
    if (ra === rb) {
      yield frame(
        'inspect',
        4,
        `У ${op.a} и ${op.b} общий корень ${ra} — они уже в одном множестве, объединять нечего.`,
        (item) => (item === ra ? 'found' : undefined),
        { opIndex },
      );
      continue;
    }

    yield frame(
      'compare',
      5,
      `Корни ${ra} (ранг ${rank[ra]}) и ${rb} (ранг ${rank[rb]}). ${rank[ra] === rank[rb] ? 'Ранги равны — подвесим второй к первому, ранг первого вырастет.' : `Подвешиваем корень меньшего ранга к большему — так деревья остаются низкими.`}`,
      (item) => (item === ra || item === rb ? 'active' : undefined),
      { opIndex, highlight: [ra, rb] },
    );

    const [low, high] = rank[ra]! < rank[rb]! ? [ra, rb] : [rb, ra];
    parent[low] = high;
    const grew = rank[low] === rank[high];
    if (grew) rank[high] = rank[high]! + 1;
    yield frame(
      'merge',
      grew ? 6 : 5,
      `parent[${low}] ← ${high}: множества объединены, представитель — ${high}${grew ? `, его ранг стал ${rank[high]}` : ''}. Осталось множеств: ${sets()}.`,
      (item) => (item === high ? 'found' : item === low ? 'new' : undefined),
      { opIndex, highlight: [low] },
    );
  }

  const groups = new Map<number, number[]>();
  parent.forEach((_, x) => {
    let root = x;
    while (parent[root] !== root) root = parent[root]!;
    groups.set(root, [...(groups.get(root) ?? []), x]);
  });
  yield frame(
    'complete',
    6,
    `Готово: ${groups.size} ${groups.size === 1 ? 'множество' : groups.size < 5 ? 'множества' : 'множеств'} — ${[...groups.values()].map((items) => `{${items.join(', ')}}`).join(' ')}. С рангами и сжатием путей каждая операция в среднем почти O(1).`,
  );
}
