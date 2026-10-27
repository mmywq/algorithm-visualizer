import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ease, exitFast } from '@/lib/motion';

export interface MenuItem {
  readonly key: string;
  readonly label: ReactNode;
  readonly icon?: ReactNode;
  readonly hint?: ReactNode;
  readonly onSelect: () => void;
  readonly danger?: boolean;
  readonly disabled?: boolean;
}

interface MenuProps {
  readonly trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  readonly items: readonly (MenuItem | 'divider')[];
  readonly align?: 'left' | 'right';
  /** куда раскрываться: вниз (по умолчанию) или вверх — для панелей у нижнего края экрана */
  readonly direction?: 'down' | 'up';
  readonly width?: number;
  readonly header?: ReactNode;
}

export function Menu({ trigger, items, align = 'right', direction = 'down', width = 248, header }: MenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent): void => {
      if (rootRef.current !== null && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      {trigger({ open, toggle: () => setOpen((current) => !current) })}
      <AnimatePresence>
        {open && (
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`absolute z-[70] overflow-hidden rounded-2xl border-2 border-line-strong bg-surface p-1.5 shadow-float ${direction === 'up' ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]'} ${align === 'right' ? 'right-0' : 'left-0'} ${direction === 'up' ? (align === 'right' ? 'origin-bottom-right' : 'origin-bottom-left') : align === 'right' ? 'origin-top-right' : 'origin-top-left'}`}
            exit={{ opacity: 0, scale: 0.98, transition: exitFast }}
            initial={{ opacity: 0, y: direction === 'up' ? 4 : -4, scale: 0.96 }}
            role="menu"
            style={{ width }}
            transition={{ duration: 0.18, ease: ease.out }}
          >
            {header}
            {items.map((item, index) =>
              item === 'divider' ? (
                <div className="my-1.5 h-0.5 rounded bg-line" key={`divider-${index}`} />
              ) : (
                <button
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-bold transition-colors disabled:opacity-40 ${
                    item.danger === true ? 'text-red hover:bg-red/10' : 'text-ink hover:bg-surface-2'
                  }`}
                  disabled={item.disabled}
                  key={item.key}
                  onClick={() => {
                    setOpen(false);
                    item.onSelect();
                  }}
                  role="menuitem"
                  type="button"
                >
                  {item.icon !== undefined && <span className="shrink-0 text-ink-2">{item.icon}</span>}
                  <span className="min-w-0 flex-1">{item.label}</span>
                  {item.hint !== undefined && <span className="shrink-0 text-xs font-semibold text-ink-3">{item.hint}</span>}
                </button>
              ),
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
