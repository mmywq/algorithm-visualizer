import { getSiteOrigin } from '@/config/brand';
import { getSupabase } from '@/lib/supabase';

/** Действия входа и регистрации. Ошибки Supabase переводятся на понятный язык. */

const callbackUrl = (next = '/cabinet'): string => `${getSiteOrigin()}/auth/callback?next=${encodeURIComponent(next)}`;

const client = async () => {
  const supabase = await getSupabase();
  if (supabase === null) throw new Error('Облачные аккаунты не подключены.');
  return supabase;
};

export const translateAuthError = (message: string): string => {
  if (/invalid login credentials/i.test(message)) return 'Неверная почта или пароль.';
  if (/email not confirmed/i.test(message)) return 'Почта ещё не подтверждена — откройте письмо со ссылкой.';
  if (/user already registered/i.test(message)) return 'Аккаунт с такой почтой уже есть. Войдите или восстановите пароль.';
  if (/password should be at least/i.test(message)) return 'Пароль слишком короткий: нужно хотя бы 8 символов.';
  if (/rate limit|too many/i.test(message)) return 'Слишком много попыток. Подождите минуту и попробуйте снова.';
  if (/invalid email/i.test(message)) return 'Проверьте адрес почты.';
  return message;
};

const run = async (action: () => Promise<{ error: { message: string } | null }>): Promise<string | null> => {
  try {
    const { error } = await action();
    return error === null ? null : translateAuthError(error.message);
  } catch (error) {
    return error instanceof Error ? translateAuthError(error.message) : 'Не удалось связаться с сервером.';
  }
};

export const signInWithPassword = (email: string, password: string) => run(async () => (await client()).auth.signInWithPassword({ email, password }));

export const signUp = (email: string, password: string, name: string, next?: string) =>
  run(async () => (await client()).auth.signUp({ email, password, options: { emailRedirectTo: callbackUrl(next), data: { full_name: name.trim() } } }));

export const sendMagicLink = (email: string, next?: string) =>
  run(async () => (await client()).auth.signInWithOtp({ email, options: { emailRedirectTo: callbackUrl(next) } }));

export const sendPasswordReset = (email: string) =>
  run(async () => (await client()).auth.resetPasswordForEmail(email, { redirectTo: `${callbackUrl()}&type=recovery` }));

export const updatePassword = (password: string) => run(async () => (await client()).auth.updateUser({ password }));

export const signInWithProvider = (provider: 'google' | 'github', next?: string) =>
  run(async () => (await client()).auth.signInWithOAuth({ provider, options: { redirectTo: callbackUrl(next) } }));

/** Удаляет учётную запись вместе с облачными данными, членством в классах и своими классами (функция delete_account в базе). */
export const deleteAccount = () => run(async () => (await client()).rpc('delete_account'));
