import type { TreeDiagramNode, TreeTone } from '@/types/tree';
import type { AlgorithmFrame, AlgorithmPhase } from '@/types';

export interface TreeFrameMeta extends Record<string, unknown> {
  readonly nodes: readonly TreeDiagramNode[];
  /** последовательность вывода (обходы, найденный путь) */
  readonly output?: readonly string[];
  readonly outputLabel?: string;
  /** вспомогательная структура: стек или очередь обхода */
  readonly aux?: readonly string[];
  readonly auxLabel?: string;
  readonly found?: boolean;
}

export type TreeFrame = AlgorithmFrame<{ readonly label: string }, TreeFrameMeta>;

export interface MutableNode {
  readonly id: string;
  value: number;
  left: MutableNode | null;
  right: MutableNode | null;
  parent: MutableNode | null;
  color?: 'red' | 'black';
}

let nodeCounter = 0;

export const createNode = (value: number, parent: MutableNode | null = null): MutableNode => {
  nodeCounter += 1;
  return { id: `n${nodeCounter}`, value, left: null, right: null, parent };
};

/** Снимок дерева для схемы: тон и подписи узлов задаёт вызывающий код. */
export const snapshotTree = (
  root: MutableNode | null,
  toneOf: (node: MutableNode) => TreeTone | undefined = () => undefined,
  extra: (node: MutableNode) => Partial<Pick<TreeDiagramNode, 'badge' | 'sublabel' | 'ring'>> = () => ({}),
): TreeDiagramNode[] => {
  const nodes: TreeDiagramNode[] = [];
  const visit = (node: MutableNode | null, parentKey: string | null, side: 0 | 1): void => {
    if (node === null) return;
    const tone = toneOf(node) ?? (node.color === 'red' ? 'red' : node.color === 'black' ? 'black' : 'idle');
    nodes.push({ key: node.id, label: String(node.value), parentKey, side, tone, ...extra(node) });
    visit(node.left, node.id, 0);
    visit(node.right, node.id, 1);
  };
  visit(root, null, 0);
  return nodes;
};

export const treeFrame = (
  step: number,
  phase: AlgorithmPhase,
  label: string,
  nodes: readonly TreeDiagramNode[],
  line: number,
  message: string,
  meta: Omit<TreeFrameMeta, 'nodes'> = {},
): TreeFrame => ({
  step,
  domain: 'tree',
  phase,
  status: phase === 'complete' ? 'completed' : 'running',
  data: { label },
  activeIds: [],
  pseudocode: { line },
  message,
  description: message,
  meta: { nodes, ...meta },
});

export const treeHeight = (node: MutableNode | null): number => (node === null ? 0 : 1 + Math.max(treeHeight(node.left), treeHeight(node.right)));

export const countNodes = (node: MutableNode | null): number => (node === null ? 0 : 1 + countNodes(node.left) + countNodes(node.right));

export const inorderValues = (node: MutableNode | null, out: number[] = []): number[] => {
  if (node === null) return out;
  inorderValues(node.left, out);
  out.push(node.value);
  inorderValues(node.right, out);
  return out;
};

/** Обычная вставка в дерево поиска без анимации — для подготовки дерева к другим операциям. */
export const buildBst = (values: readonly number[]): MutableNode | null => {
  let root: MutableNode | null = null;
  for (const value of values) {
    if (root === null) {
      root = createNode(value);
      continue;
    }
    let current: MutableNode = root;
    for (;;) {
      if (value < current.value) {
        if (current.left === null) {
          current.left = createNode(value, current);
          break;
        }
        current = current.left;
      } else {
        if (current.right === null) {
          current.right = createNode(value, current);
          break;
        }
        current = current.right;
      }
    }
  }
  return root;
};
