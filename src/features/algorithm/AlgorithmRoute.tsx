import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  Code2,
  ExternalLink,
  MoreHorizontal,
  Play,
  Printer,
  Share2,
  Star,
  Target,
} from 'lucide-react';
import { Suspense, useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageSkeleton } from '@/components/layout/PageSkeleton';
import { categoryVars } from '@/components/ui/cat';
import { CategoryIcon } from '@/components/ui/CategoryArt';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { Menu } from '@/components/ui/Menu';
import { brand } from '@/config/brand';
import { catalog, categoryById, type AlgorithmEntry } from '@/content/catalog';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useUserStore } from '@/stores/userStore';
import { AlgorithmContext, type AlgorithmTab } from './AlgorithmContext';
import { QuizView } from './QuizView';
import { demoRegistry } from './registry';
import { ShareDialog } from './ShareDialog';
import { TheoryView } from './TheoryView';

const tabs: readonly AlgorithmTab[] = ['demo', 'theory', 'quiz'];

export default function AlgorithmRoute({ entry }: { readonly entry: AlgorithmEntry }) {
  const [params, setParams] = useSearchParams();
  const embed = params.get('embed') === '1';
  const tabParam = params.get('tab');
  const tab: AlgorithmTab = tabs.includes(tabParam as AlgorithmTab) ? (tabParam as AlgorithmTab) : 'demo';
  const visit = useUserStore((state) => state.visit);
  const Demo = demoRegistry[entry.id];

  usePageMeta({ title: entry.title, description: `${entry.short}. Пошаговая интерактивная демонстрация, теория и тест.`, noindex: embed });

  useEffect(() => {
    if (!embed) visit(entry.id);
  }, [embed, entry.id, visit]);

  const setTab = useCallback(
    (next: AlgorithmTab) => {
      setParams(
        (previous) => {
          const updated = new URLSearchParams(previous);
          if (next === 'demo') updated.delete('tab');
          else updated.set('tab', next);
          return updated;
        },
        { replace: false },
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setParams],
  );

  const context = useMemo(() => ({ entry, embed, setTab }), [entry, embed, setTab]);
  const demo = Demo === undefined ? <ComingSoon /> : <Demo />;

  if (embed) {
    return (
      <AlgorithmContext.Provider value={context}>
        <div style={categoryVars(entry.category)}>
          <div className="mb-3 flex items-center gap-3">
            <h1 className="min-w-0 flex-1 truncate text-lg font-black text-ink">{entry.title}</h1>
            <a className="btn btn-ghost btn-sm" href={entry.path} rel="noopener" target="_blank">
              Открыть в «{brand.name}»
              <ExternalLink size={15} strokeWidth={2.5} />
            </a>
          </div>
          <Suspense fallback={<PageSkeleton />}>{demo}</Suspense>
        </div>
      </AlgorithmContext.Provider>
    );
  }

  return (
    <AlgorithmContext.Provider value={context}>
      <div style={categoryVars(entry.category)}>
        <AlgorithmHeader entry={entry} onTab={setTab} tab={tab} />
        <div className="mt-6">
          {tab === 'demo' && <Suspense fallback={<PageSkeleton />}>{demo}</Suspense>}
          {tab === 'theory' && <TheoryView entry={entry} onNavigate={setTab} />}
          {tab === 'quiz' && <QuizView entry={entry} onNavigate={setTab} />}
        </div>
        <NeighborNav entry={entry} />
      </div>
    </AlgorithmContext.Provider>
  );
}

function AlgorithmHeader({ entry, tab, onTab }: { readonly entry: AlgorithmEntry; readonly tab: AlgorithmTab; readonly onTab: (tab: AlgorithmTab) => void }) {
  const category = categoryById.get(entry.category);
  const progress = useUserStore((state) => state.data.progress[entry.id]);
  const favorite = useUserStore((state) => state.data.favorites.includes(entry.id));
  const toggleFavorite = useUserStore((state) => state.toggleFavorite);
  const [share, setShare] = useState<null | 'link' | 'embed' | 'qr'>(null);

  const steps = [
    { value: 'demo' as const, label: 'Демонстрация', short: 'Демо', icon: Play, done: progress?.demoAt !== undefined },
    { value: 'theory' as const, label: 'Теория', short: 'Теория', icon: BookOpen, done: progress?.theoryAt !== undefined },
    { value: 'quiz' as const, label: 'Тест', short: 'Тест', icon: Target, done: progress?.quizAt !== undefined },
  ];

  return (
    <header>
      <nav aria-label="Навигационная цепочка" className="flex items-center gap-1 text-sm font-bold text-ink-3">
        <Link className="hover:text-ink" to="/catalog">
          Каталог
        </Link>
        <ChevronRight size={14} strokeWidth={2.75} />
        <Link className="hover:text-cat" to={`/catalog?c=${entry.category}`}>
          {category?.title}
        </Link>
      </nav>

      <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-start">
        <span
          className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-cat text-on sm:inline-flex"
          style={{ boxShadow: 'inset 0 -5px 0 rgb(var(--cat-press))' }}
        >
          <CategoryIcon category={entry.category} size={30} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[32px] leading-[1.1] text-ink sm:text-[40px]">{entry.title}</h1>
          <p className="mt-1.5 text-[17px] font-semibold text-ink-2">{entry.short}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <LevelBadge level={entry.level} />
            <span className="chip font-mono text-[12px]">
              <Code2 size={13} strokeWidth={2.75} />
              {entry.complexity}
            </span>
            <span className="chip">
              <Clock size={13} strokeWidth={2.75} />~{entry.minutes} мин
            </span>
            {entry.isNew === true && <span className="chip bg-yellow text-on">Новое</span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            aria-label={favorite ? 'Убрать из избранного' : 'В избранное'}
            aria-pressed={favorite}
            className={`btn btn-secondary btn-icon ${favorite ? 'text-yellow' : ''}`}
            onClick={() => toggleFavorite(entry.id)}
            title={favorite ? 'В избранном' : 'В избранное'}
            type="button"
          >
            <Star fill={favorite ? 'currentColor' : 'none'} size={20} strokeWidth={2.5} />
          </button>
          <button className="btn btn-secondary" onClick={() => setShare('link')} type="button">
            <Share2 size={18} strokeWidth={2.5} />
            <span className="hidden sm:inline">Поделиться</span>
          </button>
          <Menu
            items={[
              { key: 'embed', label: 'Встроить в курс', icon: <Code2 size={18} strokeWidth={2.5} />, onSelect: () => setShare('embed') },
              { key: 'qr', label: 'QR-код для аудитории', icon: <Share2 size={18} strokeWidth={2.5} />, onSelect: () => setShare('qr') },
              {
                key: 'print',
                label: 'Распечатать теорию',
                icon: <Printer size={18} strokeWidth={2.5} />,
                onSelect: () => {
                  onTab('theory');
                  window.setTimeout(() => window.print(), 600);
                },
              },
            ]}
            trigger={({ toggle, open }) => (
              <button aria-expanded={open} aria-label="Ещё действия" className="btn btn-secondary btn-icon" onClick={toggle} type="button">
                <MoreHorizontal size={20} strokeWidth={2.5} />
              </button>
            )}
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 sm:inline-grid sm:gap-3" role="tablist" aria-label="Этапы изучения">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const active = tab === step.value;
          return (
            <button
              aria-selected={active}
              className={`relative flex items-center justify-center gap-2 rounded-2xl border-2 px-2 py-2.5 text-[14px] font-black transition-[transform,background-color,border-color] active:translate-y-[2px] sm:min-w-[170px] sm:justify-start sm:px-4 sm:text-[15px] ${
                active ? 'border-cat bg-cat text-on' : 'border-line bg-surface text-ink-2 hover:border-line-strong'
              }`}
              key={step.value}
              onClick={() => onTab(step.value)}
              role="tab"
              style={{ boxShadow: active ? '0 4px 0 rgb(var(--cat-press))' : '0 3px 0 rgb(var(--c-line))' }}
              type="button"
            >
              <span
                className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  step.done ? 'bg-green text-on' : active ? 'bg-white/25 text-on' : 'bg-surface-2 text-ink-3'
                }`}
              >
                {step.done ? <Check size={15} strokeWidth={3.5} /> : <Icon size={14} strokeWidth={3} />}
              </span>
              <span className="truncate">
                <span className="hidden sm:inline">{index + 1}. </span>
                <span className="sm:hidden">{step.short}</span>
                <span className="hidden sm:inline">{step.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      <ShareDialog entry={entry} initialTab={share ?? 'link'} onClose={() => setShare(null)} open={share !== null} />
    </header>
  );
}

function NeighborNav({ entry }: { readonly entry: AlgorithmEntry }) {
  const index = catalog.findIndex((item) => item.id === entry.id);
  const previous = index > 0 ? catalog[index - 1] : undefined;
  const next = index < catalog.length - 1 ? catalog[index + 1] : undefined;

  return (
    <nav aria-label="Соседние алгоритмы" className="no-print mt-12 grid gap-3 sm:grid-cols-2">
      {previous !== undefined ? (
        <Link className="card card-hover flex items-center gap-3 p-4" style={categoryVars(previous.category)} to={previous.path}>
          <ArrowLeft className="shrink-0 text-ink-3" size={20} strokeWidth={2.5} />
          <span className="min-w-0">
            <span className="block text-sm font-bold text-ink-3">Предыдущий</span>
            <span className="block truncate font-black text-ink">{previous.title}</span>
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next !== undefined && (
        <Link className="card card-hover flex items-center justify-end gap-3 p-4 text-right" style={categoryVars(next.category)} to={next.path}>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-ink-3">Следующий</span>
            <span className="block truncate font-black text-ink">{next.title}</span>
          </span>
          <ArrowRight className="shrink-0 text-ink-3" size={20} strokeWidth={2.5} />
        </Link>
      )}
    </nav>
  );
}

function ComingSoon() {
  return (
    <div className="card p-8 text-center">
      <p className="text-xl font-black text-ink">Демонстрация готовится</p>
      <p className="mt-2 font-semibold text-ink-2">Пока можно изучить теорию и пройти тест.</p>
    </div>
  );
}

export type DemoComponent = ComponentType;
