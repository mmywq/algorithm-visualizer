import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import type { TreeFrame } from '@/algorithms/trees/treeFrames';
import { TreeDiagram, treeLegend } from '@/components/visualizers/structures/TreeDiagram';
import type { LegendItem } from '@/features/demo/Legend';
import type { PseudocodeLine } from '@/types';
import type { NumbersInputOptions } from './ArrayAlgorithmDemo';
import { KeyedDemo, type KeyAction } from './KeyedDemo';

interface TreeAlgorithmDemoProps {
  readonly build: (values: readonly number[]) => Generator<TreeFrame, unknown, unknown>;
  readonly buildLabel?: string;
  readonly pseudocode: readonly PseudocodeLine[];
  readonly defaultValues: readonly number[];
  readonly actions?: readonly KeyAction<TreeFrame>[];
  readonly defaultTarget?: number;
  readonly keyHint?: string;
  readonly input?: NumbersInputOptions;
  readonly legendItems?: readonly LegendItem[];
  readonly binary?: boolean;
  readonly aside?: (frame: TreeFrame | null) => ReactNode;
}

/** Строка значений под деревом: порядок обхода, путь поиска, содержимое стека. */
export function SequenceStrip({ label, items, tone = 'brand' }: { readonly label: string; readonly items: readonly string[]; readonly tone?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-surface-2 px-3 py-2.5">
      <span className="mr-1 text-[13px] font-black text-ink-2">{label}:</span>
      {items.length === 0 && <span className="text-sm font-bold text-ink-3">пусто</span>}
      <AnimatePresence initial={false}>
        {items.map((item, index) => (
          <motion.span
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-lg px-2 py-0.5 font-mono text-[14px] font-black text-on"
            exit={{ opacity: 0, scale: 0.5 }}
            initial={{ opacity: 0, scale: 0.5 }}
            key={`${index}-${item}`}
            layout
            style={{ background: `rgb(var(--c-${tone}))`, boxShadow: `inset 0 -3px 0 rgb(var(--c-${tone}-press))` }}
          >
            {item}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function TreeStage({ frame, binary = true }: { readonly frame: TreeFrame | null; readonly binary?: boolean }) {
  const meta = frame?.meta;
  return (
    <div className="flex flex-col gap-2.5">
      <TreeDiagram binary={binary} nodes={meta?.nodes ?? []} />
      {meta?.aux !== undefined && <SequenceStrip items={meta.aux} label={meta.auxLabel ?? 'Структура'} tone="purple" />}
      {meta?.output !== undefined && (
        <SequenceStrip items={meta.output} label={meta.outputLabel ?? 'Результат'} tone={meta.found === true ? 'green' : 'brand'} />
      )}
    </div>
  );
}

export function TreeAlgorithmDemo({ legendItems = treeLegend, binary = true, ...props }: TreeAlgorithmDemoProps) {
  return <KeyedDemo<TreeFrame> {...props} legend={() => legendItems} renderStage={(frame) => <TreeStage binary={binary} frame={frame} />} />;
}
