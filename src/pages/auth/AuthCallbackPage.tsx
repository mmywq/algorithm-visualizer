import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PixelCat } from '@/components/mascot/PixelCat';
import { Window } from '@/components/ui/Window';
import { updatePassword } from '@/features/auth/authActions';
import { useAuthStore } from '@/features/auth/authStore';
import { usePageMeta } from '@/hooks/usePageMeta';

/** Возврат из письма или от Google/GitHub: обмен кода на сессию, восстановление пароля. */
export default function AuthCallbackPage() {
  usePageMeta({ title: 'Вход', noindex: true });
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const status = useAuthStore((state) => state.status);
  const recovery = params.get('type') === 'recovery';
  const next = params.get('next')?.startsWith('/') === true ? params.get('next')! : '/cabinet';
  const urlError = params.get('error_description');
  const [error, setError] = useState<string | null>(urlError);
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);

  // клиент Supabase сам обменивает код из адреса на сессию при инициализации (PKCE);
  // если за несколько секунд вход не состоялся — ссылка недействительна
  useEffect(() => {
    if (status === 'signed-in' || urlError !== null) return undefined;
    const timer = window.setTimeout(() => setError('Ссылка устарела или уже использована. Запросите новую.'), 8000);
    return () => window.clearTimeout(timer);
  }, [status, urlError]);

  useEffect(() => {
    if (status === 'signed-in' && !recovery) navigate(next, { replace: true });
  }, [status, recovery, next, navigate]);

  const savePassword = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (password.length < 8) return setError('Пароль — не короче 8 символов.');
    const result = await updatePassword(password);
    if (result !== null) setError(result);
    else setDone(true);
  };

  return (
    <div className="mx-auto max-w-md py-10">
      <Window bodyClassName="flex flex-col items-center p-6 text-center" title="auth.exe">
        {error !== null ? (
          <>
            <PixelCat pose="cry" size={104} />
            <p className="mt-4 text-lg font-black text-ink">Не получилось войти</p>
            <p className="mt-2 text-[15px] font-semibold text-ink-2">{error}</p>
            <Link className="btn btn-primary mt-5" to="/login">
              Попробовать снова
            </Link>
          </>
        ) : recovery && status === 'signed-in' && !done ? (
          <form className="flex w-full flex-col items-center" onSubmit={(event) => void savePassword(event)}>
            <PixelCat pose="think" size={104} />
            <p className="mt-4 text-lg font-black text-ink">Придумайте новый пароль</p>
            <input
              autoComplete="new-password"
              className="input mt-4"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Не короче 8 символов"
              type="password"
              value={password}
            />
            <button className="btn btn-primary mt-4 w-full" type="submit">
              Сохранить пароль
            </button>
          </form>
        ) : done ? (
          <>
            <PixelCat pose="happy" size={104} />
            <p className="mt-4 text-lg font-black text-ink">Пароль обновлён</p>
            <Link className="btn btn-primary mt-5" to={next}>
              Продолжить
            </Link>
          </>
        ) : (
          <>
            <PixelCat pose="sit" size={104} />
            <p className="mt-4 font-display text-[24px] text-ink">Входим…</p>
            <p className="mt-2 text-[15px] font-semibold text-ink-2">Проверяем ссылку и переносим ваш прогресс в аккаунт.</p>
          </>
        )}
      </Window>
    </div>
  );
}
