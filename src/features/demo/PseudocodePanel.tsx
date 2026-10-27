import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import { Window } from '@/components/ui/Window';
import { spring } from '@/lib/motion';
import type { PseudocodeLine } from '@/types';

interface PseudocodePanelProps {
  readonly lines: readonly PseudocodeLine[];
  readonly activeLine: number | null;
  readonly collapsible?: boolean;
}

/** Псевдокод с подсветкой текущей строки; пояснение показывается только у активной строки. */
export function PseudocodePanel({ lines, activeLine, collapsible = false }: PseudocodePanelProps) {
  const highlightId = useId();
  const [open, setOpen] = useState(!collapsible);
  if (lines.length === 0) return null;

  return (
    <Window
      actions={
        collapsible ? (
          <button
            aria-expanded={open}
            aria-label={open ? 'Свернуть псевдокод' : 'Развернуть псевдокод'}
            className="btn btn-ghost btn-sm btn-icon -my-2"
            onClick={() => setOpen((current) => !current)}
            type="button"
          >
            <ChevronDown className={`transition-transform ${open ? 'rotate-180' : ''}`} size={18} strokeWidth={2.5} />
          </button>
        ) : undefined
      }
      bodyClassName={open ? 'p-3 sm:p-4' : 'hidden'}
      title="Псевдокод"
    >
      <ol className="space-y-0.5 font-mono text-[13px] leading-6">
        {lines.map((line, index) => {
          const active = activeLine === index + 1;
          return (
            <li className="relative rounded-lg px-2.5 py-1.5" key={`${index}-${line.code}`}>
              {active && (
                <motion.span
                  className="absolute inset-0 rounded-lg border-2 border-cat bg-cat/12"
                  layoutId={highlightId}
                  style={{ boxShadow: '0 0 18px -6px rgb(var(--cat))' }}
                  transition={spring.snappy}
                />
              )}
              <div className="relative flex gap-2.5">
                <span className={`w-5 shrink-0 select-none text-right ${active ? 'font-bold text-cat' : 'text-ink-3'}`}>{index + 1}</span>
                <span className={active ? 'font-bold text-ink' : 'text-ink-2'}>{line.code}</span>
              </div>
              {active && line.note !== undefined && (
                <motion.p
                  animate={{ opacity: 1, height: 'auto' }}
                  className="relative ml-[30px] mt-1 font-sans text-[13px] font-semibold leading-5 text-ink-2"
                  initial={{ opacity: 0, height: 0 }}
                >
                  {line.note}
                </motion.p>
              )}
            </li>
          );
        })}
      </ol>
    </Window>
  );
}
