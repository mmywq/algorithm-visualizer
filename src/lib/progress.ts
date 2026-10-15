import { catalog, type CategoryId } from '@/content/catalog';
import { dayKey, type AlgoProgress, type UserData } from './userData';

export const XP = {
  theory: 10,
  demo: 20,
  quiz: 30,
  quizPerfect: 10,
} as const;

export const QUIZ_PASS_SCORE = 0.7;

export const progressXp = (progress: AlgoProgress | undefined): number => {
  if (progress === undefined) return 0;
  let xp = 0;
  if (progress.theoryAt !== undefined) xp += XP.theory;
  if (progress.demoAt !== undefined) xp += XP.demo;
  if (progress.quizAt !== undefined) xp += XP.quiz;
  if ((progress.quizBest ?? 0) >= 1) xp += XP.quizPerfect;
  return xp;
};

/** Доля пройденных этапов алгоритма: теория, демонстрация, тест. */
export const progressShare = (progress: AlgoProgress | undefined): number => {
  if (progress === undefined) return 0;
  return ((progress.theoryAt !== undefined ? 1 : 0) + (progress.demoAt !== undefined ? 1 : 0) + (progress.quizAt !== undefined ? 1 : 0)) / 3;
};

export const isMastered = (progress: AlgoProgress | undefined): boolean => progressShare(progress) === 1;

export const isStarted = (progress: AlgoProgress | undefined): boolean =>
  progress !== undefined && (progress.theoryAt !== undefined || progress.demoAt !== undefined || progress.quizAt !== undefined || (progress.demoRuns ?? 0) > 0);

export interface LevelInfo {
  readonly level: number;
  readonly xp: number;
  readonly levelStartXp: number;
  readonly nextLevelXp: number;
  readonly progress: number;
}

/** Порог уровня n — треугольное число: 0, 50, 150, 300, 500, 750… */
/** Сколько XP нужно набрать всего, чтобы достичь уровня. */
export const levelThreshold = (level: number): number => 25 * (level - 1) * level;

export const levelFromXp = (xp: number): LevelInfo => {
  let level = 1;
  while (levelThreshold(level + 1) <= xp) level += 1;
  const levelStartXp = levelThreshold(level);
  const nextLevelXp = levelThreshold(level + 1);
  return { level, xp, levelStartXp, nextLevelXp, progress: (xp - levelStartXp) / (nextLevelXp - levelStartXp) };
};

/** Серия дней подряд с учебной активностью. Сегодняшний день без активности серию не обрывает. */
export const computeStreak = (activity: Readonly<Record<string, number>>, today: Date = new Date()): number => {
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if ((activity[dayKey(cursor)] ?? 0) === 0) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while ((activity[dayKey(cursor)] ?? 0) > 0) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

export const longestStreak = (activity: Readonly<Record<string, number>>): number => {
  const days = Object.keys(activity)
    .filter((day) => (activity[day] ?? 0) > 0)
    .sort();
  let best = 0;
  let current = 0;
  let previous: Date | null = null;
  for (const day of days) {
    const [y, m, d] = day.split('-').map(Number);
    const date = new Date(y!, (m ?? 1) - 1, d);
    if (previous !== null && Math.round((date.getTime() - previous.getTime()) / 86_400_000) === 1) current += 1;
    else current = 1;
    best = Math.max(best, current);
    previous = date;
  }
  return best;
};

export interface CategoryStats {
  readonly total: number;
  readonly started: number;
  readonly mastered: number;
  readonly share: number;
}

export const categoryStats = (data: UserData, categoryId: CategoryId): CategoryStats => {
  const entries = catalog.filter((entry) => entry.category === categoryId);
  let started = 0;
  let mastered = 0;
  let shareSum = 0;
  for (const entry of entries) {
    const progress = data.progress[entry.id];
    if (isStarted(progress)) started += 1;
    if (isMastered(progress)) mastered += 1;
    shareSum += progressShare(progress);
  }
  return { total: entries.length, started, mastered, share: entries.length === 0 ? 0 : shareSum / entries.length };
};

export const overallStats = (data: UserData) => {
  let demos = 0;
  let theories = 0;
  let quizzes = 0;
  let mastered = 0;
  for (const entry of catalog) {
    const progress = data.progress[entry.id];
    if (progress?.demoAt !== undefined) demos += 1;
    if (progress?.theoryAt !== undefined) theories += 1;
    if (progress?.quizAt !== undefined) quizzes += 1;
    if (isMastered(progress)) mastered += 1;
  }
  return { demos, theories, quizzes, mastered, total: catalog.length };
};

export const pluralize = (count: number, one: string, few: string, many: string): string => {
  const mod100 = Math.abs(count) % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  const mod10 = mod100 % 10;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
};
