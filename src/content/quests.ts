import { dayKey, type DayStats, type UserData } from '@/lib/userData';

/** Миссии дня: каждый день — три задания из набора, выбор зависит только от даты. */

export interface Quest {
  readonly id: string;
  readonly title: string;
  readonly target: number;
  readonly metric: keyof DayStats;
}

const POOL: readonly Quest[] = [
  { id: 'demo-1', title: 'Досмотреть демонстрацию до конца', target: 1, metric: 'demo' },
  { id: 'demo-3', title: 'Пройти три демонстрации', target: 3, metric: 'demo' },
  { id: 'quiz-1', title: 'Сдать тест', target: 1, metric: 'quiz' },
  { id: 'quiz-2', title: 'Сдать два теста', target: 2, metric: 'quiz' },
  { id: 'theory-1', title: 'Дочитать теорию до конца', target: 1, metric: 'theory' },
  { id: 'theory-2', title: 'Изучить теорию двух алгоритмов', target: 2, metric: 'theory' },
  { id: 'custom-1', title: 'Запустить алгоритм на своих данных', target: 1, metric: 'custom' },
  { id: 'fresh-1', title: 'Открыть алгоритм, который ещё не пробовали', target: 1, metric: 'fresh' },
];

export const QUEST_DAY_BONUS = 30;

const hash = (text: string): number => {
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
};

/** Три разных миссии на день: одна про демонстрации, остальные — из всего набора. */
export const questsForDay = (day: string): readonly Quest[] => {
  const seed = hash(day);
  const demos = POOL.filter((quest) => quest.metric === 'demo');
  const first = demos[seed % demos.length]!;
  const rest = POOL.filter((quest) => quest.metric !== 'demo');
  const second = rest[(seed >>> 8) % rest.length]!;
  const remaining = rest.filter((quest) => quest.metric !== second.metric);
  const third = remaining[(seed >>> 16) % remaining.length]!;
  return [first, second, third];
};

export interface QuestState extends Quest {
  readonly value: number;
  readonly done: boolean;
}

export const questStates = (data: UserData, day: string = dayKey()): readonly QuestState[] => {
  const stats = data.days[day] ?? {};
  return questsForDay(day).map((quest) => {
    const value = stats[quest.metric] ?? 0;
    return { ...quest, value: Math.min(value, quest.target), done: value >= quest.target };
  });
};

export const isQuestDayComplete = (data: UserData, day: string): boolean => questStates(data, day).every((quest) => quest.done);

/** Бонус за дни, в которые выполнены все три миссии. Вычисляется, а не хранится. */
export const questBonusXp = (data: UserData): number => Object.keys(data.days).filter((day) => isQuestDayComplete(data, day)).length * QUEST_DAY_BONUS;

export const completedQuestDays = (data: UserData): number => Object.keys(data.days).filter((day) => isQuestDayComplete(data, day)).length;
