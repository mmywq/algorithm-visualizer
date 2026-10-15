import { useEffect } from 'react';
import { create } from 'zustand';
import { useAuthStore } from '@/features/auth/authStore';
import { getSupabase } from '@/lib/supabase';
import { isUserData, mergeUserData, normalizeUserData, type UserData } from '@/lib/userData';
import { useUserStore } from '@/stores/userStore';

type SyncState = 'idle' | 'syncing' | 'synced' | 'error';

interface SyncStore {
  readonly state: SyncState;
  readonly lastSyncedAt: number | null;
  readonly error: string | null;
}

export const useSyncStore = create<SyncStore>(() => ({ state: 'idle', lastSyncedAt: null, error: null }));

const PUSH_DELAY_MS = 1500;
let pushTimer: number | null = null;
let pendingData: UserData | null = null;
let activeUserId: string | null = null;

const push = async (userId: string, data: UserData): Promise<void> => {
  const client = await getSupabase();
  if (client === null) return;
  useSyncStore.setState({ state: 'syncing' });
  const stamp = new Date().toISOString();
  const [dataResult, profileResult] = await Promise.all([
    client.from('user_data').upsert({ user_id: userId, data, updated_at: stamp }),
    client.from('profiles').upsert({ id: userId, display_name: data.profile.name, role: data.profile.role ?? 'student', updated_at: stamp }),
  ]);
  const error = dataResult.error ?? profileResult.error;
  if (error !== null) {
    useSyncStore.setState({ state: 'error', error: error.message });
    return;
  }
  useSyncStore.setState({ state: 'synced', lastSyncedAt: Date.now(), error: null });
};

const schedulePush = (data: UserData): void => {
  pendingData = data;
  if (pushTimer !== null) window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => {
    pushTimer = null;
    const userId = activeUserId;
    const payload = pendingData;
    pendingData = null;
    if (userId !== null && payload !== null) void push(userId, payload);
  }, PUSH_DELAY_MS);
};

/** Отменяет отложенную отправку — перед удалением аккаунта, чтобы данные не ушли повторно. */
export const cancelSync = (): void => {
  if (pushTimer !== null) {
    window.clearTimeout(pushTimer);
    pushTimer = null;
  }
  pendingData = null;
  activeUserId = null;
};

/** Немедленно отправляет отложенные изменения — перед выходом из аккаунта. */
export const flushSync = async (): Promise<void> => {
  if (pushTimer !== null) {
    window.clearTimeout(pushTimer);
    pushTimer = null;
  }
  const userId = activeUserId;
  const payload = pendingData ?? useUserStore.getState().data;
  pendingData = null;
  if (userId !== null) await push(userId, payload);
};

/** Подтягивает облачную копию при входе и отправляет изменения при каждом обновлении прогресса. */
export function SyncController() {
  const status = useAuthStore((state) => state.status);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const userName = useAuthStore((state) => state.user?.name ?? '');

  useEffect(() => {
    if (status !== 'signed-in' || userId === null) {
      activeUserId = null;
      return undefined;
    }
    activeUserId = userId;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    void (async () => {
      const client = await getSupabase();
      if (client === null || cancelled) return;
      useSyncStore.setState({ state: 'syncing' });
      const { data: row, error } = await client.from('user_data').select('data').eq('user_id', userId).maybeSingle();
      if (cancelled) return;
      if (error !== null) {
        useSyncStore.setState({ state: 'error', error: error.message });
        return;
      }
      const local = useUserStore.getState().data;
      const remote = row !== null && isUserData(row.data) ? normalizeUserData(row.data) : null;
      let merged = remote === null ? local : mergeUserData(local, remote);
      if (merged.profile.name.length === 0 && userName.length > 0) merged = { ...merged, profile: { ...merged.profile, name: userName } };
      useUserStore.getState().replaceData(merged);
      await push(userId, merged);
      if (cancelled) return;
      unsubscribe = useUserStore.subscribe((state, previous) => {
        if (state.data !== previous.data) schedulePush(state.data);
      });
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [status, userId, userName]);

  return null;
}
