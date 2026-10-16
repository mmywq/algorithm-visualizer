import type { AlgorithmPhase } from '@/types';
import type { TreeDiagramNode, TreeTone } from '@/types/tree';
import { treeFrame, type TreeFrame } from './treeFrames';
import { countOf } from '@/lib/plural';

type TrieGenerator = Generator<TreeFrame, void, unknown>;

interface TrieNode {
  readonly id: string;
  readonly char: string;
  readonly children: Map<string, TrieNode>;
  readonly parent: TrieNode | null;
  word: string | null;
}

const LABEL = 'Префиксное дерево';

/** Слова для бора: строчные буквы, без повторов, в порядке ввода. */
export const normalizeWords = (raw: string): string[] => {
  const words = raw
    .toLowerCase()
    .replace(/ё/g, 'е')
    .split(/[\s,;]+/)
    .map((word) => word.replace(/[^a-zа-я]/g, ''))
    .filter((word) => word.length > 0);
  return [...new Set(words)];
};

class Trie {
  readonly root: TrieNode;
  private counter = 0;

  constructor() {
    this.root = this.make('', null);
  }

  make(char: string, parent: TrieNode | null): TrieNode {
    this.counter += 1;
    return { id: `t${this.counter}`, char, children: new Map(), parent, word: null };
  }

  size(): number {
    let count = 0;
    const visit = (node: TrieNode): void => {
      count += 1;
      node.children.forEach(visit);
    };
    visit(this.root);
    return count;
  }

  insertSilently(word: string): void {
    let node = this.root;
    for (const char of word) {
      let child = node.children.get(char);
      if (child === undefined) {
        child = this.make(char, node);
        node.children.set(char, child);
      }
      node = child;
    }
    node.word = word;
  }

  snapshot(toneOf: (node: TrieNode) => TreeTone | undefined): TreeDiagramNode[] {
    const nodes: TreeDiagramNode[] = [];
    const visit = (node: TrieNode): void => {
      nodes.push({
        key: node.id,
        label: node === this.root ? '∗' : node.char,
        parentKey: node.parent?.id ?? null,
        tone: toneOf(node) ?? (node.word !== null ? 'done' : 'idle'),
        ...(node.word !== null ? { sublabel: node.word } : {}),
      });
      [...node.children.keys()].sort((a, b) => a.localeCompare(b, 'ru')).forEach((key) => visit(node.children.get(key)!));
    };
    visit(this.root);
    return nodes;
  }
}

const tonesFor =
  (current: TrieNode | null, path: ReadonlySet<TrieNode>, fresh: ReadonlySet<TrieNode> = new Set()) =>
  (node: TrieNode): TreeTone | undefined =>
    node === current ? 'active' : fresh.has(node) ? 'new' : path.has(node) ? 'path' : undefined;

/** Вставка слов по одной букве: общие префиксы переиспользуются. */
export function* trieBuildScenario(words: readonly string[]): TrieGenerator {
  const trie = new Trie();
  let step = 0;
  const added: string[] = [];
  const frame = (phase: AlgorithmPhase, line: number, message: string, toneOf: (node: TrieNode) => TreeTone | undefined) =>
    treeFrame(step++, phase, LABEL, trie.snapshot(toneOf), line, message, { output: [...added], outputLabel: 'Слова в боре' });

  yield frame(
    'initial',
    1,
    `Бор начинается с пустого корня ∗. Каждое ребро — одна буква, а путь от корня — префикс слова. Вставим: ${words.join(', ')}.`,
    () => undefined,
  );

  let letters = 0;
  for (const word of words) {
    let node = trie.root;
    const path = new Set<TrieNode>([trie.root]);
    const fresh = new Set<TrieNode>();
    for (let index = 0; index < word.length; index += 1) {
      const char = word[index]!;
      letters += 1;
      const existing = node.children.get(char);
      if (existing !== undefined) {
        node = existing;
        path.add(node);
        yield frame(
          'visit',
          2,
          `«${word}»: буква «${char}» уже есть — префикс «${word.slice(0, index + 1)}» общий, идём по существующему узлу.`,
          tonesFor(node, path, fresh),
        );
      } else {
        const child = trie.make(char, node);
        node.children.set(char, child);
        node = child;
        fresh.add(node);
        yield frame('push', 3, `«${word}»: буквы «${char}» после «${word.slice(0, index)}» ещё нет — создаём новый узел.`, tonesFor(node, path, fresh));
      }
    }
    node.word = word;
    added.push(word);
    yield frame(
      'visit',
      4,
      `Последняя буква «${word}» — отмечаем узел как конец слова. ${fresh.size === 0 ? 'Новых узлов не понадобилось: слово целиком совпало с уже существующим путём.' : `Новых узлов: ${fresh.size}.`}`,
      tonesFor(node, path, fresh),
    );
  }

  const size = trie.size() - 1;
  yield frame(
    'complete',
    5,
    `Готово: ${countOf(words.length, 'слово', 'слова', 'слов')} из ${countOf(letters, 'буквы', 'букв', 'букв')} ${words.length === 1 ? 'хранится' : 'хранятся'} в ${countOf(size, 'узле', 'узлах', 'узлах')} — общие префиксы записаны один раз. Поиск любого слова или префикса длины L займёт L шагов, сколько бы слов ни было в боре.`,
    () => undefined,
  );
}

/** Поиск всех слов с заданным префиксом: спуск по буквам и обход поддерева. */
export function* triePrefixScenario(words: readonly string[], prefix: string): TrieGenerator {
  const trie = new Trie();
  words.forEach((word) => trie.insertSilently(word));
  let step = 0;
  const found: string[] = [];
  const path = new Set<TrieNode>([trie.root]);
  const frame = (phase: AlgorithmPhase, line: number, message: string, toneOf: (node: TrieNode) => TreeTone | undefined, extra: Record<string, unknown> = {}) =>
    treeFrame(step++, phase, LABEL, trie.snapshot(toneOf), line, message, {
      output: [...found],
      outputLabel: `Слова на «${prefix}»`,
      found: found.length > 0,
      ...extra,
    });

  yield frame('initial', 1, `Ищем слова, которые начинаются с «${prefix}». Спускаемся от корня по буквам префикса.`, tonesFor(trie.root, path));

  let node = trie.root;
  for (let index = 0; index < prefix.length; index += 1) {
    const char = prefix[index]!;
    const child = node.children.get(char);
    if (child === undefined) {
      yield frame(
        'complete',
        3,
        `После «${prefix.slice(0, index)}» нет ребра «${char}» — ни одно слово не начинается с «${prefix}». Шагов спуска: ${index + 1}.`,
        tonesFor(node, path),
        {
          outcome: 'miss',
        },
      );
      return;
    }
    node = child;
    path.add(node);
    yield frame('visit', 2, `Буква «${char}» есть — переходим. Пройденный префикс: «${prefix.slice(0, index + 1)}».`, tonesFor(node, path));
  }

  const subtree = new Set<TrieNode>();
  const collectSubtree = (item: TrieNode): void => {
    subtree.add(item);
    item.children.forEach(collectSubtree);
  };
  collectSubtree(node);
  const prefixEnd = node;
  yield frame('inspect', 4, `Префикс «${prefix}» пройден. Все слова с ним лежат в поддереве этого узла — обойдём его целиком.`, (item) =>
    item === prefixEnd ? 'active' : subtree.has(item) ? 'path' : path.has(item) ? 'path' : 'muted',
  );

  const visited = new Set<TrieNode>();
  function* walk(item: TrieNode): TrieGenerator {
    visited.add(item);
    if (item.word !== null) {
      found.push(item.word);
      yield frame('visit', 4, `Узел отмечен как конец слова — нашли «${item.word}».`, (other) =>
        other === item ? 'found' : subtree.has(other) ? (visited.has(other) ? 'done' : 'path') : path.has(other) ? 'path' : 'muted',
      );
    }
    for (const key of [...item.children.keys()].sort((a, b) => a.localeCompare(b, 'ru'))) yield* walk(item.children.get(key)!);
  }
  yield* walk(node);

  yield frame(
    'complete',
    5,
    found.length === 0
      ? `Префикс «${prefix}» есть в боре, но целых слов с ним нет.`
      : `Найдено ${found.length}: ${found.join(', ')}. Спуск по префиксу занял ${countOf(prefix.length, 'шаг', 'шага', 'шагов')} — длина префикса, а не число слов.`,
    (item) => (subtree.has(item) ? 'done' : path.has(item) ? 'path' : 'muted'),
    found.length === 0 ? { outcome: 'miss' } : {},
  );
}
