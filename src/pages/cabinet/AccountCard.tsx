import { Cloud, CloudOff, LogIn, LogOut, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from '@/components/ui/Toaster';
import { useAuthStore } from '@/features/auth/authStore';
import { flushSync, useSyncStore } from '@/features/sync/SyncController';
import { useUserStore } from '@/stores/userStore';
import { DataControls } from './DataControls';

const ago = (time: number | null): string => {
  if (time === null) return 'ещё не выполнялась';
  const seconds = Math.round((Date.now() - time) / 1000);
  if (seconds < 60) return 'только что';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} мин назад`;
  return new Date(time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

/** Где хранится прогресс: на устройстве или в облаке, плюс резервные копии. */
export function AccountCard() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const sync = useSyncStore();
  const resetData = useUserStore((state) => state.resetData);
  const [leaving, setLeaving] = useState(false);

  const leave = async (): Promise<void> => {
    setLeaving(true);
    try {
      await flushSync();
      await signOut();
      // на общих компьютерах аудитории личный прогресс не должен оставаться после выхода
      resetData();
      toast.info('Вы вышли из аккаунта', 'Прогресс сохранён в облаке и вернётся при следующем входе.');
    } finally {
      setLeaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {status === 'disabled' && (
        <div className="flex items-start gap-3">
          <CloudOff className="mt-0.5 shrink-0 text-ink-3" size={22} strokeWidth={2.5} />
          <p className="text-[15px] font-semibold leading-6 text-ink-2">
            Прогресс хранится в этом браузере. Чтобы перенести его на другое устройство, скачайте копию и загрузите её там.
          </p>
        </div>
      )}
      {status === 'signed-out' && (
        <div className="flex flex-wrap items-center gap-3">
          <CloudOff className="shrink-0 text-ink-3" size={22} strokeWidth={2.5} />
          <p className="min-w-0 flex-1 text-[15px] font-semibold leading-6 text-ink-2">
            Войдите, чтобы прогресс синхронизировался между устройствами. Всё, что накоплено сейчас, перенесётся в аккаунт.
          </p>
          <Link className="btn btn-primary btn-sm" to="/login">
            <LogIn size={16} strokeWidth={2.5} />
            Войти
          </Link>
        </div>
      )}
      {status === 'signed-in' && (
        <div className="flex flex-wrap items-center gap-3">
          <Cloud className="shrink-0 text-green" size={22} strokeWidth={2.5} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-black text-ink">{user?.email}</p>
            <p className="flex items-center gap-1.5 text-sm font-bold text-ink-3">
              {sync.state === 'syncing' && <RefreshCw className="animate-spin" size={14} strokeWidth={2.75} />}
              {sync.state === 'error' ? `Ошибка синхронизации: ${sync.error ?? ''}` : `Синхронизация: ${ago(sync.lastSyncedAt)}`}
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" disabled={leaving} onClick={() => void leave()} type="button">
            <LogOut size={16} strokeWidth={2.5} />
            Выйти
          </button>
        </div>
      )}
      <DataControls />
    </div>
  );
}
