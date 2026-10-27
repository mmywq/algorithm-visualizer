import { Star } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlgorithmCard } from '@/components/AlgorithmCard';
import { Reveal } from '@/components/fx/Reveal';
import { PixelCat } from '@/components/mascot/PixelCat';
import { QuestsPanel } from '@/components/QuestsPanel';
import { categoryVars } from '@/components/ui/cat';
import { CategoryIcon } from '@/components/ui/CategoryArt';
import { ProgressBar } from '@/components/ui/Progress';
import { Tabs } from '@/components/ui/Tabs';
import { Window } from '@/components/ui/Window';
import { categories, entryById } from '@/content/catalog';
import { usePageMeta } from '@/hooks/usePageMeta';
import { categoryStats } from '@/lib/progress';
import { useUserStore } from '@/stores/userStore';
import { AccountCard } from './AccountCard';
import { AchievementsGrid } from './AchievementsGrid';
import { ActivityHeatmap } from './ActivityHeatmap';
import { ClassesPanel } from './ClassesPanel';
import { PlayerCard } from './PlayerCard';
import { PresetsPanel } from './PresetsPanel';
import { WardrobePanel } from './WardrobePanel';

type CabinetTab = 'overview' | 'wardrobe' | 'achievements' | 'presets' | 'classes';
const tabs: readonly { value: CabinetTab; label: string }[] = [
  { value: 'overview', label: 'Обзор' },
  { value: 'wardrobe', label: 'Гардероб' },
  { value: 'achievements', label: 'Достижения' },
  { value: 'presets', label: 'Наборы' },
  { value: 'classes', label: 'Классы' },
];

export default function CabinetPage() {
  usePageMeta({ title: 'Личный кабинет', noindex: true });
  const [params, setParams] = useSearchParams();
  const tab = (tabs.some((item) => item.value === params.get('tab')) ? params.get('tab') : 'overview') as CabinetTab;
  const data = useUserStore((state) => state.data);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="tag border-brand text-brand">ЛИЧНЫЙ КАБИНЕТ</p>
          <h1 className="h-display mt-4 text-ink">Мой прогресс</h1>
        </div>
        <div className="max-w-full overflow-x-auto scrollbar-none">
          <Tabs
            ariaLabel="Разделы кабинета"
            items={tabs}
            onChange={(value) => setParams(value === 'overview' ? {} : { tab: value }, { replace: true })}
            value={tab}
          />
        </div>
      </header>

      <PlayerCard />

      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Reveal>
              <Window bodyClassName="p-5 sm:p-6" color="green" title="Календарь занятий">
                <ActivityHeatmap activity={data.activity} />
              </Window>
            </Reveal>
            <Reveal delay={0.06}>
              <QuestsPanel className="h-full" />
            </Reveal>
          </div>

          <Reveal>
            <Window bodyClassName="grid gap-3 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3" color="purple" title="Прогресс по мирам">
              {categories.map((category) => {
                const stats = categoryStats(data, category.id);
                return (
                  <Link
                    className="flex items-center gap-3 rounded-2xl border-2 border-line bg-surface-2 p-3 transition-colors hover:border-cat/60"
                    key={category.id}
                    style={categoryVars(category.id)}
                    to={`/catalog?c=${category.id}`}
                  >
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-cat-press bg-cat text-on">
                      <CategoryIcon category={category.id} size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-black text-ink">{category.title}</span>
                        <span className="font-display text-[16px] text-ink-3">
                          {stats.mastered}/{stats.total}
                        </span>
                      </span>
                      <ProgressBar className="mt-2" height={8} label={`Прогресс: ${category.title}`} value={stats.share} />
                    </span>
                  </Link>
                );
              })}
            </Window>
          </Reveal>

          <div className="grid gap-6 lg:grid-cols-2">
            <Reveal>
              <Window bodyClassName="p-5 sm:p-6" color="cyan" title="Недавно открытые">
                {data.history.length === 0 ? (
                  <p className="text-[15px] font-semibold text-ink-2">Здесь появятся алгоритмы, которые вы открывали.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {data.history.slice(0, 6).map((item) => {
                      const entry = entryById.get(item.id);
                      if (entry === undefined) return null;
                      return (
                        <li key={item.id}>
                          <Link
                            className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface-2"
                            style={categoryVars(entry.category)}
                            to={entry.path}
                          >
                            <CategoryIcon category={entry.category} className="shrink-0 text-cat" size={18} />
                            <span className="min-w-0 flex-1 truncate font-bold text-ink">{entry.title}</span>
                            <span className="shrink-0 text-[13px] font-bold text-ink-3">
                              {new Date(item.at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Window>
            </Reveal>
            <Reveal delay={0.06}>
              <Window bodyClassName="p-5 sm:p-6" color="yellow" title="Хранилище">
                <AccountCard />
              </Window>
            </Reveal>
          </div>

          <section>
            <h2 className="flex items-center gap-2 font-display text-[24px] text-ink">
              <Star className="text-yellow" fill="currentColor" size={20} />
              Избранное
            </h2>
            {data.favorites.length === 0 ? (
              <div className="card mt-3 flex items-center gap-4 p-5">
                <PixelCat pose="think" size={52} />
                <p className="text-[15px] font-semibold text-ink-2">Отмечайте звёздочкой алгоритмы, к которым хотите вернуться, — они соберутся здесь.</p>
              </div>
            ) : (
              <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {data.favorites.map((id) => {
                  const entry = entryById.get(id);
                  return entry === undefined ? null : <AlgorithmCard entry={entry} key={id} />;
                })}
              </div>
            )}
          </section>
        </>
      )}

      {tab === 'wardrobe' && (
        <Window bodyClassName="p-5 sm:p-6" color="pink" title="Гардероб Кэша">
          <WardrobePanel />
        </Window>
      )}

      {tab === 'achievements' && (
        <Window bodyClassName="p-5 sm:p-6" color="yellow" title="Достижения">
          <AchievementsGrid data={data} />
        </Window>
      )}

      {tab === 'presets' && (
        <Window bodyClassName="p-5 sm:p-6" color="purple" title="Мои наборы данных">
          <PresetsPanel />
        </Window>
      )}

      {tab === 'classes' && (
        <Window bodyClassName="p-5 sm:p-6" color="cyan" title="Классы и задания">
          <ClassesPanel />
        </Window>
      )}
    </div>
  );
}
