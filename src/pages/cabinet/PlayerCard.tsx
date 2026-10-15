import { Check, Pencil } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PixelCat } from '@/components/mascot/PixelCat';
import { Avatar, AVATAR_COUNT, avatarColor } from '@/components/ui/Avatar';
import { ProgressBar } from '@/components/ui/Progress';
import { Window } from '@/components/ui/Window';
import { achievements, totalXp } from '@/content/achievements';
import { nextReward } from '@/content/wardrobe';
import { computeStreak, levelFromXp, levelThreshold, longestStreak, overallStats } from '@/lib/progress';
import type { Role } from '@/lib/userData';
import { useUserStore } from '@/stores/userStore';

const roleLabels: Record<Role, string> = { student: 'Учусь', teacher: 'Преподаю' };

/** Карточка игрока: имя, роль, уровень, опыт и главные показатели. */
export function PlayerCard() {
  const data = useUserStore((state) => state.data);
  const setProfile = useUserStore((state) => state.setProfile);
  const xp = useMemo(() => totalXp(data), [data]);
  const level = levelFromXp(xp);
  const reward = nextReward(level.level);
  const stats = overallStats(data);
  const streak = computeStreak(data.activity);
  const best = longestStreak(data.activity);
  const unlocked = achievements.filter((item) => data.achievements[item.id] !== undefined).length;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(data.profile.name);

  const saveName = (): void => {
    setProfile({ name: name.trim().slice(0, 40) });
    setEditing(false);
  };

  const tiles = [
    { label: 'Опыт', value: xp, color: 'yellow' },
    { label: 'Серия дней', value: streak, hint: `рекорд ${best}`, color: 'orange' },
    { label: 'Демонстраций', value: stats.demos, hint: `из ${stats.total}`, color: 'brand' },
    { label: 'Тестов сдано', value: stats.quizzes, hint: `из ${stats.total}`, color: 'green' },
    { label: 'Достижений', value: unlocked, hint: `из ${achievements.length}`, color: 'purple' },
  ] as const;

  return (
    <Window bodyClassName="p-5 sm:p-6" color="brand" title="player_01.sav">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Avatar avatar={data.profile.avatar} name={data.profile.name} size={72} />
          <div className="min-w-0 flex-1">
            {editing ? (
              <form
                className="flex items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  saveName();
                }}
              >
                <input
                  aria-label="Имя"
                  autoFocus
                  className="input input-sm max-w-xs"
                  maxLength={40}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Как вас называть?"
                  value={name}
                />
                <button aria-label="Сохранить имя" className="btn btn-primary btn-sm btn-icon" type="submit">
                  <Check size={18} strokeWidth={3} />
                </button>
              </form>
            ) : (
              <button className="group flex items-center gap-2 text-left" onClick={() => setEditing(true)} type="button">
                <span className="font-display text-[32px] leading-none text-ink">{data.profile.name.length > 0 ? data.profile.name : 'Игрок 1'}</span>
                <Pencil className="text-ink-3 transition-colors group-hover:text-brand" size={16} strokeWidth={2.5} />
              </button>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="tag border-green bg-green/12 text-green">УР.{String(level.level).padStart(2, '0')}</span>
              {(['student', 'teacher'] as const).map((role) => (
                <button
                  aria-pressed={data.profile.role === role}
                  className={`chip h-7 ${data.profile.role === role ? 'bg-brand text-on' : 'hover:text-ink'}`}
                  key={role}
                  onClick={() => setProfile({ role })}
                  type="button"
                >
                  {roleLabels[role]}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-1.5" role="radiogroup" aria-label="Цвет аватара">
              {Array.from({ length: AVATAR_COUNT }, (_, index) => (
                <button
                  aria-checked={data.profile.avatar === index}
                  aria-label={`Цвет ${index + 1}`}
                  className={`h-6 w-6 rounded-md border-2 transition-transform hover:scale-110 ${data.profile.avatar === index ? 'border-ink' : 'border-transparent'}`}
                  key={index}
                  onClick={() => setProfile({ avatar: index })}
                  role="radio"
                  style={{ background: `rgb(var(--c-${avatarColor(index)}))` }}
                  type="button"
                />
              ))}
            </div>
          </div>
        </div>

        <div className="lg:w-[340px]">
          <div className="flex items-end justify-between">
            <span className="font-display text-[16px] text-ink-2">ДО УРОВНЯ {level.level + 1}</span>
            <span className="font-display text-[16px] text-ink-3">
              {xp - level.levelStartXp}/{level.nextLevelXp - level.levelStartXp} XP
            </span>
          </div>
          <ProgressBar className="mt-2" color="rgb(var(--c-green))" height={16} label="Опыт до следующего уровня" value={level.progress} />
          {reward === undefined ? (
            <div className="mt-3 flex items-center gap-3">
              <PixelCat pose="happy" size={52} />
              <p className="text-sm font-bold leading-5 text-ink-2">Весь гардероб открыт — Кэш одет как настоящий архитектор.</p>
            </div>
          ) : (
            <Link className="group mt-3 flex items-center gap-3 rounded-2xl p-1 hover:bg-surface-2" to="/cabinet?tab=wardrobe">
              <PixelCat animate={false} outfit={{ [reward.slot]: reward.id }} pose="wow" size={52} />
              <p className="text-sm font-bold leading-5 text-ink-2">
                Награда за уровень {reward.level}: <span className="text-ink">{reward.name}</span> для Кэша.{' '}
                <span className="text-ink-3">
                  {xp === 0 ? 'Первые 20 XP — за любую демонстрацию.' : `Ещё ${Math.max(0, levelThreshold(reward.level) - xp)} XP.`}
                </span>
                <span className="ml-1 text-brand group-hover:underline">Гардероб →</span>
              </p>
            </Link>
          )}
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <div className="rounded-2xl border-2 border-line bg-surface-2 px-4 py-3" key={tile.label}>
            <dt className="text-[13px] font-extrabold text-ink-3">{tile.label}</dt>
            <dd className="mt-1 flex items-baseline gap-1.5">
              <span className="font-display text-[32px] leading-none" style={{ color: `rgb(var(--c-${tile.color}))` }}>
                {tile.value}
              </span>
              {'hint' in tile && <span className="text-[13px] font-bold text-ink-3">{tile.hint}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </Window>
  );
}
