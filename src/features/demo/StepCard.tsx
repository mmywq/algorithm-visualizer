import { AnimatePresence, motion } from 'framer-motion';
import { PixelCat, type CatPose } from '@/components/mascot/PixelCat';
import { Window } from '@/components/ui/Window';
import type { ColorName } from '@/content/catalog';
import { isMiss, type AnyFrame } from '@/features/player/usePlayer';

const phaseLabels: Record<string, string> = {
  initial: 'ПОДГОТОВКА',
  inspect: 'ПРОВЕРКА',
  compare: 'СРАВНЕНИЕ',
  swap: 'ОБМЕН',
  visit: 'ПОСЕЩЕНИЕ',
  enqueue: 'В ОЧЕРЕДЬ',
  dequeue: 'ИЗ ОЧЕРЕДИ',
  push: 'ДОБАВЛЕНИЕ',
  pop: 'УДАЛЕНИЕ',
  merge: 'ЗАПИСЬ',
  discard: 'ОТСЕЧЕНИЕ',
  complete: 'ГОТОВО',
};

const phaseColor: Record<string, ColorName> = {
  compare: 'brand',
  swap: 'orange',
  merge: 'orange',
  push: 'green',
  enqueue: 'green',
  pop: 'red',
  dequeue: 'red',
  visit: 'purple',
  discard: 'teal',
  complete: 'green',
};

/** Поза кота-рассказчика по типу шага: думает над сравнением, удивляется обмену, радуется финалу. */
const phasePose = (phase: string): CatPose => {
  if (phase === 'complete') return 'happy';
  if (phase === 'swap' || phase === 'merge' || phase === 'pop') return 'wow';
  if (phase === 'compare' || phase === 'inspect') return 'think';
  return 'sit';
};

interface StepCardProps {
  readonly frame: AnyFrame | null;
  readonly index: number;
  readonly total: number;
}

/** Пояснение текущего шага от лица Кэша. Текст плавно сменяется при переходе между кадрами. */
export function StepCard({ frame, index, total }: StepCardProps) {
  const text = frame?.description ?? frame?.message ?? 'Нажмите «Запустить» или листайте шаги стрелками — я расскажу, что происходит на каждом шаге.';
  const phase = frame?.phase ?? 'initial';
  const miss = isMiss(frame);
  const color = miss ? 'red' : phaseColor[phase];

  return (
    <Window
      actions={
        <span className="font-display text-[16px] leading-none text-ink-3">
          {total === 0 ? 0 : index + 1}/{total}
        </span>
      }
      as="section"
      bodyClassName="flex gap-3.5 p-4 sm:p-5"
      title="Пояснение"
    >
      <div className="hidden shrink-0 pt-1 sm:block">
        <PixelCat pose={miss ? 'cry' : phasePose(phase)} size={52} />
      </div>
      <div aria-live="polite" className="min-w-0 flex-1">
        <span
          className="tag"
          style={
            color === undefined
              ? { borderColor: 'rgb(var(--c-line-strong))', color: 'rgb(var(--c-ink-2))' }
              : { borderColor: `rgb(var(--c-${color}))`, color: `rgb(var(--c-${color}))` }
          }
        >
          {miss ? 'НЕ НАЙДЕНО' : (phaseLabels[phase] ?? 'ШАГ')}
        </span>
        <div className="relative mt-2.5 min-h-[84px]">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.p
              animate={{ opacity: 1, y: 0 }}
              className="text-[16px] font-semibold leading-7 text-ink"
              exit={{ opacity: 0, y: -6 }}
              initial={{ opacity: 0, y: 6 }}
              key={`${index}-${text.slice(0, 24)}`}
              transition={{ duration: 0.18 }}
            >
              {text}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </Window>
  );
}
