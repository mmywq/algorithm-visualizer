import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { findNewAchievements, totalXp, type Achievement } from '@/content/achievements';
import { migrateLegacyPresets } from '@/lib/legacyMigration';
import { isStarted, levelFromXp, QUIZ_PASS_SCORE } from '@/lib/progress';
import {
  createEmptyUserData,
  dayKey,
  MAX_HISTORY,
  MAX_PRESETS,
  normalizeUserData,
  type AlgoProgress,
  type DayStats,
  type OutfitSlot,
  type Preset,
  type PresetKind,
  type Profile,
  type UserData,
} from '@/lib/userData';

interface XpGain {
  readonly amount: number;
  readonly at: number;
}

interface UserState {
  readonly data: UserData;
  /** достижения, о которых ещё не показали уведомление (не сохраняется) */
  readonly unlocked: readonly Achievement[];
  readonly lastGain: XpGain | null;
  /** новый уровень, о котором ещё не рассказали (не сохраняется) */
  readonly levelUp: number | null;

  readonly visit: (id: string) => void;
  readonly markTheory: (id: string) => void;
  readonly markDemo: (id: string) => void;
  readonly recordQuiz: (id: string, score: number) => void;
  readonly markCustomInput: (id: string) => void;
  readonly toggleFavorite: (id: string) => void;
  readonly setProfile: (profile: Partial<Profile>) => void;
  readonly setFlag: (flag: string) => void;
  readonly savePreset: (kind: PresetKind, name: string, value: unknown) => Preset;
  readonly renamePreset: (id: string, name: string) => void;
  readonly removePreset: (id: string) => void;
  readonly replaceData: (data: UserData) => void;
  readonly resetData: () => void;
  readonly consumeUnlocked: () => readonly Achievement[];
  readonly petCat: () => void;
  /** надеть вещь на кота (id) или снять (null) */
  readonly wear: (slot: OutfitSlot, itemId: string | null) => void;
  readonly dismissLevelUp: () => void;
}

const nowIso = (): string => new Date().toISOString();

const withProgress = (data: UserData, id: string, update: (current: AlgoProgress) => AlgoProgress): UserData => ({
  ...data,
  progress: { ...data.progress, [id]: update(data.progress[id] ?? {}) },
});

/** Учебное действие: отмечается в календаре и в статистике дня, ночью — ещё и флаг «Полуночник». */
const logActivity = (data: UserData, metric?: keyof DayStats): UserData => {
  const today = dayKey();
  const hour = new Date().getHours();
  const stats = data.days[today] ?? {};
  return {
    ...data,
    activity: { ...data.activity, [today]: (data.activity[today] ?? 0) + 1 },
    days: metric === undefined ? data.days : { ...data.days, [today]: { ...stats, [metric]: (stats[metric] ?? 0) + 1 } },
    flags: hour < 5 ? { ...data.flags, 'night-owl': true } : data.flags,
  };
};

const bumpDay = (data: UserData, metric: keyof DayStats): UserData => {
  const today = dayKey();
  const stats = data.days[today] ?? {};
  return { ...data, days: { ...data.days, [today]: { ...stats, [metric]: (stats[metric] ?? 0) + 1 } } };
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => {
      /** Применяет изменение, фиксирует время, проверяет достижения и прирост опыта. */
      const commit = (next: UserData, options: { activity?: keyof DayStats | true } = {}): void => {
        const before = get().data;
        const logged = options.activity === undefined ? next : logActivity(next, options.activity === true ? undefined : options.activity);
        let data: UserData = { ...logged, updatedAt: nowIso() };
        const fresh = findNewAchievements(data);
        if (fresh.length > 0) {
          const stamp = nowIso();
          data = { ...data, achievements: { ...data.achievements, ...Object.fromEntries(fresh.map((item) => [item.id, stamp])) } };
        }
        const xpBefore = totalXp(before);
        const xpAfter = totalXp(data);
        const gained = xpAfter - xpBefore;
        const levelBefore = levelFromXp(xpBefore).level;
        const levelAfter = levelFromXp(xpAfter).level;
        set({
          data,
          unlocked: fresh.length > 0 ? [...get().unlocked, ...fresh] : get().unlocked,
          lastGain: gained > 0 ? { amount: gained, at: Date.now() } : get().lastGain,
          levelUp: levelAfter > levelBefore ? levelAfter : get().levelUp,
        });
      };

      return {
        data: createEmptyUserData(),
        unlocked: [],
        lastGain: null,
        levelUp: null,

        visit: (id) => {
          const data = get().data;
          const at = nowIso();
          const fresh = !isStarted(data.progress[id]) && data.progress[id]?.lastVisitAt === undefined;
          const visited: UserData = {
            ...withProgress(data, id, (current) => ({ ...current, lastVisitAt: at })),
            history: [{ id, at }, ...data.history.filter((item) => item.id !== id)].slice(0, MAX_HISTORY),
          };
          commit(fresh ? bumpDay(visited, 'fresh') : visited);
        },

        markTheory: (id) => {
          if (get().data.progress[id]?.theoryAt !== undefined) return;
          commit(
            withProgress(get().data, id, (current) => ({ ...current, theoryAt: nowIso() })),
            { activity: 'theory' },
          );
        },

        markDemo: (id) => {
          commit(
            withProgress(get().data, id, (current) => ({
              ...current,
              demoAt: current.demoAt ?? nowIso(),
              demoRuns: (current.demoRuns ?? 0) + 1,
            })),
            { activity: 'demo' },
          );
        },

        recordQuiz: (id, score) => {
          commit(
            withProgress(get().data, id, (current) => ({
              ...current,
              quizBest: Math.max(current.quizBest ?? 0, score),
              ...(score >= QUIZ_PASS_SCORE && current.quizAt === undefined ? { quizAt: nowIso() } : {}),
            })),
            score >= QUIZ_PASS_SCORE ? { activity: 'quiz' } : { activity: true },
          );
        },

        markCustomInput: (id) => {
          const today = dayKey();
          const data = get().data;
          // для миссии дня засчитываем первое применение своих данных за день
          const countedToday = (data.days[today]?.custom ?? 0) > 0;
          if (data.progress[id]?.customInput === true && countedToday) return;
          const next = withProgress(data, id, (current) => ({ ...current, customInput: true }));
          commit(countedToday ? next : bumpDay(next, 'custom'));
        },

        toggleFavorite: (id) => {
          const data = get().data;
          const favorites = data.favorites.includes(id) ? data.favorites.filter((item) => item !== id) : [id, ...data.favorites];
          commit({ ...data, favorites });
        },

        setProfile: (profile) => {
          const data = get().data;
          commit({ ...data, profile: { ...data.profile, ...profile } });
        },

        setFlag: (flag) => {
          const data = get().data;
          if (data.flags[flag] === true) return;
          commit({ ...data, flags: { ...data.flags, [flag]: true } });
        },

        savePreset: (kind, name, value) => {
          const data = get().data;
          const stamp = nowIso();
          const preset: Preset = {
            id: `${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
            kind,
            name:
              name.trim().length > 0
                ? name.trim().slice(0, 60)
                : `Набор от ${new Date().toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
            value,
            createdAt: stamp,
            updatedAt: stamp,
          };
          commit({ ...data, presets: [preset, ...data.presets].slice(0, MAX_PRESETS) });
          return preset;
        },

        renamePreset: (id, name) => {
          const trimmed = name.trim();
          if (trimmed.length === 0) return;
          const data = get().data;
          commit({
            ...data,
            presets: data.presets.map((preset) => (preset.id === id ? { ...preset, name: trimmed.slice(0, 60), updatedAt: nowIso() } : preset)),
          });
        },

        removePreset: (id) => {
          const data = get().data;
          commit({ ...data, presets: data.presets.filter((preset) => preset.id !== id) });
        },

        replaceData: (data) => {
          set({ data: normalizeUserData(data) });
        },

        resetData: () => set({ data: { ...createEmptyUserData(), updatedAt: nowIso() }, unlocked: [], lastGain: null, levelUp: null }),

        petCat: () => {
          const data = get().data;
          commit({ ...data, counters: { ...data.counters, pets: (data.counters.pets ?? 0) + 1 } });
        },

        wear: (slot, itemId) => {
          const data = get().data;
          const outfit: Partial<Record<OutfitSlot, string>> = { ...data.profile.outfit };
          if (itemId === null) delete outfit[slot];
          else outfit[slot] = itemId;
          commit({ ...data, profile: { ...data.profile, outfit } });
        },

        dismissLevelUp: () => set({ levelUp: null }),

        consumeUnlocked: () => {
          const pending = get().unlocked;
          if (pending.length > 0) set({ unlocked: [] });
          return pending;
        },
      };
    },
    {
      name: 'algoscope:user',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ data: state.data }),
      // восстановление не должно падать: при ошибке переноса старых наборов
      // сохраняем то, что прочитали, а не начинаем с пустого прогресса
      merge: (persisted, current) => {
        const stored = (persisted as { data?: Partial<UserData> } | undefined)?.data;
        const base = stored === undefined ? createEmptyUserData() : normalizeUserData(stored);
        try {
          return { ...current, data: migrateLegacyPresets(base) };
        } catch {
          return { ...current, data: base };
        }
      },
    },
  ),
);

export const useProgress = (id: string): AlgoProgress | undefined => useUserStore((state) => state.data.progress[id]);
