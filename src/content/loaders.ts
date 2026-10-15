import type { CategoryId } from '@/content/catalog';
import type { AlgorithmTheory } from '@/types';
import type { QuizQuestion } from '@/types/quiz';

type TheoryModule = { readonly default: Record<string, AlgorithmTheory> };
type QuizModule = { readonly default: Record<string, readonly QuizQuestion[]> };

// теория и тесты грузятся по разделам, отдельными файлами — главная страница их не тянет
const theoryLoaders: Record<CategoryId, () => Promise<TheoryModule>> = {
  linear: () => import('./theory/linear'),
  search: () => import('./theory/search'),
  sorting: () => import('./theory/sorting'),
  hashing: () => import('./theory/hashing'),
  trees: () => import('./theory/trees'),
  heaps: () => import('./theory/heaps'),
  graphs: () => import('./theory/graphs'),
  dp: () => import('./theory/dp'),
  strings: () => import('./theory/strings'),
};

const quizLoaders: Record<CategoryId, () => Promise<QuizModule>> = {
  linear: () => import('./quizzes/linear'),
  search: () => import('./quizzes/search'),
  sorting: () => import('./quizzes/sorting'),
  hashing: () => import('./quizzes/hashing'),
  trees: () => import('./quizzes/trees'),
  heaps: () => import('./quizzes/heaps'),
  graphs: () => import('./quizzes/graphs'),
  dp: () => import('./quizzes/dp'),
  strings: () => import('./quizzes/strings'),
};

export const loadTheory = async (category: CategoryId, id: string): Promise<AlgorithmTheory | null> => (await theoryLoaders[category]()).default[id] ?? null;

export const loadQuiz = async (category: CategoryId, id: string): Promise<readonly QuizQuestion[]> => (await quizLoaders[category]()).default[id] ?? [];
