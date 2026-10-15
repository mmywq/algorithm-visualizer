import { totalXp } from '@/content/achievements';
import { levelFromXp } from '@/lib/progress';
import type { Outfit } from '@/lib/userData';
import { useUserStore } from '@/stores/userStore';
import { wornItems } from './catRender';
import type { WardrobeItem } from './catWardrobe';

/** Текущий уровень игрока — от него зависит, какие вещи гардероба открыты. */
export const usePlayerLevel = (): number => useUserStore((state) => levelFromXp(totalXp(state.data)).level);

/**
 * Что надето на кота. По умолчанию — наряд из профиля; можно передать свой
 * (примерка в гардеробе) или 'none', чтобы показать кота без вещей.
 */
export function useWornItems(override?: Outfit | 'none' | undefined): WardrobeItem[] {
  const outfit = useUserStore((state) => state.data.profile.outfit);
  const level = usePlayerLevel();
  if (override === 'none') return [];
  return wornItems(override ?? outfit, override === undefined ? level : Number.POSITIVE_INFINITY);
}
