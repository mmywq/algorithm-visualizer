/**
 * Демо-класс для просмотра инструментов преподавателя без облака.
 * Студенты вымышленные; сроки и даты считаются от текущего момента, поэтому
 * в таблице всегда есть все статусы: сдано в срок, с опозданием, просрочено, в процессе.
 */
import type { Assignment, ClassInfo, MemberProgress } from '@/lib/classes';
import type { AlgoProgress } from '@/lib/userData';

const DAY = 24 * 60 * 60 * 1000;

export const DEMO_CLASS_ID = 'demo';

interface Plan {
  readonly name: string;
  /** по алгоритмам: за сколько дней до «сейчас» пройден каждый этап (null — не пройден) и лучший результат теста */
  readonly steps: Readonly<Record<string, readonly [theory: number | null, demo: number | null, quiz: number | null, best?: number]>>;
}

const LAB1 = ['bubble-sort', 'insertion-sort', 'selection-sort'];
const LAB2 = ['merge-sort', 'quick-sort', 'heap-sort'];
const HOME = ['graph-traversal', 'dijkstra'];

const done = (days: number, best = 0.8) => [days + 1, days, days, best] as const;

const plans: readonly Plan[] = [
  {
    name: 'Алина Б.',
    steps: {
      ...Object.fromEntries(LAB1.map((id, i) => [id, done(12 - i, 1)])),
      ...Object.fromEntries(LAB2.map((id, i) => [id, done(4 - i, 0.9)])),
      ...Object.fromEntries(HOME.map((id) => [id, done(1, 1)])),
    },
  },
  {
    name: 'Богдан В.',
    steps: {
      ...Object.fromEntries(LAB1.map((id, i) => [id, done(10 - i)])),
      ...Object.fromEntries(LAB2.map((id) => [id, done(2, 0.7)])),
      'graph-traversal': [1, null, null],
    },
  },
  {
    name: 'Вера Г.',
    steps: {
      'bubble-sort': done(9),
      'insertion-sort': done(8),
      'selection-sort': done(4, 0.7),
      'merge-sort': done(1),
      'quick-sort': done(1, 0.9),
      'heap-sort': [1, 1, null],
    },
  },
  {
    name: 'Глеб Д.',
    steps: {
      'bubble-sort': done(11, 0.7),
      'insertion-sort': done(10, 0.7),
      'selection-sort': [9, 9, null],
    },
  },
  {
    name: 'Дарья Е.',
    steps: {
      ...Object.fromEntries(LAB1.map((id) => [id, done(13, 1)])),
      ...Object.fromEntries(LAB2.map((id) => [id, done(5, 1)])),
      ...Object.fromEntries(HOME.map((id) => [id, done(3, 0.9)])),
    },
  },
  {
    name: 'Егор Ж.',
    steps: {
      ...Object.fromEntries(LAB1.map((id) => [id, done(8, 0.8)])),
      'merge-sort': [null, 2, null],
    },
  },
  {
    name: 'Злата И.',
    steps: {
      'bubble-sort': done(5, 0.8),
      'insertion-sort': done(4, 0.7),
      'selection-sort': done(3, 0.7),
    },
  },
  { name: 'Илья К.', steps: {} },
];

export interface DemoClass {
  readonly info: ClassInfo;
  readonly assignments: readonly Assignment[];
  readonly members: readonly MemberProgress[];
}

export const buildDemoClass = (now: number = Date.now()): DemoClass => {
  const at = (daysAgo: number): string => new Date(now - daysAgo * DAY).toISOString();
  // срок — конец дня: так задание «до 20 октября» можно сдать весь день 20-го
  const dueIn = (days: number): string => {
    const date = new Date(now + days * DAY);
    date.setHours(23, 59, 0, 0);
    return date.toISOString();
  };

  const info: ClassInfo = {
    id: DEMO_CLASS_ID,
    name: 'АиСД · группа ИВТ-21',
    joinCode: 'DEMO42',
    ownerId: 'demo',
    createdAt: at(30),
    isOwner: true,
  };

  const assignments: Assignment[] = [
    { id: 'demo-home', classId: DEMO_CLASS_ID, title: 'Домашнее задание — графы', algorithmIds: HOME, dueAt: dueIn(9), createdAt: at(2) },
    { id: 'demo-lab2', classId: DEMO_CLASS_ID, title: 'Лабораторная 2 — быстрые сортировки', algorithmIds: LAB2, dueAt: dueIn(2), createdAt: at(7) },
    { id: 'demo-lab1', classId: DEMO_CLASS_ID, title: 'Лабораторная 1 — простые сортировки', algorithmIds: LAB1, dueAt: dueIn(-6), createdAt: at(16) },
  ];

  const members: MemberProgress[] = plans.map((plan, index) => {
    const progress: Record<string, AlgoProgress> = {};
    let latest: number | null = null;
    for (const [id, [theory, demo, quiz, best]] of Object.entries(plan.steps)) {
      const stages = [theory, demo, quiz].filter((days): days is number => days !== null);
      if (stages.length > 0) latest = Math.min(latest ?? Infinity, ...stages);
      progress[id] = {
        ...(theory === null ? {} : { theoryAt: at(theory) }),
        ...(demo === null ? {} : { demoAt: at(demo), demoRuns: 2 }),
        ...(quiz === null ? {} : { quizAt: at(quiz), quizBest: best ?? 0.8 }),
      };
    }
    return { userId: `demo-${index}`, displayName: plan.name, progress, updatedAt: latest === null ? null : at(latest) };
  });

  return { info, assignments, members };
};
