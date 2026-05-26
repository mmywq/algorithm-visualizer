interface SiteHeaderProps {
  readonly navigate: (route: string) => void;
}
import { useUiPreferencesStore } from '@/stores';

const shortcuts = [
  { label: 'Каталог', route: '/' },
  { label: 'Сортировки', route: '/sorting/player' },
  { label: 'Структуры', route: '/structures/stack-array' },
  { label: 'Графы', route: '/graphs/traversal' },
] as const;

export function SiteHeader({ navigate }: SiteHeaderProps) {
  const toggleTheme = useUiPreferencesStore((state) => state.toggleTheme);
  return (
    <header className="sticky top-0 z-20 mb-6 rounded-2xl border border-app bg-surface/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-3 px-4 py-4 lg:px-8">
        <button className="text-left" onClick={() => navigate('/')} type="button">
          <p className="text-xs uppercase tracking-[0.22em] text-accent">Algorithm Visualizer</p>
          <p className="text-lg font-semibold text-app-primary">Интерактивная среда изучения алгоритмов и структур данных</p>
        </button>

        <nav className="flex flex-wrap gap-2">
          {shortcuts.map((shortcut) => (
            <button className="control-button" key={shortcut.route} onClick={() => navigate(shortcut.route)} type="button">
              {shortcut.label}
            </button>
          ))}
          <button className="control-button" onClick={toggleTheme} type="button">Тема</button>
        </nav>
      </div>
    </header>
  );
}
