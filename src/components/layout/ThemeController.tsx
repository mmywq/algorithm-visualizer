import { useEffect } from 'react';
import { resolveTheme, useSettingsStore } from '@/stores/settingsStore';

/** Применяет тему и режим анимации к <html>; следит за системной темой. */
export function ThemeController() {
  const theme = useSettingsStore((state) => state.theme);
  const motion = useSettingsStore((state) => state.motion);

  useEffect(() => {
    const apply = (): void => {
      const resolved = resolveTheme(theme);
      document.documentElement.dataset.theme = resolved;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#11131a' : '#f5f6f8');
    };
    apply();
    if (theme !== 'system') return undefined;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  useEffect(() => {
    if (motion === 'system') delete document.documentElement.dataset.motion;
    else document.documentElement.dataset.motion = motion;
  }, [motion]);

  return null;
}
