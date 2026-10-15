/**
 * Данные пользователя: прогресс, избранное, история, наборы данных.
 * Модуль чистый (без React и хранилищ) — его используют локальное
 * хранилище, синхронизация с облаком и тесты.
 */

export type Role = 'student' | 'teacher';

export type OutfitSlot = 'head' | 'face' | 'neck';

/** Что надето на кота: по одной вещи на слот; id вещи из гардероба. */
export type Outfit = Readonly<Partial<Record<OutfitSlot, string>>>;

export interface Profile {
  readonly name: string;
  readonly role: Role | null;
  readonly avatar: number;
  readonly outfit: Outfit;
}

export interface AlgoProgress {
  readonly theoryAt?: string;
  readonly demoAt?: string;
  readonly demoRuns?: number;
  readonly quizBest?: number;
  readonly quizAt?: string;
  readonly lastVisitAt?: string;
  readonly customInput?: boolean;
}

export type PresetKind = 'numbers' | 'graph' | 'text' | 'grid';

export interface Preset {
  readonly id: string;
  readonly kind: PresetKind;
  readonly name: string;
  readonly value: unknown;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Учебные действия за один день — для миссий дня и календаря активности. */
export interface DayStats {
  readonly demo?: number;
  readonly theory?: number;
  readonly quiz?: number;
  readonly custom?: number;
  readonly fresh?: number;
}

export interface HistoryItem {
  readonly id: string;
  readonly at: string;
}

export interface UserData {
  readonly version: 1;
  readonly profile: Profile;
  readonly progress: Readonly<Record<string, AlgoProgress>>;
  readonly favorites: readonly string[];
  readonly history: readonly HistoryItem[];
  /** число учебных действий по дням (YYYY-MM-DD) — для серии и тепловой карты */
  readonly activity: Readonly<Record<string, number>>;
  readonly days: Readonly<Record<string, DayStats>>;
  /** счётчики «для души»: сколько раз погладили кота и т. п. */
  readonly counters: Readonly<Record<string, number>>;
  readonly achievements: Readonly<Record<string, string>>;
  readonly presets: readonly Preset[];
  readonly flags: Readonly<Record<string, boolean>>;
  readonly updatedAt: string;
}

export const MAX_HISTORY = 30;
export const MAX_PRESETS = 60;

export const createEmptyUserData = (): UserData => ({
  version: 1,
  profile: { name: '', role: null, avatar: 0, outfit: {} },
  progress: {},
  favorites: [],
  history: [],
  activity: {},
  days: {},
  counters: {},
  achievements: {},
  presets: [],
  flags: {},
  updatedAt: new Date(0).toISOString(),
});

export const dayKey = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const minIso = (a?: string, b?: string): string | undefined => {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return a < b ? a : b;
};

const maxIso = (a?: string, b?: string): string | undefined => {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return a > b ? a : b;
};

const maxNum = (a?: number, b?: number): number | undefined => {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return Math.max(a, b);
};

const compact = <T extends object>(value: T): T => Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;

export const mergeProgress = (a: AlgoProgress = {}, b: AlgoProgress = {}): AlgoProgress =>
  compact<Record<string, unknown>>({
    theoryAt: minIso(a.theoryAt, b.theoryAt),
    demoAt: minIso(a.demoAt, b.demoAt),
    demoRuns: maxNum(a.demoRuns, b.demoRuns),
    quizBest: maxNum(a.quizBest, b.quizBest),
    quizAt: minIso(a.quizAt, b.quizAt),
    lastVisitAt: maxIso(a.lastVisitAt, b.lastVisitAt),
    customInput: a.customInput === true || b.customInput === true ? true : undefined,
  }) as AlgoProgress;

/**
 * Слияние двух копий данных (локальной и облачной). Операция коммутативна
 * для прогресса: «первые» даты берутся минимальными, счётчики — максимальными,
 * поэтому повторная синхронизация не задваивает результаты.
 */
export const mergeUserData = (local: UserData, remote: UserData): UserData => {
  const progressIds = new Set([...Object.keys(local.progress), ...Object.keys(remote.progress)]);
  const progress: Record<string, AlgoProgress> = {};
  for (const id of progressIds) progress[id] = mergeProgress(local.progress[id], remote.progress[id]);

  const activity: Record<string, number> = { ...remote.activity };
  for (const [day, count] of Object.entries(local.activity)) activity[day] = Math.max(activity[day] ?? 0, count);

  const days: Record<string, DayStats> = { ...remote.days };
  for (const [day, stats] of Object.entries(local.days)) {
    const other = days[day] ?? {};
    days[day] = compact<Record<string, unknown>>({
      demo: maxNum(stats.demo, other.demo),
      theory: maxNum(stats.theory, other.theory),
      quiz: maxNum(stats.quiz, other.quiz),
      custom: maxNum(stats.custom, other.custom),
      fresh: maxNum(stats.fresh, other.fresh),
    }) as DayStats;
  }

  const counters: Record<string, number> = { ...remote.counters };
  for (const [key, value] of Object.entries(local.counters)) counters[key] = Math.max(counters[key] ?? 0, value);

  const achievements: Record<string, string> = { ...remote.achievements };
  for (const [id, at] of Object.entries(local.achievements)) achievements[id] = minIso(achievements[id], at) ?? at;

  const historyById = new Map<string, string>();
  for (const item of [...local.history, ...remote.history]) {
    historyById.set(item.id, maxIso(historyById.get(item.id), item.at) ?? item.at);
  }
  const history = [...historyById.entries()]
    .map(([id, at]) => ({ id, at }))
    .sort((x, y) => (x.at < y.at ? 1 : -1))
    .slice(0, MAX_HISTORY);

  const presetsById = new Map<string, Preset>();
  for (const preset of [...remote.presets, ...local.presets]) {
    const existing = presetsById.get(preset.id);
    if (existing === undefined || existing.updatedAt < preset.updatedAt) presetsById.set(preset.id, preset);
  }
  const presets = [...presetsById.values()].sort((x, y) => (x.updatedAt < y.updatedAt ? 1 : -1)).slice(0, MAX_PRESETS);

  const localNewer = local.updatedAt > remote.updatedAt;
  const profileSource = localNewer ? local.profile : remote.profile;
  const otherProfile = localNewer ? remote.profile : local.profile;

  return {
    version: 1,
    profile: {
      name: profileSource.name.length > 0 ? profileSource.name : otherProfile.name,
      role: profileSource.role ?? otherProfile.role,
      avatar: profileSource.avatar,
      outfit: profileSource.outfit ?? otherProfile.outfit ?? {},
    },
    progress,
    favorites: [...new Set([...local.favorites, ...remote.favorites])],
    history,
    activity,
    days,
    counters,
    achievements,
    presets,
    flags: { ...remote.flags, ...local.flags },
    updatedAt: maxIso(local.updatedAt, remote.updatedAt) ?? local.updatedAt,
  };
};

/** Проверка данных, пришедших извне (облако, импорт файла). */
export const isUserData = (value: unknown): value is UserData => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<UserData>;
  return (
    candidate.version === 1 &&
    typeof candidate.profile === 'object' &&
    typeof candidate.progress === 'object' &&
    Array.isArray(candidate.favorites) &&
    Array.isArray(candidate.history) &&
    typeof candidate.activity === 'object' &&
    typeof candidate.achievements === 'object' &&
    Array.isArray(candidate.presets)
  );
};

/** Приводит частично заполненные данные к полной форме (старые версии, ручной импорт). */
export const normalizeUserData = (value: Partial<UserData>): UserData => {
  const empty = createEmptyUserData();
  return {
    ...empty,
    ...value,
    version: 1,
    profile: { ...empty.profile, ...(value.profile ?? {}) },
    days: value.days ?? {},
    counters: value.counters ?? {},
    flags: value.flags ?? {},
  };
};
