import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSettingsStore, type Speed } from '@/stores/settingsStore';
import type { AlgorithmFrame } from '@/types';

export type AnyFrame = AlgorithmFrame<unknown, Record<string, unknown>>;

/** Итог «не нашли»: поиск без результата, недостижимая вершина, нет вхождений образца. */
export const isMiss = (frame: AnyFrame | null | undefined): boolean => frame?.meta['outcome'] === 'miss';
export type PlayerStatus = 'idle' | 'playing' | 'paused' | 'done';

/** Предел кадров на одну демонстрацию: защищает вкладку от слишком больших входных данных. */
export const MAX_FRAMES = 6000;
const BASE_STEP_MS = 900;

export interface FrameSet<F> {
  readonly frames: readonly F[];
  readonly truncated: boolean;
}

/** Генераторы алгоритмов ленивые; плеер собирает кадры заранее, чтобы работала перемотка. */
export function collectFrames<F>(generator: Generator<F, unknown, unknown>, limit = MAX_FRAMES): FrameSet<F> {
  const frames: F[] = [];
  let truncated = false;
  for (let result = generator.next(); result.done !== true; result = generator.next()) {
    frames.push(result.value);
    if (frames.length >= limit) {
      truncated = true;
      break;
    }
  }
  return { frames, truncated };
}

export function useFrames<F>(factory: () => Generator<F, unknown, unknown>, deps: readonly unknown[]): FrameSet<F> {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => collectFrames(factory()), deps);
}

export interface Player<F = AnyFrame> {
  readonly frames: readonly F[];
  readonly frame: F | null;
  readonly index: number;
  readonly total: number;
  readonly status: PlayerStatus;
  readonly isPlaying: boolean;
  readonly atStart: boolean;
  readonly atEnd: boolean;
  readonly truncated: boolean;
  readonly speed: Speed;
  readonly play: () => void;
  readonly pause: () => void;
  readonly toggle: () => void;
  readonly next: () => void;
  readonly prev: () => void;
  readonly seek: (index: number) => void;
  readonly reset: () => void;
  readonly toEnd: () => void;
  readonly setSpeed: (speed: Speed) => void;
}

interface UsePlayerOptions {
  /** вызывается один раз за набор кадров, когда пользователь доходит до последнего шага */
  readonly onComplete?: () => void;
  readonly initialIndex?: number;
  readonly autoplay?: boolean;
}

export function usePlayer<F>(set: FrameSet<F>, options: UsePlayerOptions = {}): Player<F> {
  const { frames, truncated } = set;
  const total = frames.length;
  const speed = useSettingsStore((state) => state.speed);
  const setSpeed = useSettingsStore((state) => state.setSpeed);
  const [index, setIndex] = useState(() => clampIndex(options.initialIndex ?? 0, total));
  const [playing, setPlaying] = useState(options.autoplay === true);
  const completedFor = useRef<readonly F[] | null>(null);
  const onCompleteRef = useRef(options.onComplete);
  onCompleteRef.current = options.onComplete;
  const initialIndexRef = useRef(options.initialIndex);

  // новые данные — начинаем сначала (кроме самого первого набора, где может быть шаг из ссылки)
  const firstSetRef = useRef(frames);
  useEffect(() => {
    if (firstSetRef.current === frames) return;
    initialIndexRef.current = undefined;
    setIndex(0);
    setPlaying(false);
  }, [frames]);

  const safeIndex = clampIndex(index, total);
  const atEnd = total === 0 || safeIndex >= total - 1;
  const atStart = safeIndex <= 0;

  useEffect(() => {
    if (!playing) return undefined;
    if (atEnd) {
      setPlaying(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setIndex((current) => Math.min(current + 1, total - 1)), BASE_STEP_MS / speed);
    return () => window.clearTimeout(timer);
  }, [playing, safeIndex, atEnd, speed, total]);

  useEffect(() => {
    if (total > 1 && atEnd && completedFor.current !== frames) {
      completedFor.current = frames;
      onCompleteRef.current?.();
    }
  }, [atEnd, frames, total]);

  const play = useCallback(() => {
    if (total <= 1) return;
    if (atEnd) setIndex(0);
    setPlaying(true);
  }, [atEnd, total]);
  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => (playing ? setPlaying(false) : play()), [playing, play]);
  const next = useCallback(() => {
    setPlaying(false);
    setIndex((current) => Math.min(current + 1, Math.max(0, total - 1)));
  }, [total]);
  const prev = useCallback(() => {
    setPlaying(false);
    setIndex((current) => Math.max(current - 1, 0));
  }, []);
  const seek = useCallback((target: number) => setIndex(clampIndex(target, total)), [total]);
  const reset = useCallback(() => {
    setPlaying(false);
    setIndex(0);
  }, []);
  const toEnd = useCallback(() => {
    setPlaying(false);
    setIndex(Math.max(0, total - 1));
  }, [total]);

  const status: PlayerStatus = playing ? 'playing' : atEnd && total > 1 ? 'done' : safeIndex === 0 ? 'idle' : 'paused';

  return {
    frames,
    frame: frames[safeIndex] ?? null,
    index: safeIndex,
    total,
    status,
    isPlaying: playing,
    atStart,
    atEnd,
    truncated,
    speed,
    play,
    pause,
    toggle,
    next,
    prev,
    seek,
    reset,
    toEnd,
    setSpeed,
  };
}

const clampIndex = (index: number, total: number): number => Math.max(0, Math.min(Number.isFinite(index) ? Math.floor(index) : 0, Math.max(0, total - 1)));
