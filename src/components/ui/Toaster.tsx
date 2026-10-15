import { AnimatePresence, motion } from 'framer-motion';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { create } from 'zustand';

type ToastTone = 'success' | 'info' | 'error' | 'custom';

export interface ToastItem {
  readonly id: number;
  readonly tone: ToastTone;
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly icon?: ReactNode;
  readonly accent?: string;
  readonly action?: { readonly label: string; readonly onClick: () => void };
  readonly duration: number;
}

interface ToastState {
  readonly toasts: readonly ToastItem[];
  readonly push: (toast: Omit<ToastItem, 'id' | 'duration'> & { duration?: number }) => number;
  readonly dismiss: (id: number) => void;
}

let toastCounter = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (toast) => {
    toastCounter += 1;
    const id = toastCounter;
    const item: ToastItem = { duration: 3600, ...toast, id };
    set({ toasts: [...get().toasts.slice(-3), item] });
    window.setTimeout(() => get().dismiss(id), item.duration);
    return id;
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),
}));

export const toast = {
  success: (title: ReactNode, description?: ReactNode) =>
    useToastStore.getState().push({ tone: 'success', title, ...(description === undefined ? {} : { description }) }),
  info: (title: ReactNode, description?: ReactNode) =>
    useToastStore.getState().push({ tone: 'info', title, ...(description === undefined ? {} : { description }) }),
  error: (title: ReactNode, description?: ReactNode) =>
    useToastStore.getState().push({ tone: 'error', title, duration: 5200, ...(description === undefined ? {} : { description }) }),
  custom: (item: Omit<ToastItem, 'id' | 'duration' | 'tone'> & { duration?: number }) => useToastStore.getState().push({ tone: 'custom', ...item }),
};

const toneIcon: Record<Exclude<ToastTone, 'custom'>, ReactNode> = {
  success: <CircleCheck className="text-green" size={22} strokeWidth={2.5} />,
  info: <Info className="text-brand" size={22} strokeWidth={2.5} />,
  error: <CircleAlert className="text-red" size={22} strokeWidth={2.5} />,
};

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(84px+env(safe-area-inset-bottom))] z-[90] flex flex-col items-center gap-2 px-3 lg:bottom-6 lg:items-end lg:px-6"
    >
      <AnimatePresence initial={false}>
        {toasts.map((item) => (
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border-2 border-line bg-surface p-3.5 pr-2 shadow-float"
            exit={{ opacity: 0, y: 12, scale: 0.96, transition: { duration: 0.15 } }}
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            key={item.id}
            layout
            role="status"
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          >
            <span className="mt-0.5 shrink-0">{item.tone === 'custom' ? item.icon : toneIcon[item.tone]}</span>
            <div className="min-w-0 flex-1">
              <p className="font-extrabold leading-6 text-ink">{item.title}</p>
              {item.description !== undefined && <p className="mt-0.5 text-sm leading-5 text-ink-2">{item.description}</p>}
              {item.action !== undefined && (
                <button
                  className="btn btn-primary btn-sm mt-2.5"
                  onClick={() => {
                    item.action?.onClick();
                    dismiss(item.id);
                  }}
                  type="button"
                >
                  {item.action.label}
                </button>
              )}
            </div>
            <button aria-label="Скрыть уведомление" className="btn btn-ghost btn-sm btn-icon shrink-0" onClick={() => dismiss(item.id)} type="button">
              <X size={16} strokeWidth={2.5} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
