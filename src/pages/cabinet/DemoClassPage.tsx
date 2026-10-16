import { FlaskConical } from 'lucide-react';
import { useMemo, useState } from 'react';
import { buildDemoClass } from '@/content/demoClass';
import { usePageMeta } from '@/hooks/usePageMeta';
import type { Assignment } from '@/lib/classes';
import { ClassDashboard } from './ClassDashboard';

/**
 * Демо-класс: та же панель преподавателя на вымышленных данных, без аккаунта и облака.
 * Задания можно добавлять и удалять — изменения живут, пока открыта страница.
 */
export default function DemoClassPage() {
  const demo = useMemo(() => buildDemoClass(), []);
  const [assignments, setAssignments] = useState<readonly Assignment[]>(demo.assignments);
  usePageMeta({ title: 'Демо-класс', description: 'Как преподаватель видит задания и прогресс группы: статусы сдачи, сроки и выгрузка в Excel.' });

  return (
    <ClassDashboard
      assignments={assignments}
      info={demo.info}
      members={demo.members}
      notice={
        <div className="flex items-start gap-3 rounded-2xl border-2 border-dashed border-yellow/70 bg-yellow/10 p-4">
          <FlaskConical className="mt-0.5 shrink-0 text-yellow" size={22} strokeWidth={2.5} />
          <p className="text-[15px] font-semibold leading-6 text-ink-2">
            <b className="text-ink">Это демо-класс.</b> Студенты вымышленные, а изменения не сохраняются. В облачной версии здесь видно настоящий прогресс
            группы: студенты вступают по коду, а задание засчитывается, когда по каждому алгоритму пройдены теория, демонстрация и тест.
          </p>
        </div>
      }
      onCreateAssignment={async (title, algorithmIds, dueAt) => {
        const created: Assignment = {
          id: `demo-${Date.now()}`,
          classId: demo.info.id,
          title,
          algorithmIds: [...algorithmIds],
          dueAt,
          createdAt: new Date().toISOString(),
        };
        setAssignments((current) => [created, ...current]);
      }}
      onDeleteAssignment={async (assignmentId) => {
        setAssignments((current) => current.filter((assignment) => assignment.id !== assignmentId));
      }}
    />
  );
}
