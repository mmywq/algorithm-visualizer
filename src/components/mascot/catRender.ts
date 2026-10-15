import type { Outfit } from '@/lib/userData';
import { catPosePalette } from './catPoses';
import { wardrobe, wardrobePalette, type WardrobeItem, type WardrobePose } from './catWardrobe';

/**
 * Растровый рендер Кэша. Каждое сочетание позы и одежды один раз рисуется на канвасе
 * в крошечный PNG и кешируется. Дальше браузер лишь масштабирует готовую картинку
 * с image-rendering: pixelated — анимации идут на видеокарте и не лагают.
 */

/** запас сверху (шапки, корона) и по бокам (наушники) */
export const PAD_TOP = 10;
export const PAD_SIDE = 8;

export interface SpriteLayer {
  readonly rows: readonly string[];
  readonly dx?: number;
  readonly dy?: number;
  readonly palette?: Readonly<Record<string, string>>;
}

const cache = new Map<string, string>();

function draw(key: string, width: number, height: number, padTop: number, padSide: number, layers: readonly SpriteLayer[]): string {
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = width + padSide * 2;
  canvas.height = height + padTop;
  const context = canvas.getContext('2d');
  if (context === null) return '';
  for (const layer of layers) {
    const palette = layer.palette ?? catPosePalette;
    const dx = (layer.dx ?? 0) + padSide;
    const dy = (layer.dy ?? 0) + padTop;
    layer.rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x += 1) {
        const char = row[x]!;
        if (char === '.') continue;
        const color = palette[char];
        if (color === undefined) continue;
        context.fillStyle = color;
        context.fillRect(x + dx, y + dy, 1, 1);
      }
    });
  }
  const url = canvas.toDataURL('image/png');
  cache.set(key, url);
  return url;
}

/** Спрайт позы с запасом под одежду: PAD_TOP сверху и PAD_SIDE по бокам. */
export const spriteUrl = (key: string, width: number, height: number, layers: readonly SpriteLayer[]): string =>
  draw(key, width, height, PAD_TOP, PAD_SIDE, layers);

/** Простая картинка без запасов — для логотипа и значков. */
export const bitmapUrl = (key: string, rows: readonly string[]): string => draw(`plain-${key}`, rows[0]?.length ?? 0, rows.length, 0, 0, [{ rows }]);

/** Слои одежды для позы: каждая вещь заранее построена под геометрию этой позы. */
export function outfitLayers(items: readonly WardrobeItem[], pose: WardrobePose, lift = 0): SpriteLayer[] {
  const layers: SpriteLayer[] = [];
  for (const item of items) {
    const sprite = item.poses[pose];
    if (sprite !== undefined) layers.push({ rows: sprite.rows, dx: sprite.x, dy: sprite.y - lift, palette: wardrobePalette });
  }
  return layers;
}

const byId = new Map(wardrobe.map((item) => [item.id, item]));

/** Вещи, которые реально надеты: неизвестные id и ещё не открытые уровнем отбрасываются. */
export function wornItems(outfit: Outfit | null | undefined, level: number): WardrobeItem[] {
  if (outfit === null || outfit === undefined) return [];
  const items: WardrobeItem[] = [];
  // порядок наложения: шея, лицо, голова — шапка рисуется поверх всего
  for (const slot of ['neck', 'face', 'head'] as const) {
    const id = outfit[slot];
    const item = id === undefined ? undefined : byId.get(id);
    if (item !== undefined && item.slot === slot && item.level <= level) items.push(item);
  }
  return items;
}

export const outfitKey = (items: readonly WardrobeItem[]): string => items.map((item) => item.id).join('+');
