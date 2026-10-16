import { ArrowLeft, Check, Copy, FileSpreadsheet, Plus, QrCode, Trash2 } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PixelCat } from '@/components/mascot/PixelCat';
import { Dialog } from '@/components/ui/Dialog';
import { toast } from '@/components/ui/Toaster';
import { Window } from '@/components/ui/Window';
import { getSiteOrigin } from '@/config/brand';
import { catalog, categories, entryById } from '@/content/catalog';
import { assignmentStatus, classProgressCsv, stateLabels, type AssignmentState } from '@/lib/assignments';
import { describeCloudError, type Assignment, type ClassInfo, type MemberProgress } from '@/lib/classes';
import { copyText } from '@/lib/clipboard';
import { downloadText } from '@/lib/download';
import { progressShare } from '@/lib/progress';

export interface ClassDashboardProps {
  readonly info: ClassInfo;
  readonly assignments: readonly Assignment[];
  readonly members: readonly MemberProgress[];
  /** баннер над панелью — например, пометка демо-класса */
  readonly notice?: ReactNode;
  readonly onCreateAssignment: (title: string, algorithmIds: readonly string[], dueAt: string | null) => Promise<void>;
  readonly onDeleteAssignment: (assignmentId: string) => Promise<void>;
  /** без обработчика кнопка удаления класса не показывается */
  readonly onDeleteClass?: (() => Promise<void>) | undefined;
}

const stateTone: Readonly<Record<AssignmentState, string>> = {
  done: 'border-green bg-green/12 text-green',
  late: 'border-orange bg-orange/12 text-orange',
  overdue: 'border-red bg-red/12 text-red',
  progress: 'border-cyan bg-cyan/12 text-cyan',
  idle: 'border-line-strong text-ink-3',
};

export function StatusBadge({ state }: { readonly state: AssignmentState }) {
  return <span className={`tag whitespace-nowrap ${stateTone[state]}`}>{stateLabels[state]}</span>;
}

const shortDate = (iso: string): string => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

/** Панель преподавателя: приглашение, задания со статусами студентов и выгрузка сводки в Excel. */
export function ClassDashboard({ info, assignments, members, notice, onCreateAssignment, onDeleteAssignment, onDeleteClass }: ClassDashboardProps) {
  const [creating, setCreating] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inviteUrl = `${getSiteOrigin()}/join/${info.joinCode}`;

  const showQr = async (): Promise<void> => {
    const QRCode = await import('qrcode');
    setQr(await QRCode.toDataURL(inviteUrl, { margin: 1, width: 560, color: { dark: '#1a1030', light: '#ffffff' } }));
  };

  const exportTable = (): void => {
    const csv = classProgressCsv(assignments, members, (id) => entryById.get(id)?.title ?? id);
    const safeName = info.name.replace(/[\\/:*?"<>|]+/g, ' ').trim();
    downloadText(`${safeName} — прогресс ${new Date().toLocaleDateString('ru-RU')}.csv`, csv, 'text/csv;charset=utf-8');
    toast.success('Таблица сохранена', 'Файл CSV открывается в Excel и LibreOffice: строка на студента, столбцы по заданиям и алгоритмам.');
  };

  return (
    <div className="flex flex-col gap-6">
      <Link className="inline-flex items-center gap-1.5 self-start text-sm font-bold text-ink-3 hover:text-ink" to="/cabinet?tab=classes">
        <ArrowLeft size={16} strokeWidth={2.5} />
        Все классы
      </Link>
      {notice}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="tag border-cyan text-cyan">КЛАСС · {members.length} УЧАСТН.</p>
          <h1 className="h-display mt-4 text-ink">{info.name}</h1>
        </div>
        {onDeleteClass !== undefined && (
          <button className="btn btn-ghost btn-sm text-red hover:bg-red/10 hover:text-red" onClick={() => setConfirmDelete(true)} type="button">
            <Trash2 size={16} strokeWidth={2.5} />
            Удалить класс
          </button>
        )}
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
          <span className="-my-2 flex gap-1.5 sm:gap-2">
            {assignments.length > 0 && members.length > 0 && (
              <button
                aria-label="Скачать сводку для Excel"
                className="btn btn-secondary btn-sm"
                onClick={exportTable}
                title="Скачать сводку в формате CSV для Excel"
                type="button"
              >
                <FileSpreadsheet size={16} strokeWidth={2.5} />
                <span className="hidden sm:inline">Excel</span>
              </button>
            )}
            <button aria-label="Новое задание" className="btn btn-green btn-sm" onClick={() => setCreating(true)} type="button">
              <Plus size={16} strokeWidth={2.75} />
              <span className="hidden sm:inline">Задание</span>
            </button>
          </span>
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
          <div className="flex flex-col gap-8">
            {assignments.map((assignment) => (
              <AssignmentProgress assignment={assignment} key={assignment.id} members={members} onDelete={() => onDeleteAssignment(assignment.id)} />
            ))}
          </div>
        )}
      </Window>

      <CreateAssignmentDialog
        onClose={() => setCreating(false)}
        onSubmit={async (title, ids, dueAt) => {
          await onCreateAssignment(title, ids, dueAt);
          setCreating(false);
        }}
        open={creating}
      />

      <Dialog onClose={() => setQr(null)} open={qr !== null} size="sm" title={`Вступайте в «${info.name}»`}>
        <div className="flex flex-col items-center gap-4">
          {qr !== null && <img alt="QR-код приглашения в класс" className="h-72 w-72 rounded-2xl border-2 border-line bg-white p-3" src={qr} />}
          <p className="font-display text-[32px] tracking-[0.08em] text-ink">{info.joinCode}</p>
        </div>
      </Dialog>

      {onDeleteClass !== undefined && (
        <Dialog
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(false)} type="button">
                Отмена
              </button>
              <button
                className="btn btn-danger"
                onClick={() => void onDeleteClass().catch((error: unknown) => toast.error('Не удалось удалить', describeCloudError(error)))}
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
      )}
    </div>
  );
}

const summaryOrder: readonly AssignmentState[] = ['done', 'late', 'progress', 'overdue', 'idle'];

function AssignmentProgress({
  assignment,
  members,
  onDelete,
}: {
  readonly assignment: Assignment;
  readonly members: readonly MemberProgress[];
  readonly onDelete: () => Promise<void>;
}) {
  const entries = assignment.algorithmIds.map((id) => entryById.get(id)).filter((entry): entry is (typeof catalog)[number] => entry !== undefined);
  const due = assignment.dueAt === null ? null : new Date(assignment.dueAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  const statuses = useMemo(
    () => new Map(members.map((member) => [member.userId, assignmentStatus(assignment.algorithmIds, member.progress, assignment.dueAt)])),
    [assignment, members],
  );
  const counts = summaryOrder
    .map((state) => ({ state, count: [...statuses.values()].filter((status) => status.state === state).length }))
    .filter((item) => item.count > 0);

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-lg font-black text-ink">{assignment.title}</h3>
          <p className="text-sm font-bold text-ink-3">
            {entries.length} алг.{due !== null && ` · срок ${due}`}
          </p>
        </div>
        <button
          aria-label={`Удалить задание «${assignment.title}»`}
          className="btn btn-ghost btn-sm btn-icon hover:text-red"
          onClick={() => void onDelete().catch((error: unknown) => toast.error('Не удалось удалить', describeCloudError(error)))}
          type="button"
        >
          <Trash2 size={16} strokeWidth={2.5} />
        </button>
      </div>
      {members.length === 0 ? (
        <p className="mt-2 text-sm font-semibold text-ink-3">В классе пока нет студентов — поделитесь кодом.</p>
      ) : (
        <>
          <ul aria-label="Сводка по статусам" className="mt-3 flex flex-wrap gap-2">
            {counts.map(({ state, count }) => (
              <li className={`tag ${stateTone[state]}`} key={state}>
                {stateLabels[state]}: {count}
              </li>
            ))}
          </ul>
          <div className="mt-3 overflow-x-auto rounded-2xl border-2 border-line">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-surface-2 text-[13px] font-extrabold text-ink-2">
                  <th className="sticky left-0 z-[1] bg-surface-2 px-4 py-2.5" scope="col">
                    Студент
                  </th>
                  <th className="px-3 py-2.5" scope="col">
                    Статус
                  </th>
                  {entries.map((entry) => (
                    <th className="px-3 py-2.5" key={entry.id} scope="col" title={entry.title}>
                      <span className="block max-w-[140px] truncate">{entry.title}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const status = statuses.get(member.userId)!;
                  return (
                    <tr className="border-t-2 border-line" key={member.userId}>
                      <th className="sticky left-0 z-[1] bg-surface px-4 py-2.5 font-black text-ink" scope="row">
                        {member.displayName}
                      </th>
                      <td className="px-3 py-2.5">
                        <span className="flex flex-col items-start gap-1">
                          <StatusBadge state={status.state} />
                          {status.completedAt !== null && <span className="text-[12px] font-bold text-ink-3">{shortDate(status.completedAt)}</span>}
                        </span>
                      </td>
                      {entries.map((entry) => {
                        const progress = member.progress[entry.id];
                        const share = progressShare(progress);
                        const best = progress?.quizBest === undefined ? '' : `, тест ${Math.round(progress.quizBest * 100)}%`;
                        return (
                          <td className="px-3 py-2.5" key={entry.id}>
                            {share === 1 ? (
                              <span
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border-2 border-green-press bg-green text-on"
                                title={`Всё пройдено${best}`}
                              >
                                <Check aria-label="Всё пройдено" size={16} strokeWidth={3.5} />
                              </span>
                            ) : (
                              <span className="font-display text-[16px] text-ink-3" title={`Пройдено этапов из трёх${best}`}>
                                {Math.round(share * 3)}/3
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function CreateAssignmentDialog({
  open,
  onClose,
  onSubmit,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (title: string, algorithmIds: readonly string[], dueAt: string | null) => Promise<void>;
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
      await onSubmit(title.trim(), selected, due.length > 0 ? new Date(`${due}T23:59:00`).toISOString() : null);
      toast.success('Задание создано', 'Студенты увидят его в личном кабинете.');
      setTitle('');
      setDue('');
      setSelected([]);
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
