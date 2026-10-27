import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useRef, useState, type CSSProperties } from 'react';
import { ease } from '@/lib/motion';
import type { Outfit } from '@/lib/userData';
import { bitmapUrl, outfitKey, outfitLayers, PAD_SIDE, PAD_TOP, spriteUrl } from './catRender';
import { catHead, catPosePalette, catPoses, type CatPoseName, type PoseDeco } from './catPoses';
import type { WardrobePose } from './catWardrobe';
import { useWornItems } from './useOutfit';

/**
 * Кэш — маскот «Алгоскопа»: пухлый розовый пиксельный кот. Позы сняты пиксель в пиксель
 * с образца, который нарисовал автор проекта; одежда из гардероба садится на опорные точки позы.
 */

export type CatPose = 'sit' | 'happy' | 'sleep' | 'think' | 'peek' | 'wow' | 'cry';

export const MASCOT_NAME = 'Кэш';

const SPRITE: Record<CatPose, CatPoseName> = { sit: 'sit', happy: 'joy', sleep: 'sleep', think: 'think', peek: 'peek', wow: 'wow', cry: 'sad' };

/**
 * Движения позы: только сдвиги ровно на пиксель спрайта (--px), без масштабирования —
 * так пиксель-арт не «плывёт» и не дрожит.
 */
const MOTION: Record<CatPose, string> = {
  sit: 'cat-idle',
  happy: 'cat-joy',
  sleep: 'cat-idle-slow',
  think: 'cat-idle',
  peek: 'cat-idle-slow',
  wow: 'cat-surprise',
  cry: 'cat-idle-slow',
};

/** Позы гардероба: во сне вещи не надеты. */
const WEAR_POSE: Record<CatPoseName, WardrobePose | null> = { sit: 'sit', joy: 'joy', sad: 'sad', think: 'think', wow: 'wow', peek: 'peek', sleep: null };

/** Высота сидящего кота в пикселях спрайта: от неё считается целый масштаб, чтобы пиксели оставались квадратами. */
const BASE_H = catPoses.sit.h;
const BASE_W = catPoses.sit.w;

export const catScale = (size: number, peek = false): number => Math.max(1, Math.round(size / (peek ? catPoses.peek.h : BASE_H)));

/** Украшение позы: «?», «!», «z» — цвета темы, сердечки — как нарисованы. */
function Deco({ deco, scale, left, bottom }: { readonly deco: PoseDeco; readonly scale: number; readonly left: number; readonly bottom: number }) {
  const width = deco.rows[0]?.length ?? 0;
  const height = deco.rows.length;
  return (
    <svg
      aria-hidden="true"
      className="fx-float pointer-events-none absolute"
      height={height * scale}
      shapeRendering="crispEdges"
      style={{ left, bottom }}
      viewBox={`0 0 ${width} ${height}`}
      width={width * scale}
    >
      {deco.rows.flatMap((row, y) =>
        [...row].map((char, x) =>
          char === '.' ? null : (
            <rect fill={char === '#' ? `rgb(var(--c-${deco.tint ?? 'yellow'}))` : catPosePalette[char]} height={1} key={`${x}-${y}`} width={1} x={x} y={y} />
          ),
        ),
      )}
    </svg>
  );
}

interface PixelCatProps {
  readonly pose?: CatPose;
  /** желаемая высота сидящего кота в пикселях экрана; масштаб округляется до целого */
  readonly size?: number;
  readonly className?: string;
  readonly animate?: boolean;
  readonly label?: string;
  readonly glow?: boolean;
  /** кота можно погладить: по щелчку он радуется и выпускает сердечки */
  readonly interactive?: boolean;
  readonly onPet?: () => void;
  /** свой наряд (примерка) или 'none'; по умолчанию — наряд из профиля */
  readonly outfit?: Outfit | 'none' | undefined;
}

export function PixelCat({ pose = 'sit', size = 78, className = '', animate = true, label, glow = false, interactive = false, onPet, outfit }: PixelCatProps) {
  const [petted, setPetted] = useState(false);
  const [hearts, setHearts] = useState<readonly number[]>([]);
  const heartId = useRef(0);
  const items = useWornItems(outfit);

  const isPeek = pose === 'peek';
  // выглядывающий кот радуется, оставаясь за краем, — не вскакивает во весь рост
  const shownPose: CatPose = petted && !isPeek ? 'happy' : pose;
  const name = SPRITE[shownPose];
  const sprite = catPoses[name];
  const scale = catScale(size, isPeek);
  const boxW = (isPeek ? catPoses.peek.w : BASE_W) * scale;
  const boxH = (isPeek ? catPoses.peek.h : BASE_H) * scale;

  // во сне Кэш снимает вещи; выглядывая, показывает только голову
  const wearPose = WEAR_POSE[name];
  const worn = wearPose === null ? [] : items;
  const src = spriteUrl(`${name}-${outfitKey(worn)}`, sprite.w, sprite.h, [{ rows: sprite.rows }, ...(wearPose === null ? [] : outfitLayers(worn, wearPose))]);
  const imgW = (sprite.w + PAD_SIDE * 2) * scale;
  const imgH = (sprite.h + PAD_TOP) * scale;
  const imgLeft = Math.round((boxW - imgW) / 2);
  const deco = 'deco' in sprite ? sprite.deco : undefined;

  const pet = (): void => {
    if (!interactive) return;
    heartId.current += 1;
    const id = heartId.current;
    setHearts((current) => [...current.slice(-4), id]);
    window.setTimeout(() => setHearts((current) => current.filter((item) => item !== id)), 1100);
    setPetted(true);
    window.setTimeout(() => setPetted(false), 1300);
    onPet?.();
  };

  const image = (
    <img
      alt=""
      className={`cat-sprite pixelated pointer-events-none absolute bottom-0 max-w-none select-none ${animate ? MOTION[shownPose] : ''}`}
      draggable={false}
      height={imgH}
      src={src}
      style={{ left: imgLeft, '--px': `${scale}px`, ...(glow ? { filter: 'drop-shadow(0 0 12px rgb(255 111 174 / 0.5))' } : {}) } as CSSProperties}
      width={imgW}
    />
  );

  // Кликабельный кот — это кнопка, а не картинка: внутри role="img" кнопку не увидят экранные дикторы,
  // а скрывать aria-hidden элемент, на который можно перейти клавишей Tab, нельзя.
  const pettable = `Погладить ${MASCOT_NAME}а`;
  return (
    <span
      aria-hidden={!interactive && label === undefined ? true : undefined}
      aria-label={interactive ? undefined : label}
      className={`group/cat relative inline-block shrink-0 ${className}`}
      role={!interactive && label !== undefined ? 'img' : undefined}
      style={{ width: boxW, height: boxH }}
    >
      {interactive ? (
        <button
          aria-label={label === undefined ? pettable : `${label}. ${pettable}`}
          className="relative block h-full w-full cursor-pointer rounded-xl transition-transform duration-150 hover:-translate-y-1 active:translate-y-0.5"
          onClick={pet}
          type="button"
        >
          {image}
        </button>
      ) : (
        image
      )}

      {deco !== undefined && animate && (
        <Deco bottom={(sprite.h - deco.y - deco.rows.length) * scale} deco={deco} left={imgLeft + (PAD_SIDE + deco.x) * scale} scale={scale} />
      )}
      <AnimatePresence>
        {hearts.map((id, index) => (
          <motion.span
            animate={{ opacity: 1, y: -boxH * 0.55, x: (index % 2 === 0 ? -1 : 1) * boxW * 0.15, scale: 1 }}
            aria-hidden="true"
            className="pointer-events-none absolute left-[42%] top-[10%]"
            exit={{ opacity: 0, y: -boxH * 0.8 }}
            initial={{ opacity: 0, y: 0, scale: 0.4 }}
            key={id}
            transition={{ duration: 0.9, ease: ease.out }}
          >
            <PixelHeart size={Math.max(14, scale * 7)} />
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
  );
}

const HEART = ['.OO.OO.', 'OKKOKKO', 'OKKKKKO', '.OKKKO.', '..OKO..', '...O...'];
const HEART_COLORS: Record<string, string> = { O: '#3E1A3F', K: '#FF5FA2' };

export function PixelHeart({ size = 16, className = '' }: { readonly size?: number; readonly className?: string }) {
  return (
    <svg aria-hidden="true" className={`pixelated block ${className}`} height={size} shapeRendering="crispEdges" viewBox="0 0 7 6" width={(size / 6) * 7}>
      {HEART.flatMap((row, y) =>
        [...row].map((char, x) => (char === '.' ? null : <rect fill={HEART_COLORS[char]} height={1} key={`${x}-${y}`} width={1} x={x} y={y} />)),
      )}
    </svg>
  );
}

export function CatHead({ size = 32, className = '' }: { readonly size?: number; readonly className?: string | undefined }) {
  const src = useMemo(() => bitmapUrl('head', catHead.rows), []);
  // целый масштаб, не больше запрошенного размера: при дробном пиксели рисунка получаются разной ширины
  const scale = Math.max(1, Math.floor(size / catHead.h));
  return (
    <img
      alt=""
      aria-hidden="true"
      className={`pixelated inline-block shrink-0 select-none ${className}`}
      draggable={false}
      height={catHead.h * scale}
      src={src}
      width={catHead.w * scale}
    />
  );
}
