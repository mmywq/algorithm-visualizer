import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CornerDownLeft, GraduationCap, LayoutGrid, Moon, Search, Settings, Sun, UserRound } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { categoryVars } from '@/components/ui/cat';
import { CategoryIcon } from '@/components/ui/CategoryArt';
import { catalog, categoryById } from '@/content/catalog';
import { useHotkeys } from '@/hooks/useHotkeys';
import { searchCatalog } from '@/lib/search';
import { resolveTheme, useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
import { useUserStore } from '@/stores/userStore';

interface PaletteItem {
  readonly key: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly icon: ReactNode;
  readonly style?: React.CSSProperties;
  readonly run: () => void;
}

export function CommandPalette() {
  const open = useUiStore((state) => state.paletteOpen);
  const setOpen = useUiStore((state) => state.setPaletteOpen);
  const navigate = useNavigate();
  const history = useUserStore((state) => state.data.history);
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useHotkeys({ 'mod+k': () => setOpen(!useUiStore.getState().paletteOpen), '/': () => setOpen(true) });

  useEffect(() => {
    if (!open) return undefined;
    setQuery('');
    setActive(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const go = (path: string): void => {
    setOpen(false);
    navigate(path);
  };

  const items = useMemo<readonly PaletteItem[]>(() => {
    const entryItem = (entry: (typeof catalog)[number]): PaletteItem => ({
      key: entry.id,
      title: entry.title,
      subtitle: `${categoryById.get(entry.category)?.title ?? ''} · ${entry.short}`,
      icon: <CategoryIcon category={entry.category} size={18} />,
      style: categoryVars(entry.category),
      run: () => go(entry.path),
    });

    if (query.trim().length > 0) return searchCatalog(query, 10).map(entryItem);

    const recent = history
      .map((item) => catalog.find((entry) => entry.id === item.id))
      .filter((entry): entry is (typeof catalog)[number] => entry !== undefined)
      .slice(0, 4)
      .map(entryItem);
    const dark = resolveTheme(theme) === 'dark';
    const actions: PaletteItem[] = [
      {
        key: 'catalog',
        title: 'Каталог алгоритмов',
        subtitle: `${catalog.length} интерактивных демонстраций`,
        icon: <LayoutGrid size={18} strokeWidth={2.5} />,
        run: () => go('/catalog'),
      },
      {
        key: 'cabinet',
        title: 'Личный кабинет',
        subtitle: 'Прогресс, достижения, наборы данных',
        icon: <UserRound size={18} strokeWidth={2.5} />,
        run: () => go('/cabinet'),
      },
      { key: 'schools', title: 'Для преподавателей и учебных заведений', icon: <GraduationCap size={18} strokeWidth={2.5} />, run: () => go('/for-schools') },
      { key: 'settings', title: 'Настройки', icon: <Settings size={18} strokeWidth={2.5} />, run: () => go('/settings') },
      {
        key: 'theme',
        title: dark ? 'Включить светлую тему' : 'Включить тёмную тему',
        icon: dark ? <Sun size={18} strokeWidth={2.5} /> : <Moon size={18} strokeWidth={2.5} />,
        run: () => {
          setTheme(dark ? 'light' : 'dark');
          setOpen(false);
        },
      },
    ];
    return [...recent, ...actions];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, history, theme]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const onKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((current) => Math.min(items.length - 1, current + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => Math.max(0, current - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      items[active]?.run();
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const hasQuery = query.trim().length > 0;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[85] flex items-start justify-center p-0 sm:p-6 sm:pt-[12vh]">
          <motion.div
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-[rgb(12_14_22/0.55)] backdrop-blur-[2px]"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            aria-label="Поиск"
            aria-modal="true"
            className="relative flex h-[100dvh] w-full flex-col overflow-hidden border-line bg-surface shadow-float sm:h-auto sm:max-h-[70vh] sm:max-w-xl sm:rounded-3xl sm:border-2"
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            onKeyDown={onKeyDown}
            role="dialog"
            transition={{ duration: 0.16 }}
          >
            <div className="flex items-center gap-3 border-b-2 border-line px-4 py-3">
              <Search className="shrink-0 text-ink-3" size={22} strokeWidth={2.5} />
              <input
                aria-activedescendant={items[active] === undefined ? undefined : `palette-${items[active]!.key}`}
                aria-controls="palette-list"
                aria-label="Найти алгоритм"
                className="h-10 min-w-0 flex-1 bg-transparent text-[17px] font-bold text-ink outline-none placeholder:font-semibold placeholder:text-ink-3"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Найти алгоритм: «дейкстра», «куча», «O(log n)»…"
                ref={inputRef}
                role="combobox"
                aria-expanded="true"
                value={query}
              />
              <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} type="button">
                Esc
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2" id="palette-list" ref={listRef} role="listbox">
              {!hasQuery && (
                <p className="px-3 pb-1 pt-2 text-xs font-extrabold uppercase tracking-wide text-ink-3">
                  {history.length > 0 ? 'Недавние и действия' : 'Быстрые действия'}
                </p>
              )}
              {items.length === 0 && (
                <div className="px-4 py-10 text-center">
                  <p className="font-extrabold text-ink">Ничего не нашлось</p>
                  <p className="mt-1 text-sm font-semibold text-ink-2">Попробуйте другое слово: «сортировка», «граф», «стек».</p>
                </div>
              )}
              {items.map((item, index) => (
                <button
                  aria-selected={index === active}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors ${index === active ? 'bg-surface-2' : ''}`}
                  data-index={index}
                  id={`palette-${item.key}`}
                  key={item.key}
                  onClick={item.run}
                  onMouseMove={() => setActive(index)}
                  role="option"
                  style={item.style}
                  type="button"
                >
                  <span
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.style === undefined ? 'bg-surface-2 text-ink-2' : 'bg-cat/12 text-cat'}`}
                  >
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-extrabold text-ink">{item.title}</span>
                    {item.subtitle !== undefined && <span className="block truncate text-sm font-semibold text-ink-3">{item.subtitle}</span>}
                  </span>
                  {index === active ? (
                    <CornerDownLeft className="shrink-0 text-ink-3" size={16} strokeWidth={2.5} />
                  ) : (
                    <ArrowRight className="shrink-0 text-line-strong" size={16} strokeWidth={2.5} />
                  )}
                </button>
              ))}
            </div>
            <div className="hidden items-center gap-4 border-t-2 border-line px-4 py-2.5 text-xs font-bold text-ink-3 sm:flex">
              <span>
                <span className="kbd">↑</span> <span className="kbd">↓</span> выбор
              </span>
              <span>
                <span className="kbd">Enter</span> открыть
              </span>
              <span className="ml-auto">
                <span className="kbd">Ctrl</span> <span className="kbd">K</span> в любом месте
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
