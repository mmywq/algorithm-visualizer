import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { achievements } from '@/content/achievements';
import type { UserData } from '@/lib/userData';

/** Витрина достижений: открытые — цветные, закрытые — силуэт с замком и условием. */
export function AchievementsGrid({ data }: { readonly data: UserData }) {
  const unlocked = achievements.filter((item) => data.achievements[item.id] !== undefined).length;
  return (
    <div>
      <p className="font-display text-[16px] text-ink-2">
        ОТКРЫТО {unlocked} ИЗ {achievements.length}
      </p>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {achievements.map((achievement, index) => {
          const at = data.achievements[achievement.id];
          const open = at !== undefined;
          const Icon = achievement.icon;
          return (
            <motion.li
              className={`flex flex-col items-center rounded-2xl border-2 p-4 text-center ${open ? 'border-line-strong bg-surface' : 'border-dashed border-line bg-surface-2/50'}`}
              initial={{ opacity: 0, y: 10 }}
              key={achievement.id}
              transition={{ delay: Math.min(index, 12) * 0.03 }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <span
                className={`relative inline-flex h-14 w-14 items-center justify-center rounded-2xl border-2 ${open ? 'text-on' : 'border-line text-ink-3'}`}
                style={
                  open
                    ? {
                        background: `rgb(var(--c-${achievement.color}))`,
                        borderColor: `rgb(var(--c-${achievement.color}-press))`,
                        boxShadow: `0 4px 0 rgb(var(--c-${achievement.color}-press))`,
                      }
                    : undefined
                }
              >
                {open ? <Icon size={26} strokeWidth={2.5} /> : <Lock size={22} strokeWidth={2.5} />}
              </span>
              <p className={`mt-3 text-[15px] font-black leading-5 ${open ? 'text-ink' : 'text-ink-2'}`}>{achievement.title}</p>
              <p className="mt-1 text-[13px] font-semibold leading-5 text-ink-3">{achievement.description}</p>
              <p className={`tag mt-3 ${open ? 'border-yellow text-yellow' : 'border-line-strong text-ink-3'}`}>
                {open ? new Date(at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : `+${achievement.xp} XP`}
              </p>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
