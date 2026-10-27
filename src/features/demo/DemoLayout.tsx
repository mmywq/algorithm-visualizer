import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Database, Keyboard, Minimize2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Window } from '@/components/ui/Window';
import { useOptionalAlgorithm } from '@/features/algorithm/AlgorithmContext';
import { PlayerBar } from '@/features/player/PlayerBar';
import { isMiss, type AnyFrame, type Player } from '@/features/player/usePlayer';
import { useHotkeys } from '@/hooks/useHotkeys';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { ease } from '@/lib/motion';
import { SPEED_OPTIONS } from '@/stores/settingsStore';
import { useUserStore } from '@/stores/userStore';
import type { PseudocodeLine } from '@/types';
import { Legend, type LegendItem } from './Legend';
import { PseudocodePanel } from './PseudocodePanel';
import { ResultPanel } from './ResultPanel';
import { StepCard } from './StepCard';

export interface DemoData {
  readonly title?: string;
  /** короткая подпись текущих данных: «[5, 3, 8]», «граф: 6 вершин» */
  readonly summary: string;
  readonly editor: ReactNode;
}

interface DemoLayoutProps {
  readonly player: Player<AnyFrame>;
  readonly stage: ReactNode;
  readonly toolbar?: ReactNode;
  readonly data?: DemoData;
  readonly legend?: readonly LegendItem[];
  readonly pseudocode?: readonly PseudocodeLine[];
  readonly aside?: ReactNode;
  /** вторая сцена под плеером: то же состояние в другом виде (дерево кучи и т. п.) */
  readonly companion?: ReactNode;
  readonly below?: ReactNode;
  /** строка входных данных для отчёта; null — не показывать панель результата */
  readonly resultInput?: string | null;
  readonly resultExtra?: ReactNode;
  readonly stageClassName?: string;
  readonly truncatedNote?: string;
}

export function DemoLayout({
  player,
  stage,
  toolbar,
  data,
  legend = [],
  pseudocode = [],
  aside,
  companion,
  below,
  resultInput,
  resultExtra,
  stageClassName = '',
  truncatedNote,
}: DemoLayoutProps) {
  const algorithm = useOptionalAlgorithm();
  const isDesktop = useIsDesktop();
  const setFlag = useUserStore((state) => state.setFlag);
  const [dataOpen, setDataOpen] = useState(false);
  const appliedSummary = useRef(data?.summary);
  useEffect(() => {
    if (appliedSummary.current === data?.summary) return;
    appliedSummary.current = data?.summary;
    // на телефоне редактор открыт поверх демонстрации: после «Применить» сразу показываем результат
    setDataOpen(false);
  }, [data?.summary]);
  const [desktopDataOpen, setDesktopDataOpen] = useState(false);
  const [lecture, setLecture] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const enterLecture = useCallback(() => {
    setLecture(true);
    setFlag('lecture-mode');
    document.documentElement.requestFullscreen?.().catch(() => undefined);
  }, [setFlag]);

  const exitLecture = useCallback(() => {
    setLecture(false);
    if (document.fullscreenElement !== null) void document.exitFullscreen?.().catch(() => undefined);
  }, []);

  useEffect(() => {
    const onChange = (): void => {
      if (document.fullscreenElement === null) setLecture(false);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    if (!lecture) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [lecture]);

  const changeSpeed = (direction: 1 | -1): void => {
    const index = SPEED_OPTIONS.indexOf(player.speed);
    const next = SPEED_OPTIONS[Math.max(0, Math.min(SPEED_OPTIONS.length - 1, index + direction))];
    if (next !== undefined) player.setSpeed(next);
  };

  useHotkeys({
    ' ': () => player.toggle(),
    k: () => player.toggle(),
    ArrowRight: () => player.next(),
    ArrowLeft: () => player.prev(),
    Home: () => player.reset(),
    End: () => player.toEnd(),
    '+': () => changeSpeed(1),
    '=': () => changeSpeed(1),
    '-': () => changeSpeed(-1),
    f: () => (lecture ? exitLecture() : enterLecture()),
    Escape: () => (lecture ? exitLecture() : undefined),
    '?': () => setHelpOpen(true),
  });

  const steps = useMemo(() => player.frames.slice(0, player.index + 1).map((frame) => frame.description ?? frame.message), [player.frames, player.index]);
  const activeLine = player.frame?.pseudocode.line ?? null;
  const showResult = player.status === 'done' && resultInput !== null;
  const floatingBar = !isDesktop && !lecture;

  const stageTitle = algorithm === null ? 'demo.exe' : `${algorithm.entry.id.replace(/-/g, '_')}.exe`;
  const stageCard = (
    <Window bodyClassName={`p-2.5 sm:p-4 ${stageClassName}`} title={stageTitle}>
      {stage}
      {legend.length > 0 && (
        <div className="mt-3 px-1.5 pb-0.5">
          <Legend items={legend} />
        </div>
      )}
      {truncatedNote !== undefined && player.truncated && (
        <p className="mt-2 rounded-xl bg-yellow/15 px-3 py-2 text-sm font-bold text-ink-2">{truncatedNote}</p>
      )}
    </Window>
  );

  return (
    <div className={lecture ? 'fixed inset-0 z-[60] overflow-y-auto bg-bg px-4 pb-6 pt-4 sm:px-8' : ''} data-lecture={lecture} ref={rootRef}>
      {lecture && (
        <div className="mb-4 flex items-center gap-3">
          <h2 className="min-w-0 flex-1 truncate text-2xl font-black tracking-[-0.02em] text-ink">{algorithm?.entry.title}</h2>
          <span className="hidden text-sm font-bold text-ink-3 md:inline">
            <span className="kbd">Пробел</span> старт · <span className="kbd">←</span> <span className="kbd">→</span> шаги · <span className="kbd">Esc</span>{' '}
            выход
          </span>
          <button className="btn btn-secondary btn-sm" onClick={exitLecture} type="button">
            <Minimize2 size={16} strokeWidth={2.5} />
            Выйти
          </button>
        </div>
      )}

      {(toolbar !== undefined || data !== undefined) && (
        <div className="lecture-hide mb-4 flex flex-wrap items-center gap-2.5">
          {toolbar}
          {data !== undefined && isDesktop && (
            <button
              aria-expanded={desktopDataOpen}
              aria-label={`${data.title ?? 'Входные данные'}: ${data.summary}`}
              className="btn btn-secondary btn-sm ml-auto max-w-[min(440px,100%)]"
              onClick={() => setDesktopDataOpen((current) => !current)}
              type="button"
            >
              <Database size={16} strokeWidth={2.5} />
              <span className="truncate">{data.summary}</span>
              <ChevronDown className={`shrink-0 transition-transform ${desktopDataOpen ? 'rotate-180' : ''}`} size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>
      )}

      <AnimatePresence initial={false}>
        {data !== undefined && isDesktop && desktopDataOpen && !lecture && (
          <motion.div
            animate={{ opacity: 1, height: 'auto' }}
            className="overflow-hidden"
            exit={{ opacity: 0, height: 0 }}
            initial={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.26, ease: ease.out }}
          >
            <Window bodyClassName="p-5" className="mb-4" title={data.title ?? 'Входные данные'}>
              {data.editor}
            </Window>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`grid gap-4 ${lecture ? 'lg:grid-cols-[minmax(0,1fr)_420px]' : 'lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_390px]'}`}>
        <div className="flex min-w-0 flex-col gap-4">
          {stageCard}
          {!floatingBar && <PlayerBar lecture={lecture} onToggleLecture={lecture ? exitLecture : enterLecture} player={player} sticky={false} />}
          {companion}
          {!isDesktop && <StepCard frame={player.frame} index={player.index} total={player.total} />}
          {showResult && !lecture && (
            <>
              <ResultPanel input={resultInput} miss={isMiss(player.frame)} steps={steps} summary={player.frame?.description ?? player.frame?.message ?? null} />
              {resultExtra}
            </>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          {isDesktop && <StepCard frame={player.frame} index={player.index} total={player.total} />}
          <PseudocodePanel activeLine={activeLine} collapsible={!isDesktop} lines={pseudocode} />
          {aside}
          {isDesktop && !lecture && (
            <button
              className="lecture-hide flex items-center gap-2 self-start rounded-xl px-2 py-1 text-sm font-bold text-ink-3 hover:text-ink-2"
              onClick={() => setHelpOpen(true)}
              type="button"
            >
              <Keyboard size={16} strokeWidth={2.5} />
              Горячие клавиши
            </button>
          )}
        </aside>
      </div>

      {below !== undefined && !lecture && <div className="mt-4 flex flex-col gap-4">{below}</div>}

      {floatingBar && (
        <>
          <div aria-hidden="true" className="h-[132px]" />
          <PlayerBar dataLabel={data?.summary} floating onOpenData={data === undefined ? undefined : () => setDataOpen(true)} player={player} />
        </>
      )}

      {data !== undefined && !isDesktop && (
        <Dialog onClose={() => setDataOpen(false)} open={dataOpen} title={data.title ?? 'Входные данные'}>
          {data.editor}
        </Dialog>
      )}

      <Dialog onClose={() => setHelpOpen(false)} open={helpOpen} size="sm" title="Горячие клавиши">
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2.5 text-[15px] font-semibold text-ink-2">
          {[
            ['Пробел', 'старт / пауза'],
            ['← →', 'шаг назад / вперёд'],
            ['Home', 'в начало'],
            ['End', 'к результату'],
            ['+ −', 'скорость'],
            ['F', 'режим лекции'],
            ['Ctrl K', 'поиск по алгоритмам'],
          ].map(([keys, label]) => (
            <div className="contents" key={keys}>
              <dt className="flex gap-1">
                {keys!.split(' ').map((key) => (
                  <span className="kbd" key={key}>
                    {key}
                  </span>
                ))}
              </dt>
              <dd>{label}</dd>
            </div>
          ))}
        </dl>
      </Dialog>
    </div>
  );
}
