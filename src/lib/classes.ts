import { getSupabase } from '@/lib/supabase';
import type { AlgoProgress } from '@/lib/userData';

/**
 * Классы и задания (облачный режим). Таблицы и функции описаны
 * в supabase/migrations; права доступа проверяются политиками RLS на сервере.
 */

export interface ClassInfo {
  readonly id: string;
  readonly name: string;
  readonly joinCode: string;
  readonly ownerId: string;
  readonly createdAt: string;
  readonly isOwner: boolean;
}

export interface Assignment {
  readonly id: string;
  readonly classId: string;
  readonly title: string;
  readonly algorithmIds: readonly string[];
  readonly dueAt: string | null;
  readonly createdAt: string;
}

export interface MemberProgress {
  readonly userId: string;
  readonly displayName: string;
  readonly progress: Readonly<Record<string, AlgoProgress>>;
  readonly updatedAt: string | null;
}

export class CloudUnavailableError extends Error {
  constructor() {
    super('Облачный режим не настроен');
  }
}

const client = async () => {
  const supabase = await getSupabase();
  if (supabase === null) throw new CloudUnavailableError();
  return supabase;
};

const currentUserId = async (): Promise<string> => {
  const supabase = await client();
  const { data } = await supabase.auth.getUser();
  if (data.user === null) throw new Error('Нужно войти в аккаунт');
  return data.user.id;
};

interface ClassRow {
  readonly id: string;
  readonly name: string;
  readonly join_code: string;
  readonly owner_id: string;
  readonly created_at: string;
}

const toClass = (row: ClassRow, userId: string): ClassInfo => ({
  id: row.id,
  name: row.name,
  joinCode: row.join_code,
  ownerId: row.owner_id,
  createdAt: row.created_at,
  isOwner: row.owner_id === userId,
});

/** Классы, которые пользователь ведёт или в которых состоит (RLS отдаёт только их). */
export const listMyClasses = async (): Promise<readonly ClassInfo[]> => {
  const supabase = await client();
  const userId = await currentUserId();
  const { data, error } = await supabase.from('classes').select('id, name, join_code, owner_id, created_at').order('created_at', { ascending: false });
  if (error !== null) throw error;
  return (data as ClassRow[]).map((row) => toClass(row, userId));
};

export const getClass = async (classId: string): Promise<ClassInfo | null> => {
  const supabase = await client();
  const userId = await currentUserId();
  const { data, error } = await supabase.from('classes').select('id, name, join_code, owner_id, created_at').eq('id', classId).maybeSingle();
  if (error !== null) throw error;
  return data === null ? null : toClass(data as ClassRow, userId);
};

export const createClass = async (name: string): Promise<ClassInfo> => {
  const supabase = await client();
  const { data, error } = await supabase.rpc('create_class', { p_name: name.trim().slice(0, 80) });
  if (error !== null) throw error;
  const userId = await currentUserId();
  return toClass(data as ClassRow, userId);
};

/** Вступление по коду — через серверную функцию: студент не видит чужие классы напрямую. */
export const joinClass = async (code: string): Promise<string> => {
  const supabase = await client();
  const { data, error } = await supabase.rpc('join_class', { p_code: code.trim().toUpperCase() });
  if (error !== null) throw error;
  return data as string;
};

export const leaveClass = async (classId: string): Promise<void> => {
  const supabase = await client();
  const userId = await currentUserId();
  const { error } = await supabase.from('class_members').delete().eq('class_id', classId).eq('user_id', userId);
  if (error !== null) throw error;
};

export const deleteClass = async (classId: string): Promise<void> => {
  const supabase = await client();
  const { error } = await supabase.from('classes').delete().eq('id', classId);
  if (error !== null) throw error;
};

interface AssignmentRow {
  readonly id: string;
  readonly class_id: string;
  readonly title: string;
  readonly algorithm_ids: string[];
  readonly due_at: string | null;
  readonly created_at: string;
}

const toAssignment = (row: AssignmentRow): Assignment => ({
  id: row.id,
  classId: row.class_id,
  title: row.title,
  algorithmIds: row.algorithm_ids,
  dueAt: row.due_at,
  createdAt: row.created_at,
});

export const listAssignments = async (classIds: readonly string[]): Promise<readonly Assignment[]> => {
  if (classIds.length === 0) return [];
  const supabase = await client();
  const { data, error } = await supabase
    .from('assignments')
    .select('id, class_id, title, algorithm_ids, due_at, created_at')
    .in('class_id', [...classIds])
    .order('created_at', { ascending: false });
  if (error !== null) throw error;
  return (data as AssignmentRow[]).map(toAssignment);
};

export const createAssignment = async (classId: string, title: string, algorithmIds: readonly string[], dueAt: string | null): Promise<Assignment> => {
  const supabase = await client();
  const { data, error } = await supabase
    .from('assignments')
    .insert({ class_id: classId, title: title.trim().slice(0, 120), algorithm_ids: [...algorithmIds], due_at: dueAt })
    .select('id, class_id, title, algorithm_ids, due_at, created_at')
    .single();
  if (error !== null) throw error;
  return toAssignment(data as AssignmentRow);
};

export const deleteAssignment = async (assignmentId: string): Promise<void> => {
  const supabase = await client();
  const { error } = await supabase.from('assignments').delete().eq('id', assignmentId);
  if (error !== null) throw error;
};

interface ProgressRow {
  readonly user_id: string;
  readonly display_name: string | null;
  /** сервер отдаёт только раздел progress, без наборов данных и прочих личных сведений */
  readonly progress: unknown;
  readonly updated_at: string | null;
}

/** Прогресс участников класса — только для преподавателя-владельца (проверяется на сервере). */
export const classProgress = async (classId: string): Promise<readonly MemberProgress[]> => {
  const supabase = await client();
  const { data, error } = await supabase.rpc('get_class_progress', { p_class_id: classId });
  if (error !== null) throw error;
  return (data as ProgressRow[]).map((row) => ({
    userId: row.user_id,
    displayName: row.display_name !== null && row.display_name.length > 0 ? row.display_name : 'Без имени',
    progress: typeof row.progress === 'object' && row.progress !== null ? (row.progress as Record<string, AlgoProgress>) : {},
    updatedAt: row.updated_at,
  }));
};

export const describeCloudError = (error: unknown): string => {
  if (error instanceof CloudUnavailableError) return 'Классы работают в облачном режиме. Администратор сайта должен подключить Supabase.';
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = String((error as { message: string }).message);
    if (/invalid join code|class not found/i.test(message)) return 'Класс с таким кодом не найден. Проверьте код у преподавателя.';
    if (/not authenticated|JWT/i.test(message)) return 'Нужно войти в аккаунт.';
    return message;
  }
  return 'Что-то пошло не так. Попробуйте ещё раз.';
};
