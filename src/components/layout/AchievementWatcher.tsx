import { useEffect } from 'react';
import { toast } from '@/components/ui/Toaster';
import { celebrate } from '@/lib/celebrate';
import { useUserStore } from '@/stores/userStore';

/** Показывает уведомления о новых достижениях, как только они записаны в хранилище. */
export function AchievementWatcher() {
  const unlocked = useUserStore((state) => state.unlocked);
  const consumeUnlocked = useUserStore((state) => state.consumeUnlocked);

  useEffect(() => {
    if (unlocked.length === 0) return;
    const pending = consumeUnlocked();
    pending.forEach((achievement, index) => {
      window.setTimeout(
        () => {
          const Icon = achievement.icon;
          toast.custom({
            title: `Достижение: ${achievement.title}`,
            description: `${achievement.description} · +${achievement.xp} XP`,
            icon: (
              <span
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-on"
                style={{ background: `rgb(var(--c-${achievement.color}))`, boxShadow: `0 3px 0 rgb(var(--c-${achievement.color}-press))` }}
              >
                <Icon size={22} strokeWidth={2.5} />
              </span>
            ),
            duration: 5200,
          });
          if (index === 0) celebrate('big');
        },
        500 + index * 700,
      );
    });
  }, [unlocked, consumeUnlocked]);

  return null;
}
