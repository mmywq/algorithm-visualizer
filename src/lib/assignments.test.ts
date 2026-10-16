import { describe, expect, it } from 'vitest';
import { assignmentStatus, BOM, classProgressCsv, dueLabel, masteredAt } from './assignments';

const NOW = Date.parse('2026-10-16T12:00:00');
const full = (at: string) => ({ theoryAt: at, demoAt: at, quizAt: at, quizBest: 0.8 });

describe('статус задания', () => {
  it('момент освоения — самый поздний из трёх этапов', () => {
    expect(masteredAt({ theoryAt: '2026-10-01T10:00:00Z', demoAt: '2026-10-03T10:00:00Z', quizAt: '2026-10-02T10:00:00Z' })).toBe('2026-10-03T10:00:00Z');
    expect(masteredAt({ theoryAt: '2026-10-01T10:00:00Z', demoAt: '2026-10-03T10:00:00Z' })).toBeNull();
  });

  it('сдано в срок, с опозданием, просрочено, в процессе, не начато', () => {
    const due = '2026-10-10T23:59:00';
    const ids = ['a', 'b'];
    expect(assignmentStatus(ids, { a: full('2026-10-05T10:00:00'), b: full('2026-10-09T10:00:00') }, due, NOW).state).toBe('done');
    expect(assignmentStatus(ids, { a: full('2026-10-05T10:00:00'), b: full('2026-10-12T10:00:00') }, due, NOW)).toMatchObject({
      state: 'late',
      done: 2,
      completedAt: '2026-10-12T10:00:00',
    });
    expect(assignmentStatus(ids, { a: full('2026-10-05T10:00:00') }, due, NOW)).toMatchObject({ state: 'overdue', done: 1, total: 2 });
    expect(assignmentStatus(ids, { a: { demoRuns: 2 } }, '2026-10-20T23:59:00', NOW).state).toBe('progress');
    expect(assignmentStatus(ids, {}, null, NOW).state).toBe('idle');
  });

  it('без срока задание не бывает просроченным', () => {
    expect(assignmentStatus(['a'], { a: full('2030-01-01T00:00:00') }, null, NOW).state).toBe('done');
    expect(assignmentStatus(['a'], {}, null, NOW).state).toBe('idle');
  });
});

describe('подпись срока', () => {
  it('считает календарные дни и склоняет слова', () => {
    expect(dueLabel('2026-10-16T23:59:00', NOW)).toEqual({ text: 'срок сегодня', tone: 'soon' });
    expect(dueLabel('2026-10-17T23:59:00', NOW).text).toBe('срок завтра');
    expect(dueLabel('2026-10-19T23:59:00', NOW)).toEqual({ text: 'осталось 3 дня', tone: 'soon' });
    expect(dueLabel('2026-10-21T23:59:00', NOW)).toEqual({ text: 'осталось 5 дней', tone: 'calm' });
    expect(dueLabel('2026-10-15T23:59:00', NOW)).toEqual({ text: 'просрочено на 1 день', tone: 'late' });
    expect(dueLabel('2026-10-11T23:59:00', NOW).text).toBe('просрочено на 5 дней');
    expect(dueLabel('2026-10-16T09:00:00', NOW).text).toBe('срок истёк');
  });
});

describe('таблица для Excel', () => {
  const csv = classProgressCsv(
    [{ title: 'Лаба 1', algorithmIds: ['a'], dueAt: '2026-10-10T23:59:00' }],
    [
      { displayName: 'Анна', progress: { a: full('2026-10-05T10:00:00') }, updatedAt: '2026-10-05T10:00:00' },
      { displayName: '=HYPERLINK("x")', progress: {}, updatedAt: null },
    ],
    () => 'Сортировка; вставками',
    NOW,
  );
  const lines = csv.slice(BOM.length).trimEnd().split('\r\n');

  it('начинается с BOM и разделена точкой с запятой', () => {
    expect(csv.startsWith(BOM)).toBe(true);
    expect(lines[0]).toBe(
      'Студент;Лаба 1: статус;Лаба 1: алгоритмов;Лаба 1: дата сдачи;"Сортировка; вставками: этапов из 3";"Сортировка; вставками: тест, %";Последняя синхронизация',
    );
    expect(lines[1]).toBe('Анна;Сдано;1/1;05.10.2026;3;80;05.10.2026');
  });

  it('не даёт Excel выполнить имя студента как формулу', () => {
    expect(lines[2]?.startsWith(`"'=HYPERLINK(""x"")";Просрочено;0/1;;0;;`)).toBe(true);
  });
});
