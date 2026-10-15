import { Search, X } from 'lucide-react';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlgorithmCard } from '@/components/AlgorithmCard';
import { CatSays } from '@/components/mascot/CatSays';
import { PixelCat } from '@/components/mascot/PixelCat';
import { categoryVars } from '@/components/ui/cat';
import { CategoryIcon } from '@/components/ui/CategoryArt';
import { ProgressRing } from '@/components/ui/Progress';
import { catalog, categories, categoryById, levelLabels, type CategoryId, type Level } from '@/content/catalog';
import { usePageMeta } from '@/hooks/usePageMeta';
import { categoryStats, isMastered, isStarted, pluralize } from '@/lib/progress';
import { searchCatalog } from '@/lib/search';
import { useUserStore } from '@/stores/userStore';

type StatusFilter = 'all' | 'new' | 'progress' | 'done' | 'favorites';

const statusOptions: readonly { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'new', label: 'Не начатые' },
  { value: 'progress', label: 'В процессе' },
  { value: 'done', label: 'Освоенные' },
  { value: 'favorites', label: 'Избранное' },
];

export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const data = useUserStore((state) => state.data);
  const petCat = useUserStore((state) => state.petCat);
  const query = params.get('q') ?? '';
  const categoryParam = params.get('c');
  const category = categoryParam !== null && categoryById.has(categoryParam as CategoryId) ? (categoryParam as CategoryId) : null;
  const level = (Number(params.get('l')) || null) as Level | null;
  const status = (statusOptions.some((option) => option.value === params.get('s')) ? params.get('s') : 'all') as StatusFilter;

  usePageMeta({
    title: category === null ? 'Каталог алгоритмов' : categoryById.get(category)?.title,
    description:
      category === null
        ? `Все ${catalog.length} интерактивных демонстраций: сортировки, деревья, графы, динамическое программирование и строки.`
        : categoryById.get(category)?.description,
  });

  const update = (key: string, value: string | null): void => {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value === null || value.length === 0) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  };

  const filtered = useMemo(() => {
    const base = query.trim().length > 0 ? searchCatalog(query, catalog.length) : catalog;
    return base.filter((entry) => {
      if (category !== null && entry.category !== category) return false;
      if (level !== null && entry.level !== level) return false;
      const progress = data.progress[entry.id];
      if (status === 'new' && isStarted(progress)) return false;
      if (status === 'progress' && (!isStarted(progress) || isMastered(progress))) return false;
      if (status === 'done' && !isMastered(progress)) return false;
      if (status === 'favorites' && !data.favorites.includes(entry.id)) return false;
      return true;
    });
  }, [query, category, level, status, data]);

  const grouped = query.trim().length === 0 && category === null;
  const hasFilters = query.length > 0 || category !== null || level !== null || status !== 'all';

  return (
    <div>
      <header className="flex items-end justify-between gap-8">
        <div className="max-w-3xl">
          <p className="tag border-brand text-brand">
            {catalog.length} ДЕМО · {categories.length} МИРОВ
          </p>
          <h1 className="h-display mt-4 text-ink">Каталог алгоритмов</h1>
          <p className="mt-3 text-[17px] font-semibold leading-7 text-ink-2">
            Каждая демонстрация — с теорией, пошаговой анимацией на ваших данных и тестом. Прогресс по каждому этапу виден прямо на карточке.
          </p>
        </div>
        <div className="hidden shrink-0 items-end gap-3 lg:flex">
          <CatSays className="mb-10 max-w-[260px]" tail="right" text="Не знаете, с чего начать? Фильтр «Базовый» — самое то для разминки." />
          <PixelCat interactive onPet={petCat} pose="sit" size={104} />
        </div>
      </header>

      <div className="sticky top-16 z-20 -mx-4 mt-6 border-b-2 border-line bg-bg/92 px-4 pb-3 pt-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative md:w-80">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" size={18} strokeWidth={2.5} />
            <input
              aria-label="Поиск по каталогу"
              className="input pl-10"
              onChange={(event) => update('q', event.target.value)}
              placeholder="Поиск: «куча», «граф», «n log n»"
              type="search"
              value={query}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-none md:flex-wrap">
            {statusOptions.map((option) => (
              <button
                aria-pressed={status === option.value}
                className={`btn btn-sm shrink-0 ${status === option.value ? 'btn-primary' : 'btn-secondary'}`}
                key={option.value}
                onClick={() => update('s', option.value === 'all' ? null : option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
            <select
              aria-label="Уровень сложности"
              className="input input-sm w-auto shrink-0 pr-8 font-bold"
              onChange={(event) => update('l', event.target.value)}
              value={level ?? ''}
            >
              <option value="">Любой уровень</option>
              {([1, 2, 3] as const).map((value) => (
                <option key={value} value={value}>
                  {levelLabels[value]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            aria-pressed={category === null}
            className={`chip h-9 shrink-0 px-3.5 text-sm ${category === null ? 'bg-ink text-surface' : 'border-2 border-line bg-surface'}`}
            onClick={() => update('c', null)}
            type="button"
          >
            Все разделы
          </button>
          {categories.map((item) => (
            <button
              aria-pressed={category === item.id}
              className={`chip h-9 shrink-0 px-3.5 text-sm ${category === item.id ? 'bg-cat text-on' : 'border-2 border-line bg-surface hover:border-cat/50'}`}
              key={item.id}
              onClick={() => update('c', category === item.id ? null : item.id)}
              style={categoryVars(item.id)}
              type="button"
            >
              <CategoryIcon category={item.id} size={15} />
              {item.title}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card mx-auto mt-10 flex max-w-md flex-col items-center p-8 text-center">
          <PixelCat pose="think" size={104} />
          <p className="mt-4 text-xl font-black text-ink">Ничего не найдено</p>
          <p className="mt-2 font-semibold text-ink-2">Попробуйте изменить запрос или сбросить фильтры.</p>
          {hasFilters && (
            <button className="btn btn-secondary mt-5" onClick={() => setParams({}, { replace: true })} type="button">
              <X size={18} strokeWidth={2.5} />
              Сбросить фильтры
            </button>
          )}
        </div>
      ) : grouped ? (
        <div className="mt-8 flex flex-col gap-12">
          {categories.map((item) => {
            const entries = filtered.filter((entry) => entry.category === item.id);
            if (entries.length === 0) return null;
            const stats = categoryStats(data, item.id);
            return (
              <section aria-labelledby={`cat-${item.id}`} key={item.id} style={categoryVars(item.id)}>
                <div className="mb-4 flex items-center gap-3">
                  <ProgressRing label={`Прогресс раздела ${item.title}`} size={46} stroke={6} value={stats.share}>
                    <CategoryIcon category={item.id} className="text-cat" size={18} />
                  </ProgressRing>
                  <div className="min-w-0">
                    <h2 className="font-display text-[24px] leading-tight text-ink" id={`cat-${item.id}`}>
                      {item.title}
                    </h2>
                    <p className="text-[15px] font-semibold text-ink-2">
                      {stats.mastered} из {stats.total} {pluralize(stats.total, 'освоен', 'освоено', 'освоено')} · {item.description}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {entries.map((entry) => (
                    <AlgorithmCard entry={entry} key={entry.id} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <>
          <p className="mt-6 text-[15px] font-bold text-ink-3">
            Найдено: {filtered.length} {pluralize(filtered.length, 'алгоритм', 'алгоритма', 'алгоритмов')}
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((entry) => (
              <AlgorithmCard entry={entry} key={entry.id} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
