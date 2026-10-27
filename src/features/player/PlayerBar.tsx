import { motion } from 'framer-motion';
import { Database, Maximize2, Minimize2, Pause, Play, RotateCcw, SkipForward, StepBack, StepForward } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Menu } from '@/components/ui/Menu';
import { SPEED_OPTIONS } from '@/stores/settingsStore';
import type { Player } from './usePlayer';

interface PlayerBarProps {
  readonly player: Player<unknown>;
  readonly onOpenData?: (() => void) | undefined;
  /** краткая запись входных данных — показывается на кнопке и входит в её подпись для экранных дикторов */
  readonly dataLabel?: string | undefined;
  readonly lecture?: boolean;
  readonly onToggleLecture?: (() => void) | undefined;
  readonly floating?: boolean;
  /** на десктопе панель стоит под сценой и не перекрывает её при прокрутке */
  readonly sticky?: boolean;
}

const formatSpeed = (speed: number): string => `${String(speed).replace('.', ',')}×`;

export function PlayerBar({ player, onOpenData, dataLabel, lecture = false, onToggleLecture, floating = false, sticky = true }: PlayerBarProps) {
  const fill = player.total <= 1 ? 0 : (player.index / (player.total - 1)) * 100;
  const disabled = player.total <= 1;

  return (
    <div
      className={`no-print border-line bg-surface/95 backdrop-blur-md ${
        floating
          ? 'fixed inset-x-0 bottom-0 z-40 border-t-2 px-3 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2'
          : `${sticky ? 'sticky bottom-3 z-30 shadow-pop' : ''} rounded-2xl border-2 border-line-strong px-4 pb-3 pt-2.5`
      }`}
      role="group"
      aria-label="Управление демонстрацией"
      data-cat-floor={floating ? '' : undefined}
    >
      <div className="flex items-center gap-3">
        <input
          aria-label="Перемотка по шагам"
          aria-valuetext={`Шаг ${player.index + 1} из ${player.total}`}
          className="scrubber min-w-0 flex-1"
          disabled={disabled}
          max={Math.max(0, player.total - 1)}
          min={0}
          onChange={(event) => {
            player.pause();
            player.seek(Number(event.target.value));
          }}
          step={1}
          style={{ '--fill': `${fill}%` } as CSSProperties}
          type="range"
          value={player.index}
        />
        <span className="shrink-0 font-display text-[16px] leading-none text-ink-2">
          {player.total === 0 ? '0 / 0' : `${player.index + 1} / ${player.total}`}
        </span>
      </div>

      <div className="mt-1.5 grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-2">
        <div className="flex min-w-0 items-center gap-1">
          {onOpenData !== undefined && (
            <button
              aria-label={dataLabel === undefined ? 'Входные данные' : `Входные данные: ${dataLabel}`}
              className="btn btn-secondary btn-sm min-w-0 shrink px-2.5 lg:hidden"
              onClick={onOpenData}
              type="button"
            >
              <Database className="shrink-0" size={16} strokeWidth={2.5} />
              <span className="hidden max-w-[96px] truncate min-[420px]:inline">{dataLabel ?? 'Данные'}</span>
            </button>
          )}
          <button
            aria-label="В начало"
            className="btn btn-ghost btn-icon shrink-0"
            disabled={player.atStart && !player.isPlaying}
            onClick={player.reset}
            title="В начало (Home)"
            type="button"
          >
            <RotateCcw size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            aria-label="Шаг назад"
            className="btn btn-secondary btn-icon"
            disabled={player.atStart}
            onClick={player.prev}
            title="Шаг назад (←)"
            type="button"
          >
            <StepBack size={20} strokeWidth={2.5} />
          </button>
          <motion.button
            aria-label={player.isPlaying ? 'Пауза' : player.atEnd ? 'Запустить заново' : 'Запустить'}
            className="btn btn-cat btn-lg btn-icon !h-14 !w-14 !rounded-full sm:!w-[72px] sm:!rounded-2xl"
            disabled={disabled}
            onClick={player.toggle}
            title="Старт / пауза (пробел)"
            type="button"
            whileTap={{ scale: 0.94 }}
          >
            {player.isPlaying ? (
              <Pause fill="currentColor" size={24} strokeWidth={2.5} />
            ) : (
              <Play className="translate-x-[1px]" fill="currentColor" size={24} strokeWidth={2.5} />
            )}
          </motion.button>
          <button
            aria-label="Шаг вперёд"
            className="btn btn-secondary btn-icon"
            disabled={player.atEnd}
            onClick={player.next}
            title="Шаг вперёд (→)"
            type="button"
          >
            <StepForward size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex items-center justify-end gap-1">
          <button
            aria-label="К результату"
            className="btn btn-ghost btn-icon shrink-0"
            disabled={player.atEnd}
            onClick={player.toEnd}
            title="К результату (End)"
            type="button"
          >
            <SkipForward size={20} strokeWidth={2.5} />
          </button>
          <Menu
            align="right"
            direction={floating ? 'up' : 'down'}
            items={SPEED_OPTIONS.map((option) => ({
              key: String(option),
              label: formatSpeed(option),
              hint: option === 1 ? 'обычная' : option < 1 ? 'медленнее' : 'быстрее',
              onSelect: () => player.setSpeed(option),
            }))}
            trigger={({ toggle }) => (
              <button
                aria-label={`Скорость ${formatSpeed(player.speed)}`}
                className="btn btn-ghost btn-sm min-w-[48px] px-2 font-display text-[16px]"
                onClick={toggle}
                title="Скорость (+ / −)"
                type="button"
              >
                {formatSpeed(player.speed)}
              </button>
            )}
            width={190}
          />
          {onToggleLecture !== undefined && (
            <button
              aria-label={lecture ? 'Выйти из режима лекции' : 'Режим лекции'}
              className="btn btn-ghost btn-icon btn-sm hidden sm:inline-flex"
              onClick={onToggleLecture}
              title="Режим лекции (F)"
              type="button"
            >
              {lecture ? <Minimize2 size={18} strokeWidth={2.5} /> : <Maximize2 size={18} strokeWidth={2.5} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
