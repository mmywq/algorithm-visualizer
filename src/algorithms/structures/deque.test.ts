import { describe, expect, it } from 'vitest';
import { decodeOps, dequeScript, encodeOps, type DequeOp, type DequeSnapshot } from './deque';

const contents = (snapshot: DequeSnapshot): number[] =>
  Array.from({ length: snapshot.size }, (_, k) => snapshot.cells[(snapshot.front + k) % snapshot.cells.length]!);

const runScript = (ops: readonly DequeOp[], capacity?: number) => [...dequeScript(ops, capacity)].at(-1)!;

describe('дек на кольцевом буфере', () => {
  it('совпадает с эталонной реализацией на массиве', () => {
    const ops: DequeOp[] = [];
    const model: number[] = [];
    const popped: number[] = [];
    let seed = 7;
    const random = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
    for (let i = 0; i < 24; i += 1) {
      const r = random();
      const value = Math.floor(random() * 90);
      if (r < 0.3) ops.push({ kind: 'push-back', value });
      else if (r < 0.6) ops.push({ kind: 'push-front', value });
      else if (r < 0.8) ops.push({ kind: 'pop-front' });
      else ops.push({ kind: 'pop-back' });
    }
    for (const op of ops) {
      if (op.kind === 'push-back' && model.length < 8) model.push(op.value);
      if (op.kind === 'push-front' && model.length < 8) model.unshift(op.value);
      if (op.kind === 'pop-front' && model.length > 0) popped.push(model.shift()!);
      if (op.kind === 'pop-back' && model.length > 0) popped.push(model.pop()!);
    }
    const last = runScript(ops);
    expect(contents(last.data)).toEqual(model);
    expect(last.meta.output).toEqual(popped);
  });

  it('push_front из нуля переходит в конец буфера', () => {
    const last = runScript([{ kind: 'push-front', value: 4 }]);
    expect(last.data.front).toBe(7);
    expect(last.data.cells[7]).toBe(4);
  });

  it('отклоняет переполнение и извлечение из пустого', () => {
    const frames = [
      ...dequeScript([{ kind: 'pop-back' }, { kind: 'push-back', value: 1 }, { kind: 'push-back', value: 2 }, { kind: 'push-back', value: 3 }], 2),
    ];
    expect(frames.filter((frame) => frame.meta.rejected === 'empty')).toHaveLength(1);
    expect(frames.filter((frame) => frame.meta.rejected === 'full')).toHaveLength(1);
    expect(contents(frames.at(-1)!.data)).toEqual([1, 2]);
  });

  it('сценарий переживает кодирование в адрес', () => {
    const ops: DequeOp[] = [{ kind: 'push-front', value: -5 }, { kind: 'push-back', value: 12 }, { kind: 'pop-front' }, { kind: 'pop-back' }];
    expect(decodeOps(encodeOps(ops))).toEqual(ops);
    expect(decodeOps('x1')).toBeNull();
    expect(decodeOps('')).toBeNull();
  });
});
