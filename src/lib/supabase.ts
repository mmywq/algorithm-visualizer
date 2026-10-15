import type { SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Облачный режим включается, только если заданы адрес проекта и публичный ключ Supabase. */
export const isCloudEnabled = typeof url === 'string' && url.length > 0 && typeof anonKey === 'string' && anonKey.length > 0;

export const authProviders: readonly ('google' | 'github')[] = (import.meta.env.VITE_AUTH_PROVIDERS ?? '')
  .split(',')
  .map((provider) => provider.trim())
  .filter((provider): provider is 'google' | 'github' => provider === 'google' || provider === 'github');

let clientPromise: Promise<SupabaseClient | null> | null = null;

/** Клиент загружается лениво: без облака библиотека вообще не попадает в загрузку страницы. */
export const getSupabase = (): Promise<SupabaseClient | null> => {
  if (!isCloudEnabled) return Promise.resolve(null);
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
    }),
  );
  return clientPromise;
};
