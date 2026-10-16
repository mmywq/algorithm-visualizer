import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PixelCat } from '@/components/mascot/PixelCat';
import { toast } from '@/components/ui/Toaster';
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
import { ClassDashboard } from './ClassDashboard';

/** Класс в облачном режиме: данные загружаются из Supabase, права проверяются на сервере. */
export default function ClassPage() {
  const { classId = '' } = useParams();
  const navigate = useNavigate();
  const status = useAuthStore((state) => state.status);
  const [info, setInfo] = useState<ClassInfo | null | undefined>(undefined);
  const [assignments, setAssignments] = useState<readonly Assignment[]>([]);
  const [members, setMembers] = useState<readonly MemberProgress[]>([]);
  usePageMeta({ title: info?.name ?? 'Класс', noindex: true });

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

  if (status !== 'signed-in' || info === undefined) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <PixelCat pose={status === 'signed-in' ? 'sit' : 'think'} size={104} />
        <p className="mt-4 text-lg font-black text-ink">{status === 'signed-in' ? 'Загружаем класс…' : 'Войдите, чтобы открыть класс'}</p>
        {status !== 'signed-in' && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {status === 'signed-out' && (
              <Link className="btn btn-primary" to="/login">
                Войти
              </Link>
            )}
            <Link className="btn btn-secondary" to="/cabinet/classes/demo">
              Открыть демо-класс
            </Link>
          </div>
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
    <ClassDashboard
      assignments={assignments}
      info={info}
      members={members}
      onCreateAssignment={async (title, algorithmIds, dueAt) => {
        await createAssignment(classId, title, algorithmIds, dueAt);
        await reload();
      }}
      onDeleteAssignment={async (assignmentId) => {
        await deleteAssignment(assignmentId);
        await reload();
      }}
      onDeleteClass={async () => {
        await deleteClass(classId);
        toast.info('Класс удалён');
        navigate('/cabinet?tab=classes', { replace: true });
      }}
    />
  );
}
