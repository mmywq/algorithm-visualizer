import { ArrowLeft, Check, Copy, Plus, QrCode, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PixelCat } from '@/components/mascot/PixelCat';
import { Dialog } from '@/components/ui/Dialog';
import { toast } from '@/components/ui/Toaster';
import { Window } from '@/components/ui/Window';
import { getSiteOrigin } from '@/config/brand';
import { catalog, categories, entryById } from '@/content/catalog';
import { useAuthStore } from '@/features/auth/authStore';
import { usePageMeta } from '@/hooks/usePageMeta';
import {
  classProgress,
  createAssignment,
  deleteAssignment,
  deleteClass,
  describeCloudError,
  getClass,
  listAssignments,
  type Assignment,
  type ClassInfo,
  type MemberProgress,
} from '@/lib/classes';
import { copyText } from '@/lib/clipboard';
import { isMastered, progressShare } from '@/lib/progress';

/** Панель преподавателя: код приглашения, задания и сводка прогресса группы. */
export default function ClassPage() {
  const { classId = '' } = useParams();
  const navigate = useNavigate();
  const status = useAuthStore((state) => state.status);
  const [info, setInfo] = useState<ClassInfo | null | undefined>(undefined);
  const [assignments, setAssignments] = useState<readonly Assignment[]>([]);
  const [members, setMembers] = useState<readonly MemberProgress[]>([]);
  const [creating, setCreating] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  usePageMeta({ title: info?.name ?? 'Класс', noindex: true });

  const inviteUrl = info === null || info === undefined ? '' : `${getSiteOrigin()}/join/${info.joinCode}`;

  const reload = useCallback(async () => {
    try {
      const loaded = await getClass(classId);
      setInfo(loaded);
      if (loaded === null || !loaded.isOwner) return;
      const [loadedAssignments, loadedMembers] = await Promise.all([listAssignments([classId]), classProgress(classId)]);
      setAssignments(loadedAssignments);
      setMembers(loadedMembers);
    } catch (error) {
      setInfo(null);
      toast.error('Не удалось загрузить класс', describeCloudError(error));
    }
  }, [classId]);

  useEffect(() => {
    if (status === 'signed-in') void reload();
  }, [status, reload]);

  const showQr = async (): Promise<void> => {
    const QRCode = await import('qrcode');
    setQr(await QRCode.toDataURL(inviteUrl, { margin: 1, width: 560, color: { dark: '#1a1030', light: '#ffffff' } }));
  };

  if (status !== 'signed-in' || info === undefined) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <PixelCat pose={status === 'signed-in' ? 'sit' : 'think'} size={104} />
        <p className="mt-4 text-lg font-black text-ink">{status === 'signed-in' ? 'Загружаем класс…' : 'Войдите, чтобы открыть класс'}</p>
        {status !== 'signed-in' && (
          <Link className="btn btn-primary mt-5" to="/login">
            Войти
          </Link>
        )}
      </div>
    );
  }

  if (info === null || !info.isOwner) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <PixelCat pose="cry" size={104} />
        <p className="mt-4 text-lg font-black text-ink">Класс не найден</p>
        <p className="mt-2 text-[15px] font-semibold text-ink-2">Возможно, он удалён или принадлежит другому преподавателю.</p>
        <Link className="btn btn-secondary mt-5" to="/cabinet?tab=classes">
          К списку классов
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link className="inline-flex items-center gap-1.5 self-start text-sm font-bold text-ink-3 hover:text-ink" to="/cabinet?tab=classes">
        <ArrowLeft size={16} strokeWidth={2.5} />
        Все классы
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="tag border-cyan text-cyan">КЛАСС · {members.length} УЧАСТН.</p>
          <h1 className="h-display mt-4 text-ink">{info.name}</h1>
        </div>
        <button className="btn btn-ghost btn-sm text-red hover:bg-red/10 hover:text-red" onClick={() => setConfirmDelete(true)} type="button">
          <Trash2 size={16} strokeWidth={2.5} />
          Удалить класс
        </button>
      </header>

      <Window bodyClassName="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6" color="cyan" title="Приглашение">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-ink-2">Код для студентов</p>
          <p className="mt-1 font-display text-[48px] leading-none tracking-[0.08em] text-ink">{info.joinCode}</p>
          <p className="mt-2 truncate font-mono text-[13px] text-ink-3">{inviteUrl}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn btn-primary"
            onClick={() => void copyText(inviteUrl).then((ok) => (ok ? toast.success('Ссылка скопирована') : toast.error('Не удалось скопировать')))}
            type="button"
          >
            <Copy size={18} strokeWidth={2.5} />
            Ссылка
          </button>
          <button className="btn btn-secondary" onClick={() => void showQr()} type="button">
            <QrCode size={18} strokeWidth={2.5} />
            QR для проектора
          </button>
        </div>
      </Window>

      <Window
        actions={
          <button className="btn btn-green btn-sm -my-2" onClick={() => setCreating(true)} type="button">
            <Plus size={16} strokeWidth={2.75} />
            Задание
          </button>
        }
        bodyClassName="p-5 sm:p-6"
        color="lime"
        title="Задания и прогресс"
      >
        {assignments.length === 0 ? (
          <div className="flex items-center gap-4">
            <PixelCat pose="think" size={78} />
            <p className="text-[15px] font-semibold leading-6 text-ink-2">
              Создайте первое задание: выберите алгоритмы и срок. Задание засчитывается студенту, когда по каждому алгоритму пройдены теория, демонстрация и
              тест.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {assignments.map((assignment) => (
              <AssignmentProgress assignment={assignment} key={assignment.id} members={members} onDeleted={() => void reload()} />
            ))}
          </div>
        )}
      </Window>

      <CreateAssignmentDialog
        classId={classId}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          void reload();
        }}
        open={creating}
      />

      <Dialog onClose={() => setQr(null)} open={qr !== null} size="sm" title={`Вступайте в «${info.name}»`}>
        <div className="flex flex-col items-center gap-4">
          {qr !== null && <img alt="QR-код приглашения в класс" className="h-72 w-72 rounded-2xl border-2 border-line bg-white p-3" src={qr} />}
          <p className="font-display text-[32px] tracking-[0.08em] text-ink">{info.joinCode}</p>
        </div>
      </Dialog>

      <Dialog
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setConfirmDelete(false)} type="button">
              Отмена
            </button>
            <button
              className="btn btn-danger"
              onClick={() =>
                void deleteClass(classId)
                  .then(() => {
                    toast.info('Класс удалён');
                    navigate('/cabinet?tab=classes', { replace: true });
                  })
                  .catch((error: unknown) => toast.error('Не удалось удалить', describeCloudError(error)))
              }
              type="button"
            >
              Удалить
            </button>
          </>
        }
        onClose={() => setConfirmDelete(false)}
        open={confirmDelete}
        size="sm"
        title="Удалить класс?"
      >
        <p className="text-[15px] font-semibold leading-6 text-ink-2">Задания будут удалены, студенты выйдут из класса. Их личный прогресс сохранится.</p>
      </Dialog>
    </div>
  );
}

function AssignmentProgress({
  assignment,
  members,
  onDeleted,
}: {
  readonly assignment: Assignment;
  readonly members: readonly MemberProgress[];
  readonly onDeleted: () => void;
}) {
  const entries = assignment.algorithmIds.map((id) => entryById.get(id)).filter((entry): entry is (typeof catalog)[number] => entry !== undefined);
  const due = assignment.dueAt === null ? null : new Date(assignment.dueAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  const completed = members.filter((member) => entries.every((entry) => isMastered(member.progress[entry.id]))).length;

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-black text-ink">{assignment.title}</h3>
          <p className="text-sm font-bold text-ink-3">
            {entries.length} алг. {due !== null && `· до ${due}`} · выполнили {completed} из {members.length}
          </p>
        </div>
        <button
          aria-label={`Удалить задание «${assignment.title}»`}
          className="btn btn-ghost btn-sm btn-icon hover:text-red"
          onClick={() =>
            void deleteAssignment(assignment.id)
              .then(onDeleted)
              .catch((error: unknown) => toast.error('Не удалось удалить', describeCloudError(error)))
          }
          type="button"
        >
          <Trash2 size={16} strokeWidth={2.5} />
        </button>
      </div>
      {members.length === 0 ? (
        <p className="mt-2 text-sm font-semibold text-ink-3">В классе пока нет студентов — поделитесь кодом.</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-2xl border-2 border-line">
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-surface-2 text-[13px] font-extrabold text-ink-2">
                <th className="sticky left-0 bg-surface-2 px-4 py-2.5" scope="col">
                  Студент
                </th>
                {entries.map((entry) => (
                  <th className="px-3 py-2.5" key={entry.id} scope="col" title={entry.title}>
                    <span className="block max-w-[140px] truncate">{entry.title}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr className="border-t-2 border-line" key={member.userId}>
                  <th className="sticky left-0 bg-surface px-4 py-2.5 font-black text-ink" scope="row">
                    {member.displayName}
                  </th>
                  {entries.map((entry) => {
                    const progress = member.progress[entry.id];
                    const share = progressShare(progress);
                    return (
                      <td className="px-3 py-2.5" key={entry.id}>
                        {share === 1 ? (
                          <span
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border-2 border-green-press bg-green text-on"
                            title="Всё пройдено"
                          >
                            <Check size={16} strokeWidth={3.5} />
                          </span>
                        ) : (
                          <span className="font-display text-[16px] text-ink-3" title="Пройдено этапов из трёх">
                            {Math.round(share * 3)}/3
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function CreateAssignmentDialog({
  classId,
  open,
  onClose,
  onCreated,
}: {
  readonly classId: string;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [busy, setBusy] = useState(false);
  const grouped = useMemo(() => categories.map((category) => ({ category, entries: catalog.filter((entry) => entry.category === category.id) })), []);

  const toggle = (id: string): void => setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  const submit = async (): Promise<void> => {
    if (title.trim().length < 2 || selected.length === 0) return;
    setBusy(true);
    try {
      await createAssignment(classId, title, selected, due.length > 0 ? new Date(`${due}T23:59:00`).toISOString() : null);
      toast.success('Задание создано', 'Студенты увидят его в личном кабинете.');
      setTitle('');
      setDue('');
      setSelected([]);
      onCreated();
    } catch (error) {
      toast.error('Не удалось создать задание', describeCloudError(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} type="button">
            Отмена
          </button>
          <button className="btn btn-green" disabled={busy || title.trim().length < 2 || selected.length === 0} onClick={() => void submit()} type="button">
            Выдать задание ({selected.length})
          </button>
        </>
      }
      onClose={onClose}
      open={open}
      size="lg"
      title="Новое задание"
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        <div>
          <label className="label" htmlFor="assignment-title">
            Название
          </label>
          <input
            className="input"
            id="assignment-title"
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Например: Лабораторная №3 — сортировки"
            value={title}
          />
        </div>
        <div>
          <label className="label" htmlFor="assignment-due">
            Срок (необязательно)
          </label>
          <input className="input" id="assignment-due" onChange={(event) => setDue(event.target.value)} type="date" value={due} />
        </div>
      </div>
      <p className="label mt-5">Алгоритмы</p>
      <div className="flex max-h-[46vh] flex-col gap-4 overflow-y-auto rounded-2xl border-2 border-line p-3">
        {grouped.map(({ category, entries }) => (
          <fieldset key={category.id}>
            <legend className="font-display text-[16px] text-ink-2">{category.title}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {entries.map((entry) => {
                const active = selected.includes(entry.id);
                return (
                  <button
                    aria-pressed={active}
                    className={`chip h-9 px-3 text-sm ${active ? 'bg-brand text-on' : 'border-2 border-line bg-surface hover:border-brand/60'}`}
                    key={entry.id}
                    onClick={() => toggle(entry.id)}
                    type="button"
                  >
                    {active && <Check size={14} strokeWidth={3} />}
                    {entry.title}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </Dialog>
  );
}
