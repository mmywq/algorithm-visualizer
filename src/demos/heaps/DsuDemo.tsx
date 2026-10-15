import { motion } from 'framer-motion';
import { Trash2, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { decodeDsuOps, dsuOpLabel, dsuScenario, encodeDsuOps, type DsuOp } from '@/algorithms/structures/dsu';
import type { TreeFrame } from '@/algorithms/trees/treeFrames';
import { TreeDiagram } from '@/components/visualizers/structures/TreeDiagram';
import theory from '@/content/theory/heaps';
import { DemoLayout } from '@/features/demo/DemoLayout';
import type { LegendItem } from '@/features/demo/Legend';
import { ScriptPanel } from '@/features/demo/ScriptPanel';
import { useDemoPlayer } from '@/features/player/useDemoPlayer';
import { useFrames } from '@/features/player/usePlayer';
import { intCodec, useUrlState } from '@/hooks/useUrlState';

const DEFAULT_OPS: readonly DsuOp[] = [
  { kind: 'union', a: 0, b: 1 },
  { kind: 'union', a: 2, b: 3 },
  { kind: 'union', a: 1, b: 3 },
  { kind: 'union', a: 4, b: 5 },
  { kind: 'union', a: 6, b: 7 },
  { kind: 'union', a: 5, b: 7 },
  { kind: 'union', a: 3, b: 7 },
  { kind: 'find', x: 6 },
  { kind: 'union', a: 0, b: 6 },
];

const legend: readonly LegendItem[] = [
  { color: 'rgb(14 10 24)', label: 'представитель (корень)' },
  { color: 'rgb(var(--c-brand))', label: 'текущий элемент' },
  { color: 'rgb(var(--c-yellow))', label: 'найденный корень' },
  { color: 'rgb(var(--c-orange))', label: 'перевешен' },
];

const cellTone: Partial<Record<string, string>> = {
  idle: 'border-[rgb(var(--viz-node-line))] bg-surface text-ink',
  black: 'border-ink-3 bg-[rgb(14_10_24)] text-[rgb(247_242_255)]',
  active: 'border-brand-press bg-brand text-on',
  path: 'border-brand bg-brand/14 text-ink',
  found: 'border-yellow-press bg-yellow text-on',
  new: 'border-orange-press bg-orange text-on',
};

function ParentArray({ frame }: { readonly frame: TreeFrame | null }) {
  const parent = (frame?.meta['parent'] as readonly number[] | undefined) ?? [];
  // цвет ячейки совпадает с цветом узла в лесу
  const toneOf = new Map((frame?.meta.nodes ?? []).map((node) => [Number(node.label), node.tone ?? 'idle']));
  return (
    <div className="rounded-2xl bg-surface-2 px-3 py-3">
      <p className="mb-2 text-center text-[12px] font-extrabold uppercase tracking-wide text-ink-3">массив parent</p>
      <div className="flex flex-wrap justify-center gap-1.5">
        {parent.map((value, index) => {
          const tone = toneOf.get(index) ?? 'idle';
          const lit = tone === 'active' || tone === 'found' || tone === 'new';
          return (
            <div className="flex flex-col items-center gap-1" key={index}>
              <motion.span
                animate={{ scale: lit ? 1.12 : 1 }}
                className={`flex h-10 min-w-10 items-center justify-center rounded-xl border-2 font-mono text-[16px] font-black transition-colors ${cellTone[tone] ?? cellTone.idle}`}
                style={{ boxShadow: 'inset 0 -4px 0 rgb(0 0 0 / 0.18)' }}
              >
                {value}
              </motion.span>
              <span className="font-mono text-[11px] font-bold text-ink-3">{index}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScriptEditor({
  size,
  ops,
  onApply,
}: {
  readonly size: number;
  readonly ops: readonly DsuOp[];
  readonly onApply: (size: number, ops: readonly DsuOp[]) => void;
}) {
  const [draftSize, setDraftSize] = useState(size);
  const [draft, setDraft] = useState<readonly DsuOp[]>(ops);
  const [a, setA] = useState(0);
  const [b, setB] = useState(1);
  useEffect(() => setDraft(ops), [ops]);
  useEffect(() => setDraftSize(size), [size]);
  const elements = Array.from({ length: draftSize }, (_, index) => index);
  const valid = draft.every((op) => (op.kind === 'union' ? op.a < draftSize && op.b < draftSize : op.x < draftSize));
  const add = (op: DsuOp): void => setDraft((current) => (current.length >= 20 ? current : [...current, op]));
  const select = (value: number, onChange: (value: number) => void, label: string) => (
    <select
      aria-label={label}
      className="input input-sm w-16 font-mono"
      onChange={(event) => onChange(Number(event.target.value))}
      value={Math.min(value, draftSize - 1)}
    >
      {elements.map((item) => (
        <option key={item} value={item}>
          {item}
        </option>
      ))}
    </select>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="label mb-0">Элементов</span>
        {[4, 6, 8, 10].map((value) => (
          <button
            className={`btn btn-sm ${draftSize === value ? 'btn-primary' : 'btn-secondary'}`}
            key={value}
            onClick={() => setDraftSize(value)}
            type="button"
          >
            {value}
          </button>
        ))}
      </div>
      <div>
        <p className="label">Операции по порядку</p>
        <div className="flex min-h-[52px] flex-wrap gap-1.5 rounded-2xl border-2 border-line bg-surface-2 p-2.5">
          {draft.length === 0 && <span className="self-center px-1 text-sm font-semibold text-ink-3">Добавьте операции кнопками ниже</span>}
          {draft.map((op, index) => {
            const outOfRange = op.kind === 'union' ? op.a >= draftSize || op.b >= draftSize : op.x >= draftSize;
            return (
              <button
                aria-label={`Убрать ${dsuOpLabel(op)}`}
                className={`rounded-lg border-2 bg-surface px-2 py-1 font-mono text-[12px] font-bold hover:border-red hover:text-red ${outOfRange ? 'border-red text-red' : 'border-line-strong text-ink-2'}`}
                key={`${index}-${dsuOpLabel(op)}`}
                onClick={() => setDraft((current) => current.filter((_, position) => position !== index))}
                type="button"
              >
                {dsuOpLabel(op)} ×
              </button>
            );
          })}
        </div>
        <p className={`mt-1.5 text-sm font-semibold ${valid ? 'text-ink-3' : 'text-red'}`}>
          {valid
            ? 'До 20 операций. Нажмите на операцию, чтобы убрать её.'
            : `Есть операции с элементами больше ${draftSize - 1} — уберите их или увеличьте число элементов.`}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {select(a, setA, 'Первый элемент')}
        {select(b, setB, 'Второй элемент')}
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => add({ kind: 'union', a: Math.min(a, draftSize - 1), b: Math.min(b, draftSize - 1) })}
          type="button"
        >
          union(a, b)
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => add({ kind: 'find', x: Math.min(a, draftSize - 1) })} type="button">
          find(a)
        </button>
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
        <button className="btn btn-primary btn-sm" disabled={draft.length === 0 || !valid} onClick={() => onApply(draftSize, draft)} type="button">
          Применить
        </button>
      </div>
    </div>
  );
}

export default function DsuDemo() {
  const [size, setSize] = useUrlState('n', 8, intCodec(2, 10));
  const codec = useMemo(() => ({ parse: (raw: string) => decodeDsuOps(raw, size), serialize: (value: readonly DsuOp[]) => encodeDsuOps(value) }), [size]);
  const [ops, setOps] = useUrlState<readonly DsuOp[]>('ops', DEFAULT_OPS, codec);
  const safeOps = ops.filter((op) => (op.kind === 'union' ? op.a < size && op.b < size : op.x < size));
  const frameSet = useFrames(() => dsuScenario(size, safeOps), [size, ops]);
  const player = useDemoPlayer(frameSet);
  const frame = player.frame as TreeFrame | null;

  return (
    <DemoLayout
      aside={<ScriptPanel current={frame?.meta['opIndex'] as number | undefined} done={frame?.status === 'completed'} labels={safeOps.map(dsuOpLabel)} />}
      data={{
        title: 'Элементы и операции',
        summary: `${size} эл., ${safeOps.length} опер.`,
        editor: (
          <ScriptEditor
            onApply={(nextSize, nextOps) => {
              setSize(nextSize);
              setOps(nextOps);
            }}
            ops={safeOps}
            size={size}
          />
        ),
      }}
      legend={legend}
      player={player}
      pseudocode={theory.dsu!.pseudocode}
      resultInput={`n = ${size}; ${safeOps.map(dsuOpLabel).join(', ')}`}
      stage={
        <div className="flex flex-col gap-2.5">
          <TreeDiagram binary={false} emptyText="Нет элементов" minHeight={240} nodes={frame?.meta.nodes ?? []} />
          <ParentArray frame={frame} />
        </div>
      }
    />
  );
}
