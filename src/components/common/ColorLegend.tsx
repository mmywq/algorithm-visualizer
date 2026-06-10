export interface LegendItem {
  readonly color: string;
  readonly label: string;
}

interface ColorLegendProps {
  readonly items: readonly LegendItem[];
}

export function ColorLegend({ items }: ColorLegendProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-app-muted">
      {items.map((item) => (
        <span className="inline-flex items-center gap-2" key={item.label}>
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
