import { AnimatePresence, motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { totalXp } from '@/content/achievements';
import { computeStreak, levelFromXp } from '@/lib/progress';
import { dayKey } from '@/lib/userData';
import { useUserStore } from '@/stores/userStore';

/** Игровая панель в шапке: уровень, полоска опыта до следующего уровня и серия дней. */
export function StatsChips() {
  const data = useUserStore((state) => state.data);
  const lastGain = useUserStore((state) => state.lastGain);
  const xp = useMemo(() => totalXp(data), [data]);
  const level = levelFromXp(xp);
  const streak = computeStreak(data.activity);
  const activeToday = (data.activity[dayKey()] ?? 0) > 0;
  const [bubble, setBubble] = useState<{ amount: number; key: number } | null>(null);

  useEffect(() => {
    if (lastGain === null || Date.now() - lastGain.at > 2000) return undefined;
    setBubble({ amount: lastGain.amount, key: lastGain.at });
    const timer = window.setTimeout(() => setBubble(null), 1700);
    return () => window.clearTimeout(timer);
  }, [lastGain]);

  return (
    <Link
      aria-label={`Уровень ${level.level}, ${xp} опыта, серия ${streak} дн.`}
      className="relative flex items-center gap-2.5 rounded-xl px-1.5 py-1 transition-colors hover:bg-surface-2"
      to="/cabinet"
    >
      <span className="tag border-green bg-green/12 text-green" title={`Уровень ${level.level}`}>
        УР.{String(level.level).padStart(2, '0')}
      </span>
      <span
        className="hidden flex-col gap-1 sm:flex"
        title={`${xp - level.levelStartXp} из ${level.nextLevelXp - level.levelStartXp} опыта до уровня ${level.level + 1}`}
      >
        <span className="font-display text-[16px] leading-none text-ink-2">
          {xp} <span className="text-ink-3">XP</span>
        </span>
        <span className="block h-2 w-24 overflow-hidden rounded-[3px] border border-line-strong bg-surface-2">
          <motion.span
            animate={{ width: `${Math.max(4, level.progress * 100)}%` }}
            className="block h-full bg-green"
            initial={false}
            transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          />
        </span>
      </span>
      <span
        className={`inline-flex items-center gap-1 font-display text-[16px] leading-none ${activeToday ? 'text-orange' : 'text-ink-3'}`}
        title={activeToday ? `Серия ${streak} дн. продолжается` : 'Позанимайтесь сегодня, чтобы продолжить серию'}
      >
        <Flame className={activeToday ? 'animate-flame' : ''} fill={activeToday ? 'currentColor' : 'none'} size={20} strokeWidth={2.5} />
        {streak}
      </span>
      <AnimatePresence>
        {bubble !== null && (
          <motion.span
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="tag pointer-events-none absolute -bottom-8 left-2 border-yellow-press bg-yellow text-on"
            exit={{ opacity: 0, y: 8 }}
            initial={{ opacity: 0, y: -6, scale: 0.6 }}
            key={bubble.key}
          >
            +{bubble.amount} XP
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}
