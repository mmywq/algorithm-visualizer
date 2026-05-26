import { create } from 'zustand';
import type { AlgorithmFrame, AlgorithmGenerator, AlgorithmStatus } from '@/types';

type PlayerFrame = AlgorithmFrame<unknown, Record<string, unknown>>;
type PlayerGenerator = AlgorithmGenerator<unknown, Record<string, unknown>>;

type PlaybackTimerId = number | ReturnType<typeof setInterval>;

interface LoadAlgorithmOptions {
  readonly initialFrame?: PlayerFrame;
  readonly playbackSpeedMs?: number;
}

interface AlgorithmPlayerState {
  readonly generator: PlayerGenerator | null;
  readonly frames: readonly PlayerFrame[];
  readonly currentFrame: PlayerFrame | null;
  readonly currentIndex: number;
  readonly status: AlgorithmStatus;
  readonly playbackSpeedMs: number;
  readonly timerId: PlaybackTimerId | null;
}

interface AlgorithmPlayerActions {
  readonly loadAlgorithm: (generator: PlayerGenerator, options?: LoadAlgorithmOptions) => void;
  readonly play: () => void;
  readonly pause: () => void;
  readonly nextStep: () => PlayerFrame | null;
  readonly prevStep: () => PlayerFrame | null;
  readonly reset: () => void;
  readonly setPlaybackSpeed: (playbackSpeedMs: number) => void;
}

export type AlgorithmPlayerStore = AlgorithmPlayerState & AlgorithmPlayerActions;

const DEFAULT_PLAYBACK_SPEED_MS = 650;
const MIN_PLAYBACK_SPEED_MS = 100;
const MAX_PLAYBACK_SPEED_MS = 3_000;

const initialState: AlgorithmPlayerState = {
  generator: null,
  frames: [],
  currentFrame: null,
  currentIndex: -1,
  status: 'idle',
  playbackSpeedMs: DEFAULT_PLAYBACK_SPEED_MS,
  timerId: null,
};

export const useAlgorithmPlayerStore = create<AlgorithmPlayerStore>((set, get) => ({
  ...initialState,

  loadAlgorithm: (generator, options) => {
    clearPlaybackTimer(get().timerId);

    const initialFrame = options?.initialFrame ?? null;
    const frames = initialFrame === null ? [] : [initialFrame];
    const playbackSpeedMs = clampPlaybackSpeed(
      options?.playbackSpeedMs ?? get().playbackSpeedMs,
    );

    set({
      generator,
      frames,
      currentFrame: initialFrame,
      currentIndex: initialFrame === null ? -1 : 0,
      status: 'idle',
      playbackSpeedMs,
      timerId: null,
    });
  },

  play: () => {
    const { generator, status, timerId, playbackSpeedMs } = get();

    if (generator === null || status === 'completed' || timerId !== null) {
      return;
    }

    const newTimerId = window.setInterval(() => {
      const frame = get().nextStep();

      if (frame === null) {
        get().pause();
      }
    }, playbackSpeedMs);

    set({ status: 'running', timerId: newTimerId });
  },

  pause: () => {
    const { timerId, status } = get();

    clearPlaybackTimer(timerId);

    set({
      status: status === 'completed' ? 'completed' : 'paused',
      timerId: null,
    });
  },

  nextStep: () => {
    const { frames, currentIndex, generator } = get();
    const cachedNextIndex = currentIndex + 1;
    const cachedFrame = frames[cachedNextIndex];

    if (cachedFrame !== undefined) {
      set({
        currentFrame: cachedFrame,
        currentIndex: cachedNextIndex,
        status: cachedFrame.status === 'completed' ? 'completed' : get().status,
      });

      return cachedFrame;
    }

    if (generator === null) {
      return null;
    }

    const result = generator.next();

    if (result.done === true) {
      clearPlaybackTimer(get().timerId);
      set({ status: 'completed', timerId: null });
      return null;
    }

    const nextFrame = result.value;
    const nextFrames = [...frames, nextFrame];

    set({
      frames: nextFrames,
      currentFrame: nextFrame,
      currentIndex: nextFrames.length - 1,
      status: nextFrame.status === 'completed' ? 'completed' : get().status,
    });

    if (nextFrame.status === 'completed') {
      clearPlaybackTimer(get().timerId);
      set({ timerId: null });
    }

    return nextFrame;
  },

  prevStep: () => {
    const { currentIndex, frames, timerId } = get();
    const previousIndex = currentIndex - 1;

    clearPlaybackTimer(timerId);

    if (previousIndex < 0) {
      set({ currentFrame: null, currentIndex: -1, status: 'paused', timerId: null });
      return null;
    }

    const previousFrame = frames[previousIndex];

    if (previousFrame === undefined) {
      return null;
    }

    set({
      currentFrame: previousFrame,
      currentIndex: previousIndex,
      status: 'paused',
      timerId: null,
    });

    return previousFrame;
  },

  reset: () => {
    clearPlaybackTimer(get().timerId);
    set({ ...initialState, playbackSpeedMs: get().playbackSpeedMs });
  },

  setPlaybackSpeed: (playbackSpeedMs) => {
    const nextPlaybackSpeedMs = clampPlaybackSpeed(playbackSpeedMs);
    const { status, timerId } = get();

    clearPlaybackTimer(timerId);
    set({ playbackSpeedMs: nextPlaybackSpeedMs, timerId: null });

    if (status === 'running') {
      get().play();
    }
  },
}));

const clearPlaybackTimer = (timerId: PlaybackTimerId | null): void => {
  if (timerId !== null) {
    window.clearInterval(timerId);
  }
};

const clampPlaybackSpeed = (playbackSpeedMs: number): number =>
  Math.min(MAX_PLAYBACK_SPEED_MS, Math.max(MIN_PLAYBACK_SPEED_MS, playbackSpeedMs));
