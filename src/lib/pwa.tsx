import { toast } from '@/components/ui/Toaster';

/**
 * Офлайн-режим: сервис-воркер кэширует приложение после первого визита,
 * поэтому демонстрации работают в аудитории без интернета.
 */
export const registerServiceWorker = (): void => {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  void import('virtual:pwa-register').then(({ registerSW }) => {
    const update = registerSW({
      onNeedRefresh() {
        toast.custom({
          title: 'Доступна новая версия',
          description: 'Обновите страницу, чтобы получить новые алгоритмы и исправления.',
          icon: <span className="mt-1.5 inline-block h-3 w-3 rounded-full bg-green" />,
          action: { label: 'Обновить', onClick: () => void update(true) },
          duration: 15000,
        });
      },
    });
  });
};
