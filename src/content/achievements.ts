import {
  BadgeCheck,
  Bookmark,
  CalendarCheck,
  Cat,
  ScrollText,
  BookOpen,
  ChartNoAxesColumnIncreasing,
  Compass,
  Crown,
  FlaskConical,
  Flame,
  Grid3x3,
  ListTree,
  Medal,
  MoonStar,
  Play,
  Presentation,
  Target,
  Trophy,
  Waypoints,
  type LucideIcon,
} from 'lucide-react';
import { catalog, categories, type CategoryId, type ColorName } from '@/content/catalog';
import { completedQuestDays, questBonusXp } from '@/content/quests';
import { isMastered, longestStreak, progressXp } from '@/lib/progress';
import type { UserData } from '@/lib/userData';

export interface Achievement {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: LucideIcon;
  readonly color: ColorName;
  readonly xp: number;
  readonly check: (data: UserData) => boolean;
}

const demosIn = (data: UserData, category: CategoryId): boolean =>
  catalog.filter((entry) => entry.category === category).every((entry) => data.progress[entry.id]?.demoAt !== undefined);

const count = (predicate: (id: string) => boolean): number => catalog.filter((entry) => predicate(entry.id)).length;

export const achievements: readonly Achievement[] = [
  {
    id: 'first-demo',
    title: 'Первый запуск',
    description: 'Досмотреть любую демонстрацию до конца',
    icon: Play,
    color: 'green',
    xp: 10,
    check: (data) => count((id) => data.progress[id]?.demoAt !== undefined) >= 1,
  },
  {
    id: 'first-quiz',
    title: 'Зачёт',
    description: 'Сдать первый тест',
    icon: BadgeCheck,
    color: 'brand',
    xp: 10,
    check: (data) => count((id) => data.progress[id]?.quizAt !== undefined) >= 1,
  },
  {
    id: 'perfect-quiz',
    title: 'Без единой ошибки',
    description: 'Ответить верно на все вопросы теста',
    icon: Target,
    color: 'yellow',
    xp: 20,
    check: (data) => count((id) => (data.progress[id]?.quizBest ?? 0) >= 1) >= 1,
  },
  {
    id: 'theorist',
    title: 'Теоретик',
    description: 'Прочитать теорию десяти алгоритмов',
    icon: BookOpen,
    color: 'purple',
    xp: 30,
    check: (data) => count((id) => data.progress[id]?.theoryAt !== undefined) >= 10,
  },
  {
    id: 'own-data',
    title: 'Исследователь',
    description: 'Запустить пять алгоритмов на своих данных',
    icon: FlaskConical,
    color: 'teal',
    xp: 20,
    check: (data) => count((id) => data.progress[id]?.customInput === true) >= 5,
  },
  {
    id: 'collector',
    title: 'Коллекционер',
    description: 'Сохранить три набора данных',
    icon: Bookmark,
    color: 'pink',
    xp: 10,
    check: (data) => data.presets.length >= 3,
  },
  {
    id: 'streak-3',
    title: 'Три дня подряд',
    description: 'Заниматься три дня без перерыва',
    icon: Flame,
    color: 'orange',
    xp: 20,
    check: (data) => longestStreak(data.activity) >= 3,
  },
  {
    id: 'streak-7',
    title: 'Неделя практики',
    description: 'Заниматься семь дней подряд',
    icon: Flame,
    color: 'red',
    xp: 50,
    check: (data) => longestStreak(data.activity) >= 7,
  },
  {
    id: 'streak-30',
    title: 'Железная привычка',
    description: 'Заниматься тридцать дней подряд',
    icon: Crown,
    color: 'yellow',
    xp: 150,
    check: (data) => longestStreak(data.activity) >= 30,
  },
  {
    id: 'explorer',
    title: 'Путешественник',
    description: 'Пройти демонстрацию в каждом разделе',
    icon: Compass,
    color: 'teal',
    xp: 40,
    check: (data) => categories.every((category) => catalog.some((entry) => entry.category === category.id && data.progress[entry.id]?.demoAt !== undefined)),
  },
  {
    id: 'sorting-master',
    title: 'Повелитель сортировок',
    description: 'Пройти все демонстрации раздела «Сортировка»',
    icon: ChartNoAxesColumnIncreasing,
    color: 'orange',
    xp: 50,
    check: (data) => demosIn(data, 'sorting'),
  },
  {
    id: 'tree-master',
    title: 'Садовник',
    description: 'Пройти все демонстрации раздела «Деревья»',
    icon: ListTree,
    color: 'green',
    xp: 50,
    check: (data) => demosIn(data, 'trees'),
  },
  {
    id: 'graph-master',
    title: 'Картограф',
    description: 'Пройти все демонстрации раздела «Графы»',
    icon: Waypoints,
    color: 'brand',
    xp: 50,
    check: (data) => demosIn(data, 'graphs'),
  },
  {
    id: 'dp-master',
    title: 'Мастер таблиц',
    description: 'Пройти все демонстрации динамического программирования',
    icon: Grid3x3,
    color: 'cyan',
    xp: 50,
    check: (data) => demosIn(data, 'dp'),
  },
  {
    id: 'marathon',
    title: 'Марафонец',
    description: 'Пройти 25 демонстраций',
    icon: Medal,
    color: 'brand',
    xp: 60,
    check: (data) => count((id) => data.progress[id]?.demoAt !== undefined) >= 25,
  },
  {
    id: 'night-owl',
    title: 'Полуночник',
    description: 'Заниматься после полуночи',
    icon: MoonStar,
    color: 'purple',
    xp: 10,
    check: (data) => data.flags['night-owl'] === true,
  },
  {
    id: 'lecturer',
    title: 'Лектор',
    description: 'Включить режим лекции',
    icon: Presentation,
    color: 'pink',
    xp: 10,
    check: (data) => data.flags['lecture-mode'] === true,
  },
  {
    id: 'cat-friend',
    title: 'Друг Кэша',
    description: 'Погладить кота-маскота десять раз',
    icon: Cat,
    color: 'brand',
    xp: 10,
    check: (data) => (data.counters.pets ?? 0) >= 10,
  },
  {
    id: 'quests-1',
    title: 'Миссия выполнена',
    description: 'Закрыть все три миссии дня',
    icon: ScrollText,
    color: 'lime',
    xp: 20,
    check: (data) => completedQuestDays(data) >= 1,
  },
  {
    id: 'quests-7',
    title: 'Охотник за миссиями',
    description: 'Закрыть все миссии в семи разных днях',
    icon: CalendarCheck,
    color: 'cyan',
    xp: 60,
    check: (data) => completedQuestDays(data) >= 7,
  },
  {
    id: 'mastery',
    title: 'Гроссмейстер',
    description: 'Полностью освоить все алгоритмы: теория, демонстрация и тест',
    icon: Trophy,
    color: 'yellow',
    xp: 300,
    check: (data) => catalog.every((entry) => isMastered(data.progress[entry.id])),
  },
];

export const achievementById = new Map(achievements.map((achievement) => [achievement.id, achievement]));

export const achievementsXp = (data: UserData): number => Object.keys(data.achievements).reduce((sum, id) => sum + (achievementById.get(id)?.xp ?? 0), 0);

/** Достижения, условия которых выполнены, но которые ещё не записаны. */
export const findNewAchievements = (data: UserData): readonly Achievement[] =>
  achievements.filter((achievement) => data.achievements[achievement.id] === undefined && achievement.check(data));

export const totalXp = (data: UserData): number =>
  catalog.reduce((sum, entry) => sum + progressXp(data.progress[entry.id]), 0) + achievementsXp(data) + questBonusXp(data);
