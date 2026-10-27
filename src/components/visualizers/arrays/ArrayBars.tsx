import { AnimatePresence, motion } from 'framer-motion';
import { useElementWidth } from '@/hooks/useElementSize';
import { ease, exitFast, spring } from '@/lib/motion';
import type { ArrayAlgorithmFrame, ArrayItem } from '@/types';

interface ArrayBarsProps {
  readonly frame: ArrayAlgorithmFrame | null;
  readonly height?: number;
  readonly showIndices?: boolean;
}

type Tone = 'idle' | 'compare' | 'swap' | 'sorted' | 'pivot' | 'found' | 'muted';

const toneColors: Record<Tone, { fill: string; press: string; ink: string }> = {
  idle: { fill: 'rgb(var(--viz-bar))', press: 'rgb(var(--viz-bar-press))', ink: 'rgb(var(--viz-node-ink))' },
  compare: { fill: 'rgb(var(--c-brand))', press: 'rgb(var(--c-brand-press))', ink: 'rgb(var(--c-on))' },
  swap: { fill: 'rgb(var(--c-orange))', press: 'rgb(var(--c-orange-press))', ink: 'rgb(var(--c-on))' },
  sorted: { fill: 'rgb(var(--c-green))', press: 'rgb(var(--c-green-press))', ink: 'rgb(var(--c-on))' },
  pivot: { fill: 'rgb(var(--c-purple))', press: 'rgb(var(--c-purple-press))', ink: 'rgb(var(--c-on))' },
  found: { fill: 'rgb(var(--c-yellow))', press: 'rgb(var(--c-yellow-press))', ink: 'rgb(var(--c-on))' },
  muted: { fill: 'rgb(var(--viz-empty))', press: 'rgb(var(--viz-node-line))', ink: 'rgb(var(--c-ink-3))' },
};

export const arrayLegend = [
  { color: toneColors.compare.fill, label: 'сравниваются' },
  { color: toneColors.swap.fill, label: 'обмен или запись' },
  { color: toneColors.sorted.fill, label: 'на своём месте' },
  { color: toneColors.idle.fill, label: 'ожидают' },
] as const;

const getTone = (frame: ArrayAlgorithmFrame | null, index: number): Tone => {
  const meta = frame?.meta;
  if (meta === undefined) return 'idle';
  if (meta.foundIndex === index) return 'found';
  if (meta.swappingIndices?.includes(index) === true) return 'swap';
  if (meta.comparingIndices?.includes(index) === true || meta.probeIndex === index) return 'compare';
  if (meta.pivotIndex === index) return 'pivot';
  if (meta.sortedIndices?.includes(index) === true) return 'sorted';
  if (meta.discardedIndices?.includes(index) === true) return 'muted';
  if (meta.range !== undefined && (index < meta.range[0] || index > meta.range[1])) return 'muted';
  return 'idle';
};

const GAP = 6;

export function ArrayBars({ frame, height = 260, showIndices = true }: ArrayBarsProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const items = frame?.data ?? [];
  const count = Math.max(1, items.length);
  const barWidth = Math.max(16, Math.min(58, Math.floor((width - 24 - GAP * (count - 1)) / count)));
  const values = items.map((item) => item.value);
  const maxPositive = Math.max(0, ...values);
  const maxNegative = Math.max(0, ...values.map((value) => -value));
  const span = maxPositive + maxNegative;
  const plotHeight = height - 26;
  const scale = span === 0 ? 0 : plotHeight / span;
  const baseline = maxPositive * scale;
  const pointers = Object.entries(frame?.meta.pointers ?? {});
  const fontSize = barWidth < 26 ? 11 : barWidth < 36 ? 12.5 : 14;

  return (
    <div className="viz-stage px-3 pb-2 pt-4" ref={ref}>
      <div className="relative mx-auto" style={{ height: plotHeight, width: count * barWidth + (count - 1) * GAP }}>
        {maxNegative > 0 && (
          <div className="pointer-events-none absolute -left-2 -right-2 border-t-2 border-dashed border-line-strong" style={{ top: baseline }}>
            <span className="absolute -left-1 -top-2.5 -translate-x-full rounded bg-surface px-1 font-mono text-[10px] font-bold text-ink-3">0</span>
          </div>
        )}
        {frame?.meta.targetValue !== undefined && items.length > 0 && (
          <TargetLine baseline={baseline} plotHeight={plotHeight} scale={scale} value={frame.meta.targetValue} />
        )}
        {items.map((item, index) => (
          <Bar
            barWidth={barWidth}
            baseline={baseline}
            fontSize={fontSize}
            index={index}
            item={item}
            key={item.id}
            plotHeight={plotHeight}
            scale={scale}
            tone={getTone(frame, index)}
          />
        ))}
        {items.length === 0 && <p className="absolute inset-0 flex items-center justify-center text-sm font-bold text-ink-3">Задайте входные данные</p>}
      </div>

      {showIndices && (
        <div className="relative mx-auto mt-1.5 h-[18px]" style={{ width: count * barWidth + (count - 1) * GAP }}>
          {items.map((_item, index) => (
            <span
              className="absolute top-0 text-center font-mono text-[11px] font-bold text-ink-3"
              key={`idx-${index}`}
              style={{ left: index * (barWidth + GAP), width: barWidth }}
            >
              {index}
            </span>
          ))}
        </div>
      )}

      {pointers.length > 0 && (
        <div className="relative mx-auto h-7" style={{ width: count * barWidth + (count - 1) * GAP }}>
          <AnimatePresence>
            {groupPointers(pointers).map(([position, names]) => (
              <motion.span
                animate={{ x: position * (barWidth + GAP) + barWidth / 2, opacity: 1 }}
                className="absolute left-0 top-0.5"
                exit={{ opacity: 0, transition: exitFast }}
                initial={{ x: position * (barWidth + GAP) + barWidth / 2, opacity: 0 }}
                key={names.join('+')}
                transition={spring.viz}
              >
                <span className="block -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-1.5 py-0.5 font-mono text-[11px] font-bold text-surface">
                  ▲ {names.join(', ')}
                </span>
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/** Пунктир на уровне искомого значения: видно, какие столбики выше и ниже ключа. */
function TargetLine({
  value,
  baseline,
  scale,
  plotHeight,
}: {
  readonly value: number;
  readonly baseline: number;
  readonly scale: number;
  readonly plotHeight: number;
}) {
  const top = Math.max(0, Math.min(plotHeight, baseline - value * scale));
  return (
    <motion.div
      animate={{ y: top }}
      aria-hidden="true"
      className="pointer-events-none absolute -left-3 -right-3 top-0 z-10 border-t-[3px] border-dashed border-yellow"
      initial={false}
      transition={spring.viz}
    >
      <span
        className="absolute -left-1 -top-[13px] rounded-md bg-yellow px-1.5 py-0.5 font-mono text-[11px] font-black leading-none text-on"
        style={{ boxShadow: '2px 2px 0 rgb(var(--c-hard))' }}
      >
        x = {value}
      </span>
    </motion.div>
  );
}

const groupPointers = (pointers: readonly (readonly [string, number])[]): readonly (readonly [number, readonly string[]])[] => {
  const byPosition = new Map<number, string[]>();
  for (const [name, position] of pointers) {
    if (position < 0) continue;
    byPosition.set(position, [...(byPosition.get(position) ?? []), name]);
  }
  return [...byPosition.entries()];
};

interface BarProps {
  readonly item: ArrayItem;
  readonly index: number;
  readonly tone: Tone;
  readonly barWidth: number;
  readonly baseline: number;
  readonly scale: number;
  readonly plotHeight: number;
  readonly fontSize: number;
}

function Bar({ item, index, tone, barWidth, baseline, scale, plotHeight, fontSize }: BarProps) {
  const isNegative = item.value < 0;
  const raw = Math.abs(item.value) * scale;
  const barHeight = item.value === 0 ? 6 : Math.max(22, Math.min(plotHeight, raw));
  const top = isNegative ? baseline : Math.max(0, baseline - barHeight);
  const colors = toneColors[tone];
  const lifted = tone === 'compare' || tone === 'swap' || tone === 'found';

  return (
    <motion.div
      animate={{ x: index * (barWidth + GAP), y: lifted ? -6 : 0 }}
      className="absolute left-0 top-0"
      initial={false}
      style={{ width: barWidth, height: plotHeight }}
      transition={spring.viz}
    >
      <motion.div
        animate={{ top, height: barHeight, backgroundColor: colors.fill, color: colors.ink, boxShadow: `inset 0 -5px 0 ${colors.press}` }}
        className={`absolute inset-x-0 flex justify-center font-mono font-extrabold ${isNegative ? 'items-end rounded-b-[10px] pb-1.5' : 'items-start rounded-t-[10px] pt-1'}`}
        initial={false}
        // цвет текста перекрашивается вместе с фоном — иначе на миг проседает контраст
        style={{ fontSize }}
        transition={{ duration: 0.3, ease: ease.out }}
      >
        {barWidth >= 20 ? item.value : ''}
      </motion.div>
    </motion.div>
  );
}
