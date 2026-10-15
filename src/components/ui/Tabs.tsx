import { motion } from 'framer-motion';
import { useId, type ReactNode } from 'react';

export interface TabItem<T extends string> {
  readonly value: T;
  readonly label: ReactNode;
  readonly icon?: ReactNode;
  readonly badge?: ReactNode;
}

interface TabsProps<T extends string> {
  readonly items: readonly TabItem<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly className?: string;
  readonly size?: 'sm' | 'md';
  readonly stretch?: boolean;
  readonly ariaLabel?: string;
}

/** Сегментированный переключатель с «переезжающей» подложкой активной вкладки. */
export function Tabs<T extends string>({ items, value, onChange, className = '', size = 'md', stretch = false, ariaLabel }: TabsProps<T>) {
  const layoutId = useId();

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const index = items.findIndex((item) => item.value === value);
    const nextIndex = (index + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
    const next = items[nextIndex];
    if (next !== undefined) {
      onChange(next.value);
      const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      buttons[nextIndex]?.focus();
    }
  };

  return (
    <div
      aria-label={ariaLabel}
      className={`inline-flex gap-1 rounded-2xl border-2 border-line bg-surface-2 p-1 ${stretch ? 'flex w-full' : ''} ${className}`}
      onKeyDown={onKeyDown}
      role="tablist"
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            aria-selected={active}
            className={`relative inline-flex items-center justify-center gap-1.5 rounded-xl font-extrabold transition-colors ${
              size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-10 px-4 text-[15px]'
            } ${stretch ? 'flex-1' : ''} ${active ? 'text-ink' : 'text-ink-3 hover:text-ink-2'}`}
            key={item.value}
            onClick={() => onChange(item.value)}
            role="tab"
            tabIndex={active ? 0 : -1}
            type="button"
          >
            {active && (
              <motion.span
                className="absolute inset-0 rounded-xl border-2 border-line bg-surface"
                layoutId={layoutId}
                style={{ boxShadow: '0 2px 0 rgb(var(--c-line))' }}
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative z-[1] inline-flex items-center gap-1.5">
              {item.icon}
              {item.label}
              {item.badge}
            </span>
          </button>
        );
      })}
    </div>
  );
}
