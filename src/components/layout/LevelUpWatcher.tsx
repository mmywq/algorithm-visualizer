import { useEffect } from 'react';
import { PixelCat } from '@/components/mascot/PixelCat';
import { Dialog } from '@/components/ui/Dialog';
import { itemsUnlockedAt } from '@/content/wardrobe';
import { celebrate } from '@/lib/celebrate';
import { useUserStore } from '@/stores/userStore';

/** Праздник нового уровня: кот радуется, конфетти и обновка в гардеробе. */
export function LevelUpWatcher() {
  const level = useUserStore((state) => state.levelUp);
  const dismiss = useUserStore((state) => state.dismissLevelUp);
  const wear = useUserStore((state) => state.wear);
  const reward = level === null ? undefined : itemsUnlockedAt(level)[0];

  useEffect(() => {
    if (level !== null) celebrate('big');
  }, [level]);

  return (
    <Dialog hideClose onClose={dismiss} open={level !== null} size="sm">
      <div className="flex flex-col items-center pt-8 text-center">
        <PixelCat glow outfit={reward === undefined ? undefined : { [reward.slot]: reward.id }} pose="happy" size={156} />
        <p className="tag mt-5 border-green bg-green/12 text-green">НОВЫЙ УРОВЕНЬ</p>
        <h2 className="h-display mt-3 text-ink">Уровень {level}</h2>
        {reward === undefined ? (
          <p className="mt-2 max-w-xs text-[16px] font-semibold leading-7 text-ink-2">
            Кэш в восторге! Каждый уровень — это десятки шагов алгоритмов, которые вы разобрали сами.
          </p>
        ) : (
          <p className="mt-2 max-w-xs text-[16px] font-semibold leading-7 text-ink-2">
            В гардеробе обновка — <span className="font-black text-ink">{reward.name}</span>. Кэш будет носить её на всех страницах.
          </p>
        )}
        {reward === undefined ? (
          <button className="btn btn-primary btn-lg mt-6 w-full font-display text-[24px]" data-autofocus onClick={dismiss} type="button">
            Дальше ▶
          </button>
        ) : (
          <div className="mt-6 flex w-full flex-col gap-2">
            <button
              className="btn btn-primary btn-lg w-full font-display text-[24px]"
              data-autofocus
              onClick={() => {
                wear(reward.slot, reward.id);
                dismiss();
              }}
              type="button"
            >
              Надеть ▶
            </button>
            <button className="btn btn-ghost btn-sm" onClick={dismiss} type="button">
              Позже — в кабинете, во вкладке «Гардероб»
            </button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
