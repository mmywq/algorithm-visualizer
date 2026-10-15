import { describe, expect, it } from 'vitest';
import { demoRegistry } from '@/features/algorithm/registry';
import { catalog as algorithms } from './catalog';
import { loadQuiz, loadTheory } from './loaders';

describe('каталог', () => {
  it('у каждого алгоритма есть теория', async () => {
    const missing: string[] = [];
    for (const entry of algorithms) {
      const theory = await loadTheory(entry.category, entry.id);
      if (theory === null || theory.intro.length === 0 || theory.complexity.length === 0) missing.push(entry.id);
    }
    expect(missing).toEqual([]);
  });

  it('у каждого алгоритма есть тест из корректных вопросов', async () => {
    const problems: string[] = [];
    for (const entry of algorithms) {
      const quiz = await loadQuiz(entry.category, entry.id);
      if (quiz.length < 5) problems.push(`${entry.id}: вопросов ${quiz.length}`);
      if (new Set(quiz.map((question) => question.q)).size !== quiz.length) problems.push(`${entry.id}: повторяются вопросы`);
      quiz.forEach((question, index) => {
        const where = `${entry.id} #${index + 1}`;
        if (question.options.length < 3) problems.push(`${where}: мало вариантов`);
        if (new Set(question.options).size !== question.options.length) problems.push(`${where}: повторяются варианты`);
        if (!Number.isInteger(question.answer) || question.answer < 0 || question.answer >= question.options.length)
          problems.push(`${where}: неверный индекс ответа`);
        if (question.explain.trim() === '' || question.q.trim() === '') problems.push(`${where}: пустой текст`);
      });
    }
    expect(problems).toEqual([]);
  });

  it('у каждого алгоритма есть демонстрация', () => {
    expect(algorithms.filter((entry) => demoRegistry[entry.id] === undefined).map((entry) => entry.id)).toEqual([]);
    expect(algorithms).toHaveLength(54);
  });

  it('пути и идентификаторы уникальны', () => {
    expect(new Set(algorithms.map((entry) => entry.id)).size).toBe(algorithms.length);
    expect(new Set(algorithms.map((entry) => entry.path)).size).toBe(algorithms.length);
  });
});
