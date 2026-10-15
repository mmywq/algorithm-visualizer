import { dayKey } from '@/lib/userData';
import { pluralize } from '@/lib/progress';

const WEEKS = 20;
const weekdays = ['Пн', '', 'Ср', '', 'Пт', '', ''];
const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

const level = (count: number): number => (count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 6 ? 3 : 4);
const fill = ['rgb(var(--c-surface-2))', 'rgb(var(--c-green) / 0.3)', 'rgb(var(--c-green) / 0.55)', 'rgb(var(--c-green) / 0.8)', 'rgb(var(--c-green))'];

/** Календарь занятий за 20 недель: каждый квадрат — день, яркость — число учебных действий. */
export function ActivityHeatmap({ activity }: { readonly activity: Readonly<Record<string, number>> }) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  // начало сетки — понедельник, WEEKS недель назад
  const shift = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - shift - (WEEKS - 1) * 7);

  const columns: { date: Date; key: string; count: number; future: boolean }[][] = [];
  let total = 0;
  for (let week = 0; week < WEEKS; week += 1) {
    const column = [];
    for (let day = 0; day < 7; day += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + week * 7 + day);
      const key = dayKey(date);
      const count = activity[key] ?? 0;
      const future = date > today;
      if (!future) total += count;
      column.push({ date, key, count, future });
    }
    columns.push(column);
  }

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex shrink-0 flex-col gap-[3px] pt-5">
          {weekdays.map((label, index) => (
            <span className="h-3.5 text-[10px] font-bold leading-[14px] text-ink-3" key={index}>
              {label}
            </span>
          ))}
        </div>
        <div className="flex gap-[3px]">
          {columns.map((column, index) => {
            const first = column[0]!.date;
            const showMonth = index === 0 || first.getDate() <= 7;
            return (
              <div className="flex flex-col gap-[3px]" key={column[0]!.key}>
                <span className="h-4 whitespace-nowrap text-[10px] font-bold leading-4 text-ink-3">{showMonth ? months[first.getMonth()] : ''}</span>
                {column.map((cell) => (
                  <span
                    className="block h-3.5 w-3.5 rounded-[3px]"
                    key={cell.key}
                    style={{
                      background: cell.future ? 'transparent' : fill[level(cell.count)],
                      outline: cell.key === dayKey(today) ? '2px solid rgb(var(--c-brand))' : undefined,
                    }}
                    title={
                      cell.future
                        ? undefined
                        : `${cell.date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}: ${cell.count} ${pluralize(cell.count, 'действие', 'действия', 'действий')}`
                    }
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px] font-bold text-ink-3">
        <span>
          {total} {pluralize(total, 'учебное действие', 'учебных действия', 'учебных действий')} за {WEEKS} недель
        </span>
        <span className="flex items-center gap-1.5">
          меньше
          {fill.map((color) => (
            <span className="h-3 w-3 rounded-[3px]" key={color} style={{ background: color }} />
          ))}
          больше
        </span>
      </div>
    </div>
  );
}
