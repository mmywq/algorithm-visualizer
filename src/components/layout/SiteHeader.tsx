import { themeOptions, useUiPreferencesStore } from '@/stores/uiPreferencesStore';
import type { ThemeName } from '@/stores/uiPreferencesStore';

interface SiteHeaderProps {
  readonly navigate: (route: string) => void;
}

export function SiteHeader({ navigate }: SiteHeaderProps) {
  const theme = useUiPreferencesStore((state) => state.theme);
  const setTheme = useUiPreferencesStore((state) => state.setTheme);

  return (
    <header className="sticky top-0 z-20 mb-6 rounded-2xl border border-app bg-surface/85 backdrop-blur-xl">
      <div className="flex w-full flex-col gap-3 px-3 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-4">
        <button className="text-left" onClick={() => navigate('/')} type="button">
          <p className="text-xs uppercase tracking-[0.22em] text-accent">Визуализатор алгоритмов</p>
          <p className="text-lg font-semibold text-app-primary">Интерактивная среда изучения алгоритмов и структур данных</p>
        </button>

        <nav className="flex flex-wrap items-center gap-2">
          <button className="control-button" onClick={() => navigate('/')} type="button">
            Каталог разделов
          </button>
          <label className="flex items-center gap-2 text-sm text-app-muted">
            Тема
            <select
              className="control-input"
              onChange={(event) => setTheme(event.target.value as ThemeName)}
              value={theme}
            >
              {themeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </nav>
      </div>
    </header>
  );
}
