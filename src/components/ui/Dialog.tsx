import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface DialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title?: ReactNode;
  readonly description?: ReactNode;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly size?: 'sm' | 'md' | 'lg';
  /** На телефоне диалог всегда открывается снизу листом; здесь можно форсировать лист и на десктопе. */
  readonly variant?: 'auto' | 'sheet';
  readonly hideClose?: boolean;
}

const sizeClass = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-3xl' } as const;

export function Dialog({ open, onClose, title, description, children, footer, size = 'md', variant = 'auto', hideClose = false }: DialogProps) {
  const isPhone = useMediaQuery('(max-width: 639px)');
  const asSheet = variant === 'sheet' || isPhone;
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const dragControls = useDragControls();

  useEffect(() => {
    if (!open) return undefined;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
      if (event.key === 'Tab' && panelRef.current !== null) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown, true);

    const focusTimer = window.setTimeout(() => {
      const target = panelRef.current?.querySelector<HTMLElement>('[data-autofocus], input, textarea, select, button:not([data-close])');
      (target ?? panelRef.current)?.focus();
    }, 30);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-[rgb(12_14_22/0.55)] backdrop-blur-[2px]"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={onClose}
            transition={{ duration: 0.18 }}
          />
          <motion.div
            animate={asSheet ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            aria-describedby={description === undefined ? undefined : `${titleId}-desc`}
            aria-labelledby={title === undefined ? undefined : titleId}
            aria-modal="true"
            className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden border-2 border-line bg-surface shadow-float outline-none ${
              asSheet ? 'rounded-t-3xl border-b-0 safe-bottom' : `rounded-3xl ${sizeClass[size]}`
            } ${variant === 'sheet' && !isPhone ? sizeClass[size] : ''}`}
            drag={asSheet ? 'y' : false}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            exit={asSheet ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 8 }}
            initial={asSheet ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 8 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
            ref={panelRef}
            role="dialog"
            tabIndex={-1}
            transition={asSheet ? { type: 'spring', damping: 32, stiffness: 340 } : { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {asSheet && (
              <div
                aria-hidden="true"
                className="flex shrink-0 cursor-grab touch-none justify-center pb-1 pt-2.5"
                onPointerDown={(event) => dragControls.start(event)}
              >
                <div className="h-1.5 w-11 rounded-full bg-line-strong" />
              </div>
            )}
            {(title !== undefined || !hideClose) && (
              <div className="flex shrink-0 items-start gap-3 px-5 pb-2 pt-4 sm:px-6 sm:pt-5">
                <div className="min-w-0 flex-1">
                  {title !== undefined && (
                    <h2 className="text-xl font-black tracking-[-0.02em] text-ink" id={titleId}>
                      {title}
                    </h2>
                  )}
                  {description !== undefined && (
                    <p className="mt-1 text-[15px] leading-6 text-ink-2" id={`${titleId}-desc`}>
                      {description}
                    </p>
                  )}
                </div>
                {!hideClose && (
                  <button aria-label="Закрыть" className="btn btn-ghost btn-sm btn-icon -mr-2 -mt-1" data-close onClick={onClose} type="button">
                    <X size={20} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6 sm:pb-6">{children}</div>
            {footer !== undefined && <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t-2 border-line px-5 py-4 sm:px-6">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
