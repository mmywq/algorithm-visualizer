import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeftToLine, ArrowRightToLine, Trash2, Undo2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DEQUE_CAPACITY, decodeOps, dequeScript, encodeOps, opLabel, type DequeFrame, type DequeOp } from '@/algorithms/structures/deque';
import theory from '@/content/theory/linear';
import { DemoLayout } from '@/features/demo/DemoLayout';
import type { LegendItem } from '@/features/demo/Legend';
import { ScriptPanel } from '@/features/demo/ScriptPanel';
import { useDemoPlayer } from '@/features/player/useDemoPlayer';
import { useFrames } from '@/features/player/usePlayer';
import { useElementWidth } from '@/hooks/useElementSize';
import { useUrlState } from '@/hooks/useUrlState';
import { spring } from '@/lib/motion';

const opsCodec = { parse: decodeOps, serialize: (ops: readonly DequeOp[]) => encodeOps(ops) };

const presets: readonly { name: string; ops: readonly DequeOp[] }[] = [
  {
    name: 'Обе стороны',
    ops: [
      { kind: 'push-back', value: 5 },
      { kind: 'push-back', value: 3 },
      { kind: 'push-front', value: 8 },
      { kind: 'push-front', value: 1 },
      { kind: 'pop-back' },
      { kind: 'push-back', value: 7 },
      { kind: 'pop-front' },
      { kind: 'pop-front' },
    ],
  },
  {
    name: 'По кругу',
    ops: [
      { kind: 'push-back', value: 1 },
      { kind: 'push-back', value: 2 },
      { kind: 'push-back', value: 3 },
      { kind: 'push-back', value: 4 },
      { kind: 'push-back', value: 5 },
      { kind: 'push-back', value: 6 },
      { kind: 'pop-front' },
      { kind: 'pop-front' },
      { kind: 'pop-front' },
      { kind: 'push-back', value: 7 },
      { kind: 'push-back', value: 8 },
      { kind: 'push-back', value: 9 },
    ],
  },
  {
    name: 'Переполнение',
    ops: [
      { kind: 'push-front', value: 1 },
      { kind: 'push-front', value: 2 },
      { kind: 'push-front', value: 3 },
      { kind: 'push-back', value: 4 },
      { kind: 'push-back', value: 5 },
      { kind: 'push-back', value: 6 },
      { kind: 'push-front', value: 7 },
      { kind: 'push-back', value: 8 },
      { kind: 'push-back', value: 9 },
    ],
  },
];

const DEFAULT_OPS = presets[0]!.ops;

const legend: readonly LegendItem[] = [
  { color: 'rgb(var(--c-purple))', label: 'элемент дека' },
  { color: 'rgb(var(--c-brand))', label: 'рабочая ячейка' },
  { color: 'rgb(var(--c-green))', label: 'запись' },
  { color: 'rgb(var(--c-red))', label: 'извлечение' },
];

type CellTone = 'empty' | 'filled' | 'active' | 'written' | 'cleared';

const cellTone = (frame: DequeFrame | null, index: number): CellTone => {
  if (frame === null) return 'empty';
  const meta = frame.meta;
  if (meta.activeIndex === index) return meta.written === true ? 'written' : meta.cleared === true ? 'cleared' : 'active';
  return frame.data.cells[index] === null ? 'empty' : 'filled';
};

const toneStyle: Record<CellTone, string> = {
  empty: 'border-dashed border-line-strong bg-[rgb(var(--viz-bg))] text-ink-3',
  filled: 'border-purple-press bg-purple text-on',
  active: 'border-brand-press bg-brand text-on',
  written: 'border-green-press bg-green text-on',
  cleared: 'border-dashed border-red bg-red/12 text-red',
};

const backIndex = (frame: DequeFrame): number | null => (frame.data.size === 0 ? null : (frame.data.front + frame.data.size - 1) % frame.data.cells.length);

function Cell({ frame, index, size }: { readonly frame: DequeFrame | null; readonly index: number; readonly size: number }) {
  const tone = cellTone(frame, index);
  const value = frame?.data.cells[index] ?? null;
  return (
    <motion.div
      animate={{ scale: tone === 'active' || tone === 'written' || tone === 'cleared' ? 1.1 : 1 }}
      className={`flex items-center justify-center rounded-xl border-2 font-mono font-black transition-colors duration-200 ${toneStyle[tone]}`}
      style={{
        width: size,
        height: size,
        fontSize: size > 44 ? 17 : 14,
        boxShadow: tone === 'empty' || tone === 'cleared' ? 'none' : 'inset 0 -4px 0 rgb(0 0 0 / 0.2)',
      }}
      transition={spring.viz}
    >
      <AnimatePresence mode="popLayout">
        <motion.span animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} initial={{ opacity: 0, y: -8 }} key={String(value)}>
          {value ?? '·'}
        </motion.span>
      </AnimatePresence>
    </motion.div>
  );
}

function Marker({ name }: { readonly name: 'front' | 'back' }) {
  return (
    <span
      className={`whitespace-nowrap rounded-md px-1.5 py-0.5 font-mono text-[11px] font-black leading-[14px] ${name === 'front' ? 'bg-yellow text-on' : 'bg-teal text-on'}`}
    >
      {name}
    </span>
  );
}

/** Кольцо ячеек: индекс 0 сверху, дальше по часовой стрелке. Рядом с ячейками — метки front и back. */
function DequeRing({ frame }: { readonly frame: DequeFrame | null }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const capacity = frame?.data.cells.length ?? DEQUE_CAPACITY;
  const diameter = Math.max(240, Math.min(340, width - 24));
  const cell = diameter >= 300 ? 50 : 42;
  const radius = diameter / 2 - cell / 2 - 34;
  const center = diameter / 2;
  const front = frame === null || frame.data.size === 0 ? null : frame.data.front;
  const back = frame === null ? null : backIndex(frame);

  const point = (index: number, r: number) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / capacity;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  };

  return (
    <div className="flex justify-center" ref={ref}>
      <div className="relative" style={{ width: diameter, height: diameter }}>
        <svg aria-hidden="true" className="absolute inset-0" height={diameter} width={diameter}>
          <circle cx={center} cy={center} fill="none" r={radius} stroke="rgb(var(--viz-node-line))" strokeDasharray="4 7" strokeWidth={3} />
        </svg>
        {Array.from({ length: capacity }, (_, index) => {
          const position = point(index, radius);
          const markers = [...(index === front ? (['front'] as const) : []), ...(index === back ? (['back'] as const) : [])];
          const label = point(index, radius + cell / 2 + (markers.length > 0 ? 24 : 13));
          return (
            <div key={index}>
              <div className="absolute" style={{ left: position.x - cell / 2, top: position.y - cell / 2 }}>
                <Cell frame={frame} index={index} size={cell} />
              </div>
              <div className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5" style={{ left: label.x, top: label.y }}>
                {markers.length > 0 ? (
                  markers.map((name) => (
                    <motion.span animate={{ opacity: 1, scale: 1 }} initial={{ opacity: 0, scale: 0.6 }} key={name}>
                      <Marker name={name} />
                    </motion.span>
                  ))
                ) : (
                  <span className="font-mono text-[11px] font-bold text-ink-3">{index}</span>
                )}
              </div>
            </div>
          );
        })}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-[32px] leading-none text-ink">
            {frame?.data.size ?? 0}/{capacity}
          </span>
          <span className="mt-1 text-[12px] font-extrabold text-ink-3">занято</span>
        </div>
      </div>
    </div>
  );
}

/** Та же память в виде обычного массива: видно, что элементы дека могут лежать «через край». */
function DequeStrip({ frame }: { readonly frame: DequeFrame | null }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const capacity = frame?.data.cells.length ?? DEQUE_CAPACITY;
  const front = frame === null || frame.data.size === 0 ? null : frame.data.front;
  const back = frame === null ? null : backIndex(frame);
  const size = width === 0 ? 36 : Math.max(26, Math.min(40, Math.floor((width - 20 - (capacity - 1) * 5) / capacity)));
  return (
    <div className="flex justify-center gap-[5px]" ref={ref}>
      {Array.from({ length: capacity }, (_, index) => (
        <div className="flex flex-col items-center gap-1" key={index} style={{ width: size }}>
          <Cell frame={frame} index={index} size={size} />
          <span className="font-mono text-[11px] font-bold text-ink-3">{index}</span>
          <div className="flex h-9 flex-col items-center gap-0.5">
            {index === front && <Marker name="front" />}
            {index === back && <Marker name="back" />}
          </div>
        </div>
      ))}
    </div>
  );
}

function DequeStage({ frame }: { readonly frame: DequeFrame | null }) {
  const order = frame === null ? [] : Array.from({ length: frame.data.size }, (_, k) => frame.data.cells[(frame.data.front + k) % frame.data.cells.length]!);
  const output = frame?.meta.output ?? [];
  return (
    <div className="viz-stage flex flex-col gap-4 px-3 py-4">
      <DequeRing frame={frame} />
      <div>
        <p className="mb-2 text-center text-[12px] font-extrabold uppercase tracking-wide text-ink-3">в памяти</p>
        <DequeStrip frame={frame} />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] font-bold text-ink-2">
        <span>
          Дек: <span className="font-mono font-black text-ink">{order.length === 0 ? 'пуст' : order.join(' ⇄ ')}</span>
        </span>
        {output.length > 0 && (
          <span>
            Извлечены: <span className="font-mono font-black text-red">{output.join(', ')}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function ScriptEditor({ value, onApply }: { readonly value: readonly DequeOp[]; readonly onApply: (ops: readonly DequeOp[]) => void }) {
  const [draft, setDraft] = useState<readonly DequeOp[]>(value);
  const [number, setNumber] = useState('4');
  useEffect(() => setDraft(value), [value]);

  const parsed = Number(number.trim().replace('−', '-'));
  const valid = number.trim().length > 0 && Number.isInteger(parsed) && Math.abs(parsed) <= 99;
  const add = (op: DequeOp): void => setDraft((current) => (current.length >= 24 ? current : [...current, op]));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="label">Операции по порядку</p>
        <div className="flex min-h-[52px] flex-wrap gap-1.5 rounded-2xl border-2 border-line bg-surface-2 p-2.5">
          {draft.length === 0 && <span className="self-center px-1 text-sm font-semibold text-ink-3">Добавьте операции кнопками ниже</span>}
          {draft.map((op, index) => (
            <button
              aria-label={`Убрать ${opLabel(op)}`}
              className="rounded-lg border-2 border-line-strong bg-surface px-2 py-1 font-mono text-[12px] font-bold text-ink-2 hover:border-red hover:text-red"
              key={`${index}-${opLabel(op)}`}
              onClick={() => setDraft((current) => current.filter((_, position) => position !== index))}
              type="button"
            >
              {opLabel(op)} ×
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-sm font-semibold text-ink-3">
          До 24 операций, ёмкость буфера — {DEQUE_CAPACITY} ячеек. Нажмите на операцию, чтобы убрать её.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="label" htmlFor="deque-value">
            Значение
          </label>
          <input
            aria-invalid={!valid}
            className={`input input-sm w-20 font-mono ${valid ? '' : 'input-error'}`}
            id="deque-value"
            inputMode="numeric"
            onChange={(event) => setNumber(event.target.value)}
            value={number}
          />
        </div>
        <button className="btn btn-secondary btn-sm" disabled={!valid} onClick={() => add({ kind: 'push-front', value: parsed })} type="button">
          <ArrowLeftToLine size={16} strokeWidth={2.5} />
          push_front
        </button>
        <button className="btn btn-secondary btn-sm" disabled={!valid} onClick={() => add({ kind: 'push-back', value: parsed })} type="button">
          push_back
          <ArrowRightToLine size={16} strokeWidth={2.5} />
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => add({ kind: 'pop-front' })} type="button">
          pop_front
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => add({ kind: 'pop-back' })} type="button">
          pop_back
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {presets.map((preset) => (
          <button className="btn btn-ghost btn-sm" key={preset.name} onClick={() => setDraft(preset.ops)} type="button">
            {preset.name}
          </button>
        ))}
        <span className="flex-1" />
        <button
          aria-label="Убрать последнюю операцию"
          className="btn btn-ghost btn-sm btn-icon"
          onClick={() => setDraft((current) => current.slice(0, -1))}
          type="button"
        >
          <Undo2 size={16} strokeWidth={2.5} />
        </button>
        <button aria-label="Очистить сценарий" className="btn btn-ghost btn-sm btn-icon" onClick={() => setDraft([])} type="button">
          <Trash2 size={16} strokeWidth={2.5} />
        </button>
        <button className="btn btn-primary btn-sm" disabled={draft.length === 0} onClick={() => onApply(draft)} type="button">
          Применить
        </button>
      </div>
    </div>
  );
}

export default function DequeDemo() {
  const [ops, setOps] = useUrlState<readonly DequeOp[]>('ops', DEFAULT_OPS, opsCodec);
  const frameSet = useFrames(() => dequeScript(ops), [ops]);
  const player = useDemoPlayer(frameSet);

  return (
    <DemoLayout
      aside={
        <ScriptPanel
          current={player.frame?.meta.opIndex}
          done={player.frame?.status === 'completed'}
          labels={ops.map(opLabel)}
          rejected={player.frame?.meta.rejected !== undefined}
        />
      }
      data={{
        title: 'Сценарий операций',
        summary: `${ops.length} опер.: ${ops.slice(0, 3).map(opLabel).join(', ')}${ops.length > 3 ? '…' : ''}`,
        editor: <ScriptEditor onApply={setOps} value={ops} />,
      }}
      legend={legend}
      player={player}
      pseudocode={theory['deque']?.pseudocode ?? []}
      resultInput={ops.map(opLabel).join(', ')}
      stage={<DequeStage frame={player.frame} />}
    />
  );
}
