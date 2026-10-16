/**
 * Статус задания для студента и выгрузка сводки класса в таблицу.
 * Модуль чистый (без React и сети): его используют страница класса, демо-класс и тесты.
 */
import type { AlgoProgress } from '@/lib/userData';

/** done — сдано в срок (или срока нет), late — сдано после срока, overdue — срок прошёл, а задание не сдано. */
export type AssignmentState = 'done' | 'late' | 'overdue' | 'progress' | 'idle';

export interface AssignmentStatus {
  readonly state: AssignmentState;
  /** сколько алгоритмов задания пройдено полностью: теория, демонстрация и тест */
  readonly done: number;
  readonly total: number;
  /** когда пройден последний этап последнего алгоритма — момент сдачи */
  readonly completedAt: string | null;
}

export const stateLabels: Readonly<Record<AssignmentState, string>> = {
  done: 'Сдано',
  late: 'Сдано с опозданием',
  overdue: 'Просрочено',
  progress: 'В процессе',
  idle: 'Не начато',
};

const DAY = 24 * 60 * 60 * 1000;

/** Момент, когда алгоритм пройден полностью, — самый поздний из трёх этапов; null, если этап не пройден. */
export const masteredAt = (progress: AlgoProgress | undefined): string | null => {
  if (progress?.theoryAt === undefined || progress.demoAt === undefined || progress.quizAt === undefined) return null;
  return [progress.theoryAt, progress.demoAt, progress.quizAt].reduce((latest, at) => (at > latest ? at : latest));
};

const started = (progress: AlgoProgress | undefined): boolean =>
  progress !== undefined && (progress.theoryAt !== undefined || progress.demoAt !== undefined || progress.quizAt !== undefined || (progress.demoRuns ?? 0) > 0);

export const assignmentStatus = (
  algorithmIds: readonly string[],
  progress: Readonly<Record<string, AlgoProgress>>,
  dueAt: string | null,
  now: number = Date.now(),
): AssignmentStatus => {
  const finished = algorithmIds.map((id) => masteredAt(progress[id]));
  const done = finished.filter((at) => at !== null).length;
  const total = algorithmIds.length;
  const completedAt = total > 0 && done === total ? (finished as string[]).reduce((latest, at) => (at > latest ? at : latest)) : null;
  const due = dueAt === null ? null : Date.parse(dueAt);

  let state: AssignmentState;
  if (completedAt !== null) state = due !== null && Date.parse(completedAt) > due ? 'late' : 'done';
  else if (due !== null && now > due) state = 'overdue';
  else state = algorithmIds.some((id) => started(progress[id])) ? 'progress' : 'idle';
  return { state, done, total, completedAt };
};

const plural = (count: number, one: string, few: string, many: string): string => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
};

/** Подпись срока для студента: «осталось 3 дня», «срок сегодня», «просрочено на 2 дня». Дни считаются по календарю. */
export const dueLabel = (dueAt: string, now: number = Date.now()): { readonly text: string; readonly tone: 'calm' | 'soon' | 'late' } => {
  const startOfDay = (time: number): number => {
    const date = new Date(time);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  };
  const due = Date.parse(dueAt);
  const days = Math.round((startOfDay(due) - startOfDay(now)) / DAY);
  if (now > due) {
    const late = Math.max(1, -days);
    return { text: days >= 0 ? 'срок истёк' : `просрочено на ${late} ${plural(late, 'день', 'дня', 'дней')}`, tone: 'late' };
  }
  if (days === 0) return { text: 'срок сегодня', tone: 'soon' };
  if (days === 1) return { text: 'срок завтра', tone: 'soon' };
  return { text: `осталось ${days} ${plural(days, 'день', 'дня', 'дней')}`, tone: days <= 3 ? 'soon' : 'calm' };
};

// ---------------------------------------------------------------- таблица для Excel

export interface CsvAssignment {
  readonly title: string;
  readonly algorithmIds: readonly string[];
  readonly dueAt: string | null;
}

export interface CsvMember {
  readonly displayName: string;
  readonly progress: Readonly<Record<string, AlgoProgress>>;
  readonly updatedAt: string | null;
}

/**
 * Ячейка CSV. Значения, начинающиеся с =, +, - или @, Excel выполнил бы как формулу,
 * поэтому перед ними ставится апостроф: имя студента не должно стать командой.
 */
const cell = (value: string | number): string => {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** метка порядка байтов: по ней Excel узнаёт кодировку UTF-8 */
export const BOM = String.fromCharCode(0xfeff);

const formatDate = (iso: string | null): string => (iso === null ? '' : new Date(iso).toLocaleDateString('ru-RU'));

/**
 * Сводка класса: строка на студента, по каждому заданию — статус, число пройденных алгоритмов
 * и дата сдачи, по каждому алгоритму — этапы из трёх и лучший результат теста.
 * Разделитель «;» и метка BOM — так файл без настроек открывается в русском Excel.
 */
export const classProgressCsv = (
  assignments: readonly CsvAssignment[],
  members: readonly CsvMember[],
  titleOf: (algorithmId: string) => string,
  now: number = Date.now(),
): string => {
  const algorithmIds = [...new Set(assignments.flatMap((assignment) => assignment.algorithmIds))];
  const header = [
    'Студент',
    ...assignments.flatMap((assignment) => [`${assignment.title}: статус`, `${assignment.title}: алгоритмов`, `${assignment.title}: дата сдачи`]),
    ...algorithmIds.flatMap((id) => [`${titleOf(id)}: этапов из 3`, `${titleOf(id)}: тест, %`]),
    'Последняя синхронизация',
  ];
  const rows = members.map((member) => [
    member.displayName,
    ...assignments.flatMap((assignment) => {
      const status = assignmentStatus(assignment.algorithmIds, member.progress, assignment.dueAt, now);
      return [stateLabels[status.state], `${status.done}/${status.total}`, formatDate(status.completedAt)];
    }),
    ...algorithmIds.flatMap((id) => {
      const progress = member.progress[id];
      const stages = (progress?.theoryAt !== undefined ? 1 : 0) + (progress?.demoAt !== undefined ? 1 : 0) + (progress?.quizAt !== undefined ? 1 : 0);
      return [stages, progress?.quizBest === undefined ? '' : Math.round(progress.quizBest * 100)];
    }),
    formatDate(member.updatedAt),
  ]);
  return `${BOM}${[header, ...rows].map((row) => row.map(cell).join(';')).join('\r\n')}\r\n`;
};
