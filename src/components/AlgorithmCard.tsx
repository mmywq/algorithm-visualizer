import { BookOpen, Clock, Play, Star, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { categoryVars } from '@/components/ui/cat';
import { CategoryIcon } from '@/components/ui/CategoryArt';
import { LevelBadge } from '@/components/ui/LevelBadge';
import type { AlgorithmEntry } from '@/content/catalog';
import { isMastered } from '@/lib/progress';
import { useUserStore } from '@/stores/userStore';

interface AlgorithmCardProps {
  readonly entry: AlgorithmEntry;
  readonly variant?: 'default' | 'compact';
}

export function AlgorithmCard({ entry, variant = 'default' }: AlgorithmCardProps) {
  const progress = useUserStore((state) => state.data.progress[entry.id]);
  const favorite = useUserStore((state) => state.data.favorites.includes(entry.id));
  const toggleFavorite = useUserStore((state) => state.toggleFavorite);
  const mastered = isMastered(progress);

  const steps = [
    { key: 'theory', done: progress?.theoryAt !== undefined, icon: BookOpen, label: 'Теория' },
    { key: 'demo', done: progress?.demoAt !== undefined, icon: Play, label: 'Демонстрация' },
    { key: 'quiz', done: progress?.quizAt !== undefined, icon: Target, label: 'Тест' },
  ];

  return (
    <article className="group relative h-full" style={categoryVars(entry.category)}>
      <Link className="card card-hover flex h-full flex-col p-4 outline-none focus-visible:ring-4 focus-visible:ring-brand/30 sm:p-5" to={entry.path}>
        <div className="flex items-start gap-3 pr-8">
          <span
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cat text-on"
            style={{ boxShadow: 'inset 0 -4px 0 rgb(var(--cat-press))' }}
          >
            <CategoryIcon category={entry.category} size={22} />
          </span>
          <div className="min-w-0">
            <h3 className="text-[17px] font-black leading-snug tracking-[-0.01em] text-ink group-hover:text-cat">{entry.title}</h3>
            {variant === 'default' && <p className="mt-1 text-[15px] font-semibold leading-snug text-ink-2">{entry.short}</p>}
          </div>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
          {entry.isNew === true && <span className="chip bg-yellow text-on">Новое</span>}
          {variant === 'default' && <LevelBadge level={entry.level} />}
          <span className="chip font-mono text-[12px]">{entry.complexity}</span>
          {variant === 'default' && (
            <span className="chip">
              <Clock size={13} strokeWidth={2.75} />
              {entry.minutes} мин
            </span>
          )}
          <span aria-label={mastered ? 'Освоено' : 'Прогресс по этапам'} className="ml-auto flex items-center gap-1">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${step.done ? 'bg-green text-on' : 'bg-surface-2 text-line-strong'}`}
                  key={step.key}
                  title={`${step.label}: ${step.done ? 'пройдено' : 'не пройдено'}`}
                >
                  <Icon size={12} strokeWidth={3} />
                </span>
              );
            })}
          </span>
        </div>
      </Link>

      <button
        aria-label={favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
        aria-pressed={favorite}
        className={`absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${favorite ? 'text-yellow' : 'text-line-strong hover:bg-surface-2 hover:text-ink-3'}`}
        onClick={() => toggleFavorite(entry.id)}
        type="button"
      >
        <Star fill={favorite ? 'currentColor' : 'none'} size={20} strokeWidth={2.5} />
      </button>
    </article>
  );
}
