import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { getSupabase, isCloudEnabled } from '@/lib/supabase';

export type AuthStatus = 'disabled' | 'loading' | 'signed-out' | 'signed-in';

export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
}

interface AuthState {
  readonly status: AuthStatus;
  readonly user: AuthUser | null;
  readonly init: () => Promise<void>;
  readonly signOut: () => Promise<void>;
}

const toUser = (session: Session | null): AuthUser | null => {
  if (session === null) return null;
  const meta = session.user.user_metadata as { full_name?: string; name?: string } | undefined;
  return {
    id: session.user.id,
    email: session.user.email ?? '',
    name: meta?.full_name ?? meta?.name ?? '',
  };
};

let initialized = false;

export const useAuthStore = create<AuthState>((set) => ({
  status: isCloudEnabled ? 'loading' : 'disabled',
  user: null,

  init: async () => {
    if (initialized) return;
    initialized = true;
    const client = await getSupabase();
    if (client === null) {
      set({ status: 'disabled', user: null });
      return;
    }
    const { data } = await client.auth.getSession();
    const user = toUser(data.session);
    set({ status: user === null ? 'signed-out' : 'signed-in', user });
    client.auth.onAuthStateChange((_event, session) => {
      const next = toUser(session);
      set({ status: next === null ? 'signed-out' : 'signed-in', user: next });
    });
  },

  signOut: async () => {
    const client = await getSupabase();
    await client?.auth.signOut();
    set({ status: isCloudEnabled ? 'signed-out' : 'disabled', user: null });
  },
}));
