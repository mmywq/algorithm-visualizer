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
    <header className="mx-auto mb-6 flex w-full max-w-6xl flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <button className="text-left" onClick={() => navigate('/')} type="button">
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Algorithm Visualizer</p>
          <p className="text-lg font-semibold text-slate-100">Дипломный интерактивный справочник</p>
        </button>
      </div>

      <nav className="flex flex-wrap gap-2">
        {shortcuts.map((shortcut) => (
          <button
            className="control-button"
            key={shortcut.route}
            onClick={() => navigate(shortcut.route)}
            type="button"
          >
            {shortcut.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
