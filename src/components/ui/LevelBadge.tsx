import type { Level } from '@/content/catalog';
import { levelLabels } from '@/content/catalog';

/** Три «ступеньки» сложности, заполненные по уровню. */
export function LevelBadge({ level, showLabel = true }: { readonly level: Level; readonly showLabel?: boolean }) {
  return (
    <span className="chip" title={`Уровень: ${levelLabels[level]}`}>
      <span aria-hidden="true" className="inline-flex items-end gap-[2px]">
        {[1, 2, 3].map((step) => (
          <span className={`w-[4px] rounded-[2px] ${step <= level ? 'bg-cat' : 'bg-line-strong'}`} key={step} style={{ height: 4 + step * 3 }} />
        ))}
      </span>
      {showLabel && levelLabels[level]}
    </span>
  );
}
