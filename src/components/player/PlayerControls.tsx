import type { ChangeEvent } from 'react';
import type { AlgorithmStatus } from '@/types';

interface PlayerControlsProps {
  readonly status: AlgorithmStatus;
  readonly currentIndex: number;
  readonly totalFrames: number;
  readonly playbackSpeedMs: number;
  readonly canStepBackward: boolean;
  readonly canStepForward: boolean;
  readonly onPlay: () => void;
  readonly onPause: () => void;
  readonly onNextStep: () => void;
  readonly onPrevStep: () => void;
  readonly onReset: () => void;
  readonly onSpeedChange: (playbackSpeedMs: number) => void;
}

export function PlayerControls({
  status,
  currentIndex,
  totalFrames,
  playbackSpeedMs,
  canStepBackward,
  canStepForward,
  onPlay,
  onPause,
  onNextStep,
  onPrevStep,
  onReset,
  onSpeedChange,
}: PlayerControlsProps) {
  const isRunning = status === 'running';

  return (
    <section className="rounded-2xl border border-app bg-surface p-5 shadow-lg shadow-slate-950/20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent">
            Плеер
          </p>
          <p className="mt-1 text-sm text-app-muted">
            Кадр {currentIndex < 0 ? 0 : currentIndex + 1} из {totalFrames}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className="control-button" disabled={!canStepBackward} onClick={onPrevStep} type="button">
            Назад
          </button>
          <button
            className="control-button control-button-primary"
            disabled={!canStepForward && status === 'completed'}
            onClick={isRunning ? onPause : onPlay}
            type="button"
          >
            {isRunning ? 'Пауза' : 'Старт'}
          </button>
          <button className="control-button" disabled={!canStepForward} onClick={onNextStep} type="button">
            Вперёд
          </button>
          <button className="control-button" onClick={onReset} type="button">
            Сброс
          </button>
        </div>
      </div>

      <label className="mt-5 block text-sm text-app-muted">
        Задержка шага: {playbackSpeedMs} мс
        <input
          className="mt-2 w-full accent-cyan-400"
          max={3000}
          min={100}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onSpeedChange(Number(event.target.value))}
          step={50}
          type="range"
          value={playbackSpeedMs}
        />
      </label>
    </section>
  );
}
