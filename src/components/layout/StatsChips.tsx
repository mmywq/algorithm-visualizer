import { AnimatePresence, motion, useAnimate, useReducedMotionConfig } from 'framer-motion';
import { Flame } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { totalXp } from '@/content/achievements';
import { ease, exitFast, spring } from '@/lib/motion';
import { countOf } from '@/lib/plural';
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
  const [flame, animateFlame] = useAnimate<HTMLSpanElement>();
  const wasActive = useRef(activeToday);
  const reduceMotion = useReducedMotionConfig();

  useEffect(() => {
    if (lastGain === null || Date.now() - lastGain.at > 2000) return undefined;
    setBubble({ amount: lastGain.amount, key: lastGain.at });
    const timer = window.setTimeout(() => setBubble(null), 1700);
    return () => window.clearTimeout(timer);
  }, [lastGain]);

  // огонёк вспыхивает в тот момент, когда серия засчитана сегодня, а не горит анимацией без конца
  useEffect(() => {
    if (activeToday && !wasActive.current && reduceMotion !== true && flame.current !== null) {
      void animateFlame(flame.current, { scale: [0.4, 1.3, 1], rotate: [-18, 8, 0] }, { duration: 0.7, ease: ease.out });
    }
    wasActive.current = activeToday;
  }, [activeToday, animateFlame, flame, reduceMotion]);

  return (
    <Link className="group relative flex items-center gap-2.5 rounded-xl px-1.5 py-1 transition-colors hover:bg-surface-2" to="/cabinet">
      {/* значки ниже — для глаз; экранный диктор читает эту фразу */}
      <span className="sr-only">
        Уровень {level.level}, {xp} опыта, серия {countOf(streak, 'день', 'дня', 'дней')} — личный кабинет
      </span>
      <span aria-hidden="true" className="tag border-green bg-green/12 text-green" title={`Уровень ${level.level}`}>
        УР.{String(level.level).padStart(2, '0')}
      </span>
      <span
        aria-hidden="true"
        className="hidden flex-col gap-1 sm:flex"
        title={`${xp - level.levelStartXp} из ${level.nextLevelXp - level.levelStartXp} опыта до уровня ${level.level + 1}`}
      >
        <span className="font-display text-[16px] leading-none text-ink-2">
          <AnimatedNumber className="tabular" value={xp} /> <span className="text-ink-3">XP</span>
        </span>
        {/* при 1024–1279 px в шапке рядом меню, поэтому полоска чуть короче */}
        <span className="block h-2 w-24 overflow-hidden rounded-[3px] border border-line-strong bg-surface-2 lg:w-20 xl:w-24">
          <motion.span
            animate={{ clipPath: `inset(0 ${100 - Math.max(4, level.progress * 100)}% 0 0)` }}
            className="block h-full w-full bg-green"
            initial={false}
            transition={spring.smooth}
          />
        </span>
      </span>
      <span
        aria-hidden="true"
        className={`inline-flex items-center gap-1 font-display text-[16px] leading-none transition-colors duration-300 ${activeToday ? 'text-orange' : 'text-ink-3'}`}
        title={activeToday ? `Серия ${streak} дн. продолжается` : 'Позанимайтесь сегодня, чтобы продолжить серию'}
      >
        <span className="inline-flex origin-bottom" ref={flame}>
          <Flame
            className={activeToday ? 'origin-bottom group-hover:animate-flame' : ''}
            fill={activeToday ? 'currentColor' : 'none'}
            size={20}
            strokeWidth={2.5}
          />
        </span>
        {streak}
      </span>
      <AnimatePresence>
        {bubble !== null && (
          <motion.span
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="tag pointer-events-none absolute -bottom-8 left-2 border-yellow-press bg-yellow text-on"
            exit={{ opacity: 0, y: 6, transition: exitFast }}
            initial={{ opacity: 0, y: -6, scale: 0.8 }}
            key={bubble.key}
            transition={spring.playful}
          >
            +{bubble.amount} XP
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}
