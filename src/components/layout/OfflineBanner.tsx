import { WifiOff } from 'lucide-react';
import { useSyncExternalStore } from 'react';

const subscribe = (onChange: () => void): (() => void) => {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
};

/** Подсказка при потере сети: демонстрации продолжают работать, синхронизация подождёт. */
export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;
  return (
    <div className="border-b-2 border-yellow/40 bg-yellow/15" role="status">
      <p className="mx-auto flex max-w-[1320px] items-center gap-2 px-4 py-2 text-sm font-bold text-ink-2 sm:px-6">
        <WifiOff size={16} strokeWidth={2.5} />
        Нет подключения к интернету. Демонстрации работают, а прогресс синхронизируется, когда связь вернётся.
      </p>
    </div>
  );
}
