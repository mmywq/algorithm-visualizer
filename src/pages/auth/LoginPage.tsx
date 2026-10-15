import { Eye, EyeOff, Mail } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PixelCat } from '@/components/mascot/PixelCat';
import { Tabs } from '@/components/ui/Tabs';
import { Window } from '@/components/ui/Window';
import { sendMagicLink, sendPasswordReset, signInWithPassword, signInWithProvider, signUp } from '@/features/auth/authActions';
import { useAuthStore } from '@/features/auth/authStore';
import { usePageMeta } from '@/hooks/usePageMeta';
import { authProviders } from '@/lib/supabase';

type Mode = 'signin' | 'signup';

function GoogleMark() {
  return (
    <svg aria-hidden="true" height="18" viewBox="0 0 48 48" width="18">
      <path
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z"
        fill="#FFC107"
      />
      <path d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" fill="#FF3D00" />
      <path d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" fill="#4CAF50" />
      <path d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" fill="#1976D2" />
    </svg>
  );
}

function GithubMark() {
  return (
    <svg aria-hidden="true" fill="currentColor" height="18" viewBox="0 0 16 16" width="18">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export default function LoginPage() {
  usePageMeta({ title: 'Вход', noindex: true });
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next')?.startsWith('/') === true ? params.get('next')! : '/cabinet';
  const status = useAuthStore((state) => state.status);
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === 'signed-in') navigate(next, { replace: true });
  }, [status, navigate, next]);

  if (status === 'disabled') {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center py-8 text-center">
        <PixelCat pose="think" size={130} />
        <h1 className="h-section mt-6">Аккаунты пока не подключены</h1>
        <p className="mt-3 text-[17px] font-semibold leading-7 text-ink-2">
          Всё работает и без входа: прогресс, достижения и наборы сохраняются в этом браузере. Перенести их на другое устройство можно через файл в личном
          кабинете.
        </p>
        <Link className="btn btn-primary btn-lg mt-6" to="/cabinet">
          В личный кабинет
        </Link>
      </div>
    );
  }

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Проверьте адрес почты.');
    if (password.length < 8) return setError('Пароль — не короче 8 символов.');
    setBusy(true);
    const result = mode === 'signin' ? await signInWithPassword(email, password) : await signUp(email, password, name, next);
    setBusy(false);
    if (result !== null) return setError(result);
    if (mode === 'signup') setNotice('Готово! Мы отправили письмо со ссылкой для подтверждения почты. Откройте его, чтобы завершить регистрацию.');
  };

  const magic = async (): Promise<void> => {
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Введите почту — пришлём на неё ссылку для входа.');
    setBusy(true);
    const result = await sendMagicLink(email, next);
    setBusy(false);
    if (result !== null) setError(result);
    else setNotice(`Ссылка для входа отправлена на ${email}. Она действует один час.`);
  };

  const reset = async (): Promise<void> => {
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Введите почту — пришлём ссылку для смены пароля.');
    setBusy(true);
    const result = await sendPasswordReset(email);
    setBusy(false);
    if (result !== null) setError(result);
    else setNotice(`Письмо со ссылкой для смены пароля отправлено на ${email}.`);
  };

  return (
    <div className="mx-auto max-w-md pt-10">
      <div className="relative">
        <div className="absolute -top-[57px] right-8 z-[2]">
          <PixelCat pose="peek" size={64} />
        </div>
        <Window bodyClassName="p-5 sm:p-6" className="relative z-[1]" title="login.exe">
          <h1 className="font-display text-[32px] leading-none text-ink">{mode === 'signin' ? 'С возвращением!' : 'Новый игрок'}</h1>
          <p className="mt-2 text-[15px] font-semibold leading-6 text-ink-2">
            {mode === 'signin' ? 'Войдите, чтобы прогресс был доступен на любом устройстве.' : 'Аккаунт сохранит опыт, достижения и задания преподавателя.'}
          </p>

          <Tabs
            ariaLabel="Вход или регистрация"
            className="mt-5"
            items={[
              { value: 'signin', label: 'Вход' },
              { value: 'signup', label: 'Регистрация' },
            ]}
            onChange={(value) => {
              setMode(value);
              setError(null);
              setNotice(null);
            }}
            stretch
            value={mode}
          />

          {authProviders.length > 0 && (
            <div className="mt-5 grid gap-2">
              {authProviders.includes('google') && (
                <button
                  className="btn btn-secondary w-full"
                  disabled={busy}
                  onClick={() => void signInWithProvider('google', next).then((result) => result !== null && setError(result))}
                  type="button"
                >
                  <GoogleMark />
                  Продолжить с Google
                </button>
              )}
              {authProviders.includes('github') && (
                <button
                  className="btn btn-secondary w-full"
                  disabled={busy}
                  onClick={() => void signInWithProvider('github', next).then((result) => result !== null && setError(result))}
                  type="button"
                >
                  <GithubMark />
                  Продолжить с GitHub
                </button>
              )}
              <p className="my-1 text-center font-display text-[16px] text-ink-3">ИЛИ</p>
            </div>
          )}

          <form className="mt-5 flex flex-col gap-3" noValidate onSubmit={(event) => void submit(event)}>
            {mode === 'signup' && (
              <div>
                <label className="label" htmlFor="auth-name">
                  Как вас называть
                </label>
                <input autoComplete="nickname" className="input" id="auth-name" maxLength={40} onChange={(event) => setName(event.target.value)} value={name} />
              </div>
            )}
            <div>
              <label className="label" htmlFor="auth-email">
                Почта
              </label>
              <input
                autoComplete="email"
                className="input"
                id="auth-email"
                inputMode="email"
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
            </div>
            <div>
              <label className="label" htmlFor="auth-password">
                Пароль
              </label>
              <div className="relative">
                <input
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  className="input pr-11"
                  id="auth-password"
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                />
                <button
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-3 hover:text-ink"
                  onClick={() => setShowPassword((current) => !current)}
                  type="button"
                >
                  {showPassword ? <EyeOff size={18} strokeWidth={2.5} /> : <Eye size={18} strokeWidth={2.5} />}
                </button>
              </div>
            </div>

            {error !== null && (
              <p className="rounded-xl border-2 border-red/40 bg-red/10 px-3 py-2 text-sm font-bold text-red" role="alert">
                {error}
              </p>
            )}
            {notice !== null && (
              <p className="rounded-xl border-2 border-green/40 bg-green/10 px-3 py-2 text-sm font-bold text-green" role="status">
                {notice}
              </p>
            )}

            <button className="btn btn-primary btn-lg mt-1 w-full font-display text-[24px]" disabled={busy} type="submit">
              {mode === 'signin' ? 'Войти ▶' : 'Создать аккаунт ▶'}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap justify-between gap-2 text-sm">
            <button className="link" disabled={busy} onClick={() => void magic()} type="button">
              <Mail className="mr-1 inline" size={14} strokeWidth={2.75} />
              Войти по ссылке из письма
            </button>
            {mode === 'signin' && (
              <button className="link" disabled={busy} onClick={() => void reset()} type="button">
                Забыли пароль?
              </button>
            )}
          </div>

          {mode === 'signup' && (
            <p className="mt-4 text-[13px] font-semibold leading-5 text-ink-3">
              Создавая аккаунт, вы принимаете{' '}
              <Link className="link" to="/terms">
                условия использования
              </Link>{' '}
              и даёте согласие на обработку персональных данных в соответствии с{' '}
              <Link className="link" to="/privacy">
                политикой конфиденциальности
              </Link>
              .
            </p>
          )}
        </Window>
      </div>
    </div>
  );
}
