import { motion } from 'framer-motion';
import { Check, Gift } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Window } from '@/components/ui/Window';
import { QUEST_DAY_BONUS, questStates } from '@/content/quests';
import { ease } from '@/lib/motion';
import { useUserStore } from '@/stores/userStore';

const untilMidnight = (): string => {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const minutes = Math.max(0, Math.round((midnight.getTime() - now.getTime()) / 60000));
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours} ч ${minutes % 60} мин` : `${minutes} мин`;
};

/** Миссии дня: три задания, прогресс по каждому и награда за все три. */
export function QuestsPanel({ className = '' }: { readonly className?: string }) {
  const data = useUserStore((state) => state.data);
  const quests = useMemo(() => questStates(data), [data]);
  const done = quests.filter((quest) => quest.done).length;
  const complete = done === quests.length;
  const [left, setLeft] = useState(untilMidnight);

  useEffect(() => {
    const timer = window.setInterval(() => setLeft(untilMidnight()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <Window
      actions={
        <span className="font-display text-[16px] leading-none text-ink-2">
          {done}/{quests.length}
        </span>
      }
      bodyClassName="p-4 sm:p-5"
      className={className}
      color="lime"
      title="Миссии дня"
    >
      <ul className="flex flex-col gap-2.5">
        {quests.map((quest, index) => (
          <motion.li
            className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 ${quest.done ? 'border-green/50 bg-green/10' : 'border-line bg-surface-2'}`}
            initial={{ opacity: 0, x: -10 }}
            key={quest.id}
            transition={{ delay: index * 0.06 }}
            viewport={{ once: true }}
            whileInView={{ opacity: 1, x: 0 }}
          >
            <span
              className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 ${quest.done ? 'border-green-press bg-green text-on' : 'border-line-strong bg-surface text-transparent'}`}
            >
              <Check size={16} strokeWidth={3.5} />
            </span>
            <span className={`min-w-0 flex-1 text-[15px] font-bold leading-5 ${quest.done ? 'text-ink-2 line-through decoration-2' : 'text-ink'}`}>
              {quest.title}
            </span>
            <span className="font-display text-[16px] leading-none text-ink-3">
              {quest.value}/{quest.target}
            </span>
          </motion.li>
        ))}
      </ul>
      <div className="mt-4 flex items-center gap-3">
        <motion.span
          animate={complete ? { rotate: [0, -8, 8, -4, 0], scale: [1, 1.15, 1] } : {}}
          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 ${complete ? 'border-yellow-press bg-yellow text-on' : 'border-line-strong bg-surface-2 text-ink-3'}`}
          transition={{ duration: 0.7, ease: ease.out }}
        >
          <Gift size={22} strokeWidth={2.5} />
        </motion.span>
        <p className="text-sm font-bold leading-5 text-ink-2">
          {complete ? (
            <>
              Награда получена: <span className="text-yellow">+{QUEST_DAY_BONUS} XP</span>. Новые миссии — через {left}.
            </>
          ) : (
            <>
              Выполните все три — получите <span className="text-yellow">+{QUEST_DAY_BONUS} XP</span>. Обновятся через {left}.
            </>
          )}
        </p>
      </div>
    </Window>
  );
}
