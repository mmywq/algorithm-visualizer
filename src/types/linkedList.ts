import type { AlgorithmFrame } from './algorithm';

export interface ListNode {
  readonly id: string;
  readonly value: number;
  /** id следующего узла; null — конец списка */
  readonly next: string | null;
}

export interface LinkedListSnapshot {
  /** узлы в порядке раскладки на сцене (не обязательно в порядке ссылок — например, во время разворота) */
  readonly nodes: readonly ListNode[];
  readonly head: string | null;
}

export interface LinkedListMeta extends Record<string, unknown> {
  /** вспомогательные указатели алгоритма: prev, curr, next…; null — указывает в никуда */
  readonly pointers?: Readonly<Record<string, string | null>>;
  readonly activeId?: string;
  readonly foundId?: string;
  readonly newId?: string;
  readonly removedId?: string;
  /** узел, у которого только что изменилась ссылка next */
  readonly changedLink?: string;
  readonly outcome?: 'hit' | 'miss';
}

export type LinkedListFrame = AlgorithmFrame<LinkedListSnapshot, LinkedListMeta>;
