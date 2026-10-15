import { Lock, Shirt } from 'lucide-react';
import { useState } from 'react';
import { PixelCat } from '@/components/mascot/PixelCat';
import { usePlayerLevel } from '@/components/mascot/useOutfit';
import { toast } from '@/components/ui/Toaster';
import { SLOTS, slotNames, unlockedCount, wardrobe, type WardrobeItem } from '@/content/wardrobe';
import { totalXp } from '@/content/achievements';
import { levelThreshold } from '@/lib/progress';
import type { Outfit } from '@/lib/userData';
import { useUserStore } from '@/stores/userStore';

/**
 * Гардероб Кэша: вещи открываются уровнями. Открытую вещь можно надеть,
 * закрытую — только примерить, чтобы было ради чего расти.
 */
export function WardrobePanel() {
  const level = usePlayerLevel();
  const xp = useUserStore((state) => totalXp(state.data));
  const outfit = useUserStore((state) => state.data.profile.outfit);
  const wear = useUserStore((state) => state.wear);
  const [trying, setTrying] = useState<WardrobeItem | null>(null);

  const preview: Outfit = trying === null ? outfit : { ...outfit, [trying.slot]: trying.id };
  const worn = SLOTS.map((slot) => wardrobe.find((item) => item.id === outfit[slot] && item.level <= level)).filter(
    (item): item is WardrobeItem => item !== undefined,
  );

  const choose = (item: WardrobeItem): void => {
    if (item.level > level) {
      setTrying((current) => (current?.id === item.id ? null : item));
      return;
    }
    setTrying(null);
    if (outfit[item.slot] === item.id) wear(item.slot, null);
    else {
      wear(item.slot, item.id);
      toast.success(`${item.name} — надето`, 'Кэш теперь носит это везде на сайте.');
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="flex flex-col items-center rounded-2xl border-2 border-line bg-surface-2 px-5 pb-5 pt-10 text-center">
        <PixelCat interactive outfit={preview} pose={trying === null ? 'happy' : 'wow'} size={156} />
        {trying === null ? (
          <>
            <p className="mt-5 font-display text-[16px] text-ink-2">
              {worn.length === 0 ? 'ПОКА БЕЗ ОБНОВОК' : worn.map((item) => item.name.toUpperCase()).join(' · ')}
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-ink-3">
              Открыто {unlockedCount(level)} из {wardrobe.length}. Нажмите на вещь, чтобы надеть или снять.
            </p>
          </>
        ) : (
          <>
            <p className="tag mt-5 border-yellow text-yellow">ПРИМЕРКА</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-ink-2">
              «{trying.name}» откроется на уровне {trying.level}. До него — {Math.max(0, levelThreshold(trying.level) - xp)} XP.
            </p>
            <button className="btn btn-secondary btn-sm mt-3" onClick={() => setTrying(null)} type="button">
              Снять примерку
            </button>
          </>
        )}
        {worn.length > 0 && trying === null && (
          <button className="btn btn-ghost btn-sm mt-3" onClick={() => SLOTS.forEach((slot) => wear(slot, null))} type="button">
            Снять всё
          </button>
        )}
      </div>

      <div className="flex flex-col gap-5">
        {SLOTS.map((slot) => (
          <section key={slot}>
            <h3 className="label">{slotNames[slot]}</h3>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {wardrobe
                .filter((item) => item.slot === slot)
                .map((item) => {
                  const locked = item.level > level;
                  const on = !locked && outfit[slot] === item.id;
                  const tried = trying?.id === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        aria-label={locked ? `${item.name}: откроется на уровне ${item.level}, примерить` : `${item.name}: ${on ? 'снять' : 'надеть'}`}
                        aria-pressed={on || tried}
                        className={`group flex w-full flex-col items-center gap-2 rounded-2xl border-2 px-3 pb-3 pt-5 transition-colors ${
                          on ? 'border-green bg-green/12' : tried ? 'border-yellow bg-yellow/12' : 'border-line bg-surface hover:border-line-strong'
                        }`}
                        onClick={() => choose(item)}
                        type="button"
                      >
                        <span className={locked && !tried ? 'opacity-70' : ''}>
                          <PixelCat animate={false} outfit={{ [slot]: item.id }} size={52} />
                        </span>
                        <span className="text-[14px] font-black leading-5 text-ink">{item.name}</span>
                        {locked ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-1.5 py-0.5 font-display text-[16px] leading-none text-ink-3">
                            <Lock size={12} strokeWidth={3} />
                            УР.{String(item.level).padStart(2, '0')}
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 font-display text-[16px] leading-none ${on ? 'text-green' : 'text-ink-3'}`}>
                            <Shirt size={13} strokeWidth={2.5} />
                            {on ? 'НАДЕТО' : 'НАДЕТЬ'}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
