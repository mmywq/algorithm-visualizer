import { ArrowRight, CalendarClock, Check, LogIn, Plus, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PixelCat } from '@/components/mascot/PixelCat';
import { toast } from '@/components/ui/Toaster';
import { entryById } from '@/content/catalog';
import { useAuthStore } from '@/features/auth/authStore';
import { assignmentStatus, dueLabel } from '@/lib/assignments';
import { createClass, describeCloudError, joinClass, listAssignments, listMyClasses, type Assignment, type ClassInfo } from '@/lib/classes';
import { isMastered } from '@/lib/progress';
import { useUserStore } from '@/stores/userStore';
import { StatusBadge } from './ClassDashboard';

function Notice({
  pose,
  title,
  text,
  action,
}: {
  readonly pose: 'think' | 'sit';
  readonly title: string;
  readonly text: string;
  readonly action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
      <PixelCat pose={pose} size={78} />
      <div className="min-w-0 flex-1">
        <p className="text-lg font-black text-ink">{title}</p>
        <p className="mt-1 text-[15px] font-semibold leading-6 text-ink-2">{text}</p>
        {action !== undefined && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

const formatDue = (dueAt: string | null): string | null =>
  dueAt === null ? null : new Date(dueAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

export function ClassesPanel() {
  const status = useAuthStore((state) => state.status);
  const role = useUserStore((state) => state.data.profile.role);
  const progress = useUserStore((state) => state.data.progress);
  const [classes, setClasses] = useState<readonly ClassInfo[] | null>(null);
  const [assignments, setAssignments] = useState<readonly Assignment[]>([]);
  const [code, setCode] = useState('');
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const list = await listMyClasses();
      setClasses(list);
      setAssignments(await listAssignments(list.filter((item) => !item.isOwner).map((item) => item.id)));
    } catch (error) {
      setClasses([]);
      toast.error('Не удалось загрузить классы', describeCloudError(error));
    }
  }, []);

  useEffect(() => {
    if (status === 'signed-in') void reload();
  }, [status, reload]);

  if (status === 'disabled') {
    return (
      <Notice
        action={
          <div className="flex flex-wrap gap-2">
            <Link className="btn btn-primary btn-sm" to="/cabinet/classes/demo">
              <Users size={16} strokeWidth={2.5} />
              Открыть демо-класс
            </Link>
            <Link className="btn btn-secondary btn-sm" to="/for-schools">
              Подробнее о лицензии
              <ArrowRight size={16} strokeWidth={2.5} />
            </Link>
          </div>
        }
        pose="think"
        text="Классы, задания и сводка прогресса группы работают в облачной версии для учебных заведений. Как это выглядит у преподавателя, можно посмотреть в демо-классе с вымышленными студентами."
        title="Классы появятся после подключения облака"
      />
    );
  }

  if (status !== 'signed-in') {
    return (
      <Notice
        action={
          <Link className="btn btn-primary btn-sm" to="/login">
            <LogIn size={16} strokeWidth={2.5} />
            Войти
          </Link>
        }
        pose="sit"
        text="Войдите, чтобы вступить в класс по коду преподавателя или создать свой класс."
        title="Нужен аккаунт"
      />
    );
  }

  const join = async (): Promise<void> => {
    if (code.trim().length < 4) return;
    setBusy(true);
    try {
      await joinClass(code);
      toast.success('Вы в классе!', 'Задания преподавателя появятся ниже.');
      setCode('');
      await reload();
    } catch (error) {
      toast.error('Не получилось вступить', describeCloudError(error));
    } finally {
      setBusy(false);
    }
  };

  const create = async (): Promise<void> => {
    if (newName.trim().length < 2) return;
    setBusy(true);
    try {
      const created = await createClass(newName);
      toast.success(`Класс «${created.name}» создан`, `Код для студентов: ${created.joinCode}`);
      setNewName('');
      await reload();
    } catch (error) {
      toast.error('Не удалось создать класс', describeCloudError(error));
    } finally {
      setBusy(false);
    }
  };

  const owned = (classes ?? []).filter((item) => item.isOwner);
  const joined = (classes ?? []).filter((item) => !item.isOwner);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <form
          className="rounded-2xl border-2 border-line bg-surface-2 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void join();
          }}
        >
          <label className="label" htmlFor="join-code">
            Вступить в класс по коду
          </label>
          <div className="flex gap-2">
            <input
              autoCapitalize="characters"
              className="input font-display text-[16px] uppercase"
              id="join-code"
              maxLength={8}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Например: K7Q2MX"
              value={code}
            />
            <button className="btn btn-primary" disabled={busy || code.trim().length < 4} type="submit">
              Вступить
            </button>
          </div>
        </form>
        {role === 'teacher' && (
          <form
            className="rounded-2xl border-2 border-line bg-surface-2 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void create();
            }}
          >
            <label className="label" htmlFor="class-name">
              Создать класс
            </label>
            <div className="flex gap-2">
              <input
                className="input"
                id="class-name"
                maxLength={80}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="Например: АиСД, группа ИВТ-21"
                value={newName}
              />
              <button className="btn btn-green" disabled={busy || newName.trim().length < 2} type="submit">
                <Plus size={18} strokeWidth={2.75} />
                Создать
              </button>
            </div>
          </form>
        )}
      </div>

      {classes === null && <div className="skeleton h-24 rounded-2xl" />}

      {owned.length > 0 && (
        <section>
          <h3 className="font-display text-[24px] text-ink">Мои классы</h3>
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {owned.map((item) => (
              <li key={item.id}>
                <Link className="card card-hover flex items-center gap-4 p-4" to={`/cabinet/classes/${item.id}`}>
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-purple-press bg-purple text-on">
                    <Users size={22} strokeWidth={2.5} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-lg font-black text-ink">{item.name}</span>
                    <span className="tag mt-1 border-line-strong text-ink-2">КОД {item.joinCode}</span>
                  </span>
                  <ArrowRight className="text-ink-3" size={20} strokeWidth={2.5} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {joined.length > 0 && (
        <section>
          <h3 className="font-display text-[24px] text-ink">Задания</h3>
          {assignments.length === 0 && <p className="mt-2 text-[15px] font-semibold text-ink-2">Преподаватель пока не выдал заданий.</p>}
          <ul className="mt-3 flex flex-col gap-3">
            {assignments.map((assignment) => {
              const className = joined.find((item) => item.id === assignment.classId)?.name ?? '';
              const own = assignmentStatus(assignment.algorithmIds, progress, assignment.dueAt);
              const due = formatDue(assignment.dueAt);
              const submitted = own.state === 'done' || own.state === 'late';
              const reminder = assignment.dueAt !== null && !submitted ? dueLabel(assignment.dueAt) : null;
              return (
                <li className="card p-4 sm:p-5" key={assignment.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-black text-ink">{assignment.title}</p>
                      <p className="text-sm font-bold text-ink-3">
                        {className}
                        {due !== null && ` · срок ${due}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {reminder !== null && (
                        <span className={`chip ${reminder.tone === 'late' ? 'text-red' : reminder.tone === 'soon' ? 'text-orange' : ''}`}>
                          <CalendarClock size={14} strokeWidth={2.75} />
                          {reminder.text}
                        </span>
                      )}
                      {submitted ? (
                        <StatusBadge state={own.state} />
                      ) : (
                        <span className="tag border-line-strong text-ink-2" title="Алгоритмов пройдено полностью">
                          {own.done}/{own.total}
                        </span>
                      )}
                    </div>
                  </div>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {assignment.algorithmIds.map((id) => {
                      const entry = entryById.get(id);
                      if (entry === undefined) return null;
                      const done = isMastered(progress[id]);
                      return (
                        <li key={id}>
                          <Link
                            className={`chip h-9 px-3 text-sm ${done ? 'bg-green/14 text-green' : 'border-2 border-line bg-surface hover:border-brand/60'}`}
                            to={entry.path}
                          >
                            {done && <Check size={14} strokeWidth={3} />}
                            {entry.title}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {classes !== null && classes.length === 0 && (
        <Notice
          {...(role === 'teacher'
            ? {
                action: (
                  <Link className="btn btn-secondary btn-sm" to="/cabinet/classes/demo">
                    Посмотреть демо-класс
                    <ArrowRight size={16} strokeWidth={2.5} />
                  </Link>
                ),
              }
            : {})}
          pose="sit"
          text={
            role === 'teacher'
              ? 'Создайте класс и раздайте студентам код — они вступят в пару кликов.'
              : 'Попросите у преподавателя код класса и введите его выше.'
          }
          title="Пока ни одного класса"
        />
      )}
    </div>
  );
}
