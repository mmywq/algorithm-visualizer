import { describe, expect, it } from 'vitest';
import type { StructureAlgorithmFrame } from '@/types';
import {
  hashBlockSearchScenario,
  hashChainingDeleteScenario,
  hashChainingSearchScenario,
  hashOpenAddressingScenario,
  hashOpenAddressingSearchScenario,
} from './hashTable';

const last = (frames: Iterable<StructureAlgorithmFrame>): StructureAlgorithmFrame => {
  let final: StructureAlgorithmFrame | undefined;
  for (const frame of frames) final = frame;
  return final!;
};

const values = [15, 22, 8, 29, 4];

describe('хеш-таблицы: итог операции', () => {
  it('метод цепочек: найденный ключ — hit, отсутствующий — miss', () => {
    expect(last(hashChainingSearchScenario(values, 29)).meta.outcome).toBe('hit');
    // 36 mod 7 = 1 — та же корзина, что у 15, 22, 8 и 29: цепочка просматривается целиком
    expect(last(hashChainingSearchScenario(values, 36)).meta.outcome).toBe('miss');
    // 3 mod 7 = 3 — пустая корзина
    expect(last(hashChainingSearchScenario(values, 3)).meta.outcome).toBe('miss');
  });

  it('удаление отсутствующего ключа — miss, а удаление существующего не помечено неудачей', () => {
    expect(last(hashChainingDeleteScenario(values, 36)).meta.outcome).toBe('miss');
    expect(last(hashChainingDeleteScenario(values, 22)).meta.outcome).toBeUndefined();
  });

  it('открытая адресация и блочная адресация', () => {
    expect(last(hashOpenAddressingSearchScenario(values, 8)).meta.outcome).toBe('hit');
    expect(last(hashOpenAddressingSearchScenario(values, 36)).meta.outcome).toBe('miss');
    expect(last(hashBlockSearchScenario(values, 4)).meta.outcome).toBe('hit');
    expect(last(hashBlockSearchScenario(values, 36)).meta.outcome).toBe('miss');
  });

  it('вставка в заполненную таблицу — miss', () => {
    expect(last(hashOpenAddressingScenario([1, 2, 3, 4], 3)).meta.outcome).toBe('miss');
    expect(last(hashOpenAddressingScenario([1, 2, 3], 7)).meta.outcome).toBeUndefined();
  });
});
