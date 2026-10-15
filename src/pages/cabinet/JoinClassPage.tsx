import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PixelCat } from '@/components/mascot/PixelCat';
import { Window } from '@/components/ui/Window';
import { useAuthStore } from '@/features/auth/authStore';
import { usePageMeta } from '@/hooks/usePageMeta';
import { describeCloudError, joinClass } from '@/lib/classes';

/** Ссылка-приглашение в класс: /join/КОД. */
export default function JoinClassPage() {
  usePageMeta({ title: 'Вступление в класс', noindex: true });
  const { code = '' } = useParams();
  const status = useAuthStore((state) => state.status);
  const [state, setState] = useState<'idle' | 'joining' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const attempted = useRef(false);

  useEffect(() => {
    if (status !== 'signed-in' || attempted.current) return;
    attempted.current = true;
    setState('joining');
    joinClass(code)
      .then(() => setState('done'))
      .catch((error: unknown) => {
        setMessage(describeCloudError(error));
        setState('error');
      });
  }, [status, code]);

  return (
    <div className="mx-auto max-w-md py-10">
      <Window bodyClassName="flex flex-col items-center p-6 text-center" title="invite.exe">
        {status === 'disabled' && (
          <>
            <PixelCat pose="think" size={104} />
            <p className="mt-4 text-lg font-black text-ink">Классы работают в облачной версии</p>
            <p className="mt-2 text-[15px] font-semibold text-ink-2">На этом сайте облако не подключено. Уточните адрес у преподавателя.</p>
          </>
        )}
        {status === 'signed-out' && (
          <>
            <PixelCat pose="sit" size={104} />
            <p className="tag mt-4 border-brand text-brand">КОД {code.toUpperCase()}</p>
            <p className="mt-3 text-lg font-black text-ink">Вас пригласили в класс</p>
            <p className="mt-2 text-[15px] font-semibold text-ink-2">Войдите или зарегистрируйтесь — после входа вы автоматически вступите в класс.</p>
            <Link className="btn btn-primary mt-5" to={`/login?next=${encodeURIComponent(`/join/${code}`)}`}>
              Войти и вступить
            </Link>
          </>
        )}
        {(status === 'loading' || state === 'joining') && (
          <>
            <PixelCat pose="sit" size={104} />
            <p className="mt-4 font-display text-[24px] text-ink">Вступаем…</p>
          </>
        )}
        {state === 'done' && (
          <>
            <PixelCat pose="happy" size={104} />
            <p className="mt-4 text-lg font-black text-ink">Вы в классе!</p>
            <p className="mt-2 text-[15px] font-semibold text-ink-2">Задания преподавателя — в личном кабинете, на вкладке «Классы».</p>
            <Link className="btn btn-primary mt-5" to="/cabinet?tab=classes">
              К заданиям
            </Link>
          </>
        )}
        {state === 'error' && (
          <>
            <PixelCat pose="cry" size={104} />
            <p className="mt-4 text-lg font-black text-ink">Не получилось вступить</p>
            <p className="mt-2 text-[15px] font-semibold text-ink-2">{message}</p>
            <Link className="btn btn-secondary mt-5" to="/cabinet?tab=classes">
              Ввести код вручную
            </Link>
          </>
        )}
      </Window>
    </div>
  );
}
