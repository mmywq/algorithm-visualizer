import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUserStore } from '@/stores/userStore';
import { outfitKey, outfitLayers, PAD_SIDE, PAD_TOP, spriteUrl } from './catRender';
import { catWalk } from './catPoses';
import { PixelCat, type CatPose } from './PixelCat';
import { useWornItems } from './useOutfit';

/** Целый масштаб — пиксели кота остаются ровными квадратами. */
const SCALE = 1;
const BOX = catWalk.w * SCALE;
/** Шаг кадра ходьбы — 3 пикселя спрайта за FRAME_MS: с такой скоростью стоящая лапа не скользит. */
const STRIDE = 3;
const FRAME_MS = 120;

type Mode = 'walk' | 'sit' | 'sleep';

const random = (min: number, max: number): number => min + Math.random() * (max - min);

/** Анимации выключены — в настройках или в системе. */
export function useMotionAllowed(): boolean {
  const motion = useSettingsStore((state) => state.motion);
  const [systemReduce, setSystemReduce] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = (): void => setSystemReduce(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return motion === 'full' || (motion === 'system' && !systemReduce);
}

/** Высота нижней панели (меню или плеер на телефоне): кот ходит по её верхнему краю. */
function useFloor(): number {
  const [floor, setFloor] = useState(0);
  const location = useLocation();
  useEffect(() => {
    const measure = (): void => {
      let height = 0;
      document.querySelectorAll<HTMLElement>('[data-cat-floor]').forEach((element) => {
        if (element.offsetParent !== null || getComputedStyle(element).position === 'fixed') {
          const rect = element.getBoundingClientRect();
          if (rect.height > 0 && rect.bottom >= window.innerHeight - 2) height = Math.max(height, rect.height);
        }
      });
      setFloor(height);
    };
    measure();
    const timer = window.setInterval(measure, 1500);
    window.addEventListener('resize', measure);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('resize', measure);
    };
  }, [location.pathname]);
  return floor;
}

/**
 * Кэш гуляет по низу экрана: проходит немного, садится, иногда засыпает.
 * Позиция меняется прямо в DOM через requestAnimationFrame — без перерисовок React.
 */
export function WalkingCat() {
  const enabled = useSettingsStore((state) => state.catWalks);
  const motionAllowed = useMotionAllowed();
  const [params] = useSearchParams();
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const update = (): void => setFullscreen(document.fullscreenElement !== null);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  if (!enabled || !motionAllowed || fullscreen || params.get('embed') === '1') return null;
  return <Walker />;
}

function Walker() {
  const petCat = useUserStore((state) => state.petCat);
  const items = useWornItems();
  const floor = useFloor();
  const [mode, setMode] = useState<Mode>('walk');
  const [facing, setFacing] = useState<1 | -1>(1);
  const wrapper = useRef<HTMLDivElement | null>(null);
  const image = useRef<HTMLImageElement | null>(null);
  const x = useRef(-BOX);
  const target = useRef(0);
  const timer = useRef(0);

  // четыре кадра ходьбы в текущем наряде; пересчитываются, только когда наряд меняется
  const key = outfitKey(items);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const frames = useMemo(
    () =>
      catWalk.frames.map((rows, index) =>
        spriteUrl(`walk-${index}-${key}`, catWalk.w, catWalk.h, [{ rows }, ...outfitLayers(itemsRef.current, 'walk', catWalk.bob[index] ?? 0)]),
      ),
    [key],
  );

  const place = useCallback(() => {
    if (wrapper.current !== null) wrapper.current.style.transform = `translate3d(${Math.round(x.current)}px, 0, 0)`;
  }, []);

  const startWalk = useCallback(() => {
    const max = window.innerWidth - BOX - 12;
    let next = random(12, Math.max(12, max));
    // идём хотя бы на четверть экрана, чтобы прогулка была заметной
    if (Math.abs(next - x.current) < window.innerWidth / 4)
      next = x.current < window.innerWidth / 2 ? random(window.innerWidth / 2, max) : random(12, window.innerWidth / 2 - BOX);
    target.current = Math.max(12, Math.min(max, next));
    setFacing(target.current >= x.current ? 1 : -1);
    setMode('walk');
  }, []);

  // отдых между прогулками: посидеть, иногда поспать
  const rest = useCallback(() => {
    const sleep = Math.random() < 0.22;
    setMode(sleep ? 'sleep' : 'sit');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(startWalk, sleep ? random(14000, 26000) : random(5000, 13000));
  }, [startWalk]);

  // первое появление: выходит из-за левого края
  useEffect(() => {
    x.current = -BOX;
    place();
    target.current = random(window.innerWidth * 0.15, window.innerWidth * 0.45);
    setFacing(1);
    return () => window.clearTimeout(timer.current);
  }, [place]);

  useEffect(() => {
    if (mode !== 'walk') return undefined;
    let raf = 0;
    let last = performance.now();
    let frameClock = 0;
    let frame = 0;
    // кот сдвигается рывками ровно на шаг вместе со сменой кадра — как в пиксельных играх:
    // стоящая лапа остаётся на месте, а не скользит
    const tick = (now: number): void => {
      frameClock += Math.min(250, now - last);
      last = now;
      const direction = target.current >= x.current ? 1 : -1;
      if (frameClock >= FRAME_MS) {
        frameClock -= FRAME_MS;
        frame = (frame + 1) % frames.length;
        x.current += direction * STRIDE * SCALE;
        if (image.current !== null) image.current.src = frames[frame]!;
      }
      if ((direction === 1 && x.current >= target.current) || (direction === -1 && x.current <= target.current)) {
        x.current = target.current;
        place();
        rest();
        return;
      }
      place();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode, frames, place, rest]);

  // при сужении окна кот не должен остаться за краем
  useEffect(() => {
    const clamp = (): void => {
      const max = window.innerWidth - BOX - 12;
      if (x.current > max) {
        x.current = max;
        target.current = Math.min(target.current, max);
        place();
      }
    };
    window.addEventListener('resize', clamp);
    return () => window.removeEventListener('resize', clamp);
  }, [place]);

  const pose: CatPose = mode === 'sleep' ? 'sleep' : 'sit';

  return (
    <div
      aria-hidden="true"
      className="no-print pointer-events-none fixed left-0 z-30 will-change-transform"
      ref={wrapper}
      style={{ bottom: floor, width: BOX, height: catWalk.h * SCALE }}
    >
      <span className="absolute -bottom-[2px] left-1/2 h-[5px] w-[60%] -translate-x-1/2 rounded-full bg-[rgb(0_0_0/0.5)]" />
      {mode === 'walk' ? (
        <img
          alt=""
          className="pixelated pointer-events-auto absolute bottom-0 max-w-none cursor-pointer select-none"
          draggable={false}
          height={(catWalk.h + PAD_TOP) * SCALE}
          onClick={() => {
            petCat();
            window.clearTimeout(timer.current);
            setMode('sit');
            timer.current = window.setTimeout(startWalk, random(6000, 11000));
          }}
          ref={image}
          src={frames[0]}
          style={{ left: -PAD_SIDE * SCALE, transform: facing === -1 ? 'scaleX(-1)' : undefined }}
          width={(catWalk.w + PAD_SIDE * 2) * SCALE}
        />
      ) : (
        <span className="pointer-events-auto absolute bottom-0 left-1/2 -translate-x-1/2">
          <PixelCat
            interactive
            onPet={() => {
              petCat();
              // разбуженный кот садится и чуть позже идёт гулять
              if (mode === 'sleep') {
                setMode('sit');
                window.clearTimeout(timer.current);
                timer.current = window.setTimeout(startWalk, random(4000, 8000));
              }
            }}
            pose={pose}
            size={46 * SCALE}
          />
        </span>
      )}
    </div>
  );
}
