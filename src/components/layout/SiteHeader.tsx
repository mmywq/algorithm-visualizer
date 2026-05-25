interface SiteHeaderProps {
  readonly navigate: (route: string) => void;
}

export function SiteHeader({ navigate }: SiteHeaderProps) {
  return (
    <header className="mx-auto mb-6 flex w-full max-w-6xl items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <button className="text-left" onClick={() => navigate('/')} type="button">
        <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Algorithm Visualizer</p>
        <p className="text-lg font-semibold text-slate-100">Дипломный интерактивный справочник</p>
      </button>
    </header>
  );
}
