import { wardrobe, type WardrobeItem, type WardrobeSlot } from '@/components/mascot/catWardrobe';

export { wardrobe };
export type { WardrobeItem, WardrobeSlot };

export const slotNames: Record<WardrobeSlot, string> = { head: 'Голова', face: 'Глаза', neck: 'Шея' };
export const SLOTS: readonly WardrobeSlot[] = ['head', 'face', 'neck'];

/** Вещи, которые открываются ровно на этом уровне. */
export const itemsUnlockedAt = (level: number): WardrobeItem[] => wardrobe.filter((item) => item.level === level);

/** Ближайшая ещё закрытая вещь — главная цель следующего уровня. */
export const nextReward = (level: number): WardrobeItem | undefined => [...wardrobe].sort((a, b) => a.level - b.level).find((item) => item.level > level);

export const unlockedCount = (level: number): number => wardrobe.filter((item) => item.level <= level).length;
