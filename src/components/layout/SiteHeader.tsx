interface SiteHeaderProps {
  readonly navigate: (route: string) => void;
}

const shortcuts = [
  { label: 'Каталог', route: '/' },
  { label: 'Сортировки', route: '/sorting/player' },
  { label: 'Структуры', route: '/structures/stack-array' },
  { label: 'Графы', route: '/graphs/traversal' },
] as const;

export function SiteHeader({ navigate }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-20 mb-6 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-3 px-4 py-4 lg:px-8">
        <button className="text-left" onClick={() => navigate('/')} type="button">
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Algorithm Visualizer</p>
          <p className="text-lg font-semibold text-slate-100">Интерактивная среда изучения алгоритмов и структур данных</p>
        </button>

        <nav className="flex flex-wrap gap-2">
          {shortcuts.map((shortcut) => (
            <button className="control-button" key={shortcut.route} onClick={() => navigate(shortcut.route)} type="button">
              {shortcut.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
