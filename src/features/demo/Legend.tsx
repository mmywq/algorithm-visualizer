export interface LegendItem {
  readonly color: string;
  readonly label: string;
  readonly shape?: 'dot' | 'ring' | 'line';
}

export function Legend({ items }: { readonly items: readonly LegendItem[] }) {
  if (items.length === 0) return null;
  return (
    <ul aria-label="Обозначения цветов" className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] font-bold text-ink-2">
      {items.map((item) => (
        <li className="inline-flex items-center gap-2" key={item.label}>
          {item.shape === 'line' ? (
            <span className="h-1 w-4 rounded-full" style={{ background: item.color }} />
          ) : item.shape === 'ring' ? (
            <span className="h-3.5 w-3.5 rounded-full border-[3px] border-dashed" style={{ borderColor: item.color }} />
          ) : (
            <span
              className="h-3.5 w-3.5 rounded-[5px]"
              style={{ background: item.color, boxShadow: 'inset 0 -3px 0 rgb(0 0 0 / 0.18), 0 0 0 1px rgb(var(--c-line-strong))' }}
            />
          )}
          {item.label}
        </li>
      ))}
    </ul>
  );
}
