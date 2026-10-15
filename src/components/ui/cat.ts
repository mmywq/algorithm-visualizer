import type { CSSProperties } from 'react';
import type { CategoryId, ColorName } from '@/content/catalog';
import { categoryById } from '@/content/catalog';

/** Подставляет цвет категории в переменные --cat / --cat-press для классов bg-cat, text-cat и btn-cat. */
export const colorVars = (color: ColorName): CSSProperties => ({ '--cat': `var(--c-${color})`, '--cat-press': `var(--c-${color}-press)` }) as CSSProperties;

export const categoryVars = (categoryId: CategoryId): CSSProperties => colorVars(categoryById.get(categoryId)?.color ?? 'brand');

export const rgb = (color: ColorName, alpha = 1): string => (alpha === 1 ? `rgb(var(--c-${color}))` : `rgb(var(--c-${color}) / ${alpha})`);

export const rgbPress = (color: ColorName): string => `rgb(var(--c-${color}-press))`;
