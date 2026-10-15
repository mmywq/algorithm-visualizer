import { describe, expect, it } from 'vitest';
import type { LinkedListFrame, LinkedListSnapshot } from '@/types';
import { deleteKey, pushBack, pushFront, reverseList } from './linkedList';

const chain = (snapshot: LinkedListSnapshot): number[] => {
  const byId = new Map(snapshot.nodes.map((node) => [node.id, node]));
  const result: number[] = [];
  let id = snapshot.head;
  while (id !== null && result.length <= snapshot.nodes.length) {
    const node = byId.get(id)!;
    result.push(node.value);
    id = node.next;
  }
  return result;
};

const last = (frames: Generator<LinkedListFrame, void, unknown>): LinkedListFrame => [...frames].at(-1)!;

describe('связный список', () => {
  it('вставка в начало и в конец', () => {
    expect(chain(last(pushFront([8, 3, 5], 7)).data)).toEqual([7, 8, 3, 5]);
    expect(chain(last(pushBack([8, 3, 5], 7)).data)).toEqual([8, 3, 5, 7]);
    expect(chain(last(pushFront([], 7)).data)).toEqual([7]);
    expect(chain(last(pushBack([], 7)).data)).toEqual([7]);
  });

  it('удаление из головы, середины и хвоста', () => {
    expect(chain(last(deleteKey([8, 3, 5], 8)).data)).toEqual([3, 5]);
    expect(chain(last(deleteKey([8, 3, 5], 3)).data)).toEqual([8, 5]);
    expect(chain(last(deleteKey([8, 3, 5], 5)).data)).toEqual([8, 3]);
    expect(chain(last(deleteKey([1, 2, 1], 1)).data)).toEqual([2, 1]);
  });

  it('удаление отсутствующего ключа не меняет список', () => {
    const frame = last(deleteKey([8, 3, 5], 4));
    expect(frame.meta.outcome).toBe('miss');
    expect(chain(frame.data)).toEqual([8, 3, 5]);
    expect(last(deleteKey([], 4)).meta.outcome).toBe('miss');
  });

  it('разворот', () => {
    expect(chain(last(reverseList([8, 3, 5, 1])).data)).toEqual([1, 5, 3, 8]);
    expect(chain(last(reverseList([4])).data)).toEqual([4]);
    expect(chain(last(reverseList([])).data)).toEqual([]);
  });

  it('во всех кадрах ссылки ведут только на существующие узлы', () => {
    for (const frames of [pushFront([1, 2], 3), pushBack([1, 2], 3), deleteKey([1, 2, 3], 2), reverseList([1, 2, 3])]) {
      for (const frame of frames) {
        const ids = new Set(frame.data.nodes.map((node) => node.id));
        for (const node of frame.data.nodes) if (node.next !== null) expect(ids.has(node.next)).toBe(true);
        if (frame.data.head !== null) expect(ids.has(frame.data.head)).toBe(true);
      }
    }
  });
});
