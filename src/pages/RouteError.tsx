import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';
import { LogoMark } from '@/components/ui/Logo';

/** Экран для непредвиденных ошибок: вместо белой страницы — объяснение и выход. */
export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : error instanceof Error ? error.message : 'Неизвестная ошибка';
  const isChunkError = /dynamically imported module|Loading chunk|Failed to fetch/i.test(message);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="card max-w-lg p-8 text-center">
        <LogoMark className="mx-auto" size={48} />
        <h1 className="mt-5 text-2xl font-black text-ink">{isChunkError ? 'Вышла новая версия' : 'Что-то пошло не так'}</h1>
        <p className="mt-2 font-semibold leading-7 text-ink-2">
          {isChunkError
            ? 'Пока страница была открыта, сайт обновился. Перезагрузите её, чтобы продолжить.'
            : 'Мы не смогли показать эту страницу. Ваш прогресс сохранён — попробуйте обновить страницу или вернуться на главную.'}
        </p>
        {!isChunkError && <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 font-mono text-xs text-ink-3">{message}</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button className="btn btn-primary" onClick={() => window.location.reload()} type="button">
            Обновить страницу
          </button>
          <Link className="btn btn-secondary" to="/">
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
