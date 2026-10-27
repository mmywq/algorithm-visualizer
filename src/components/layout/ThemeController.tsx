import { MotionGlobalConfig } from 'framer-motion';
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
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#0f0b1c' : '#fbf7ff');
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
    // при «меньше движения» переходы framer сразу встают в конечное состояние: не только без сдвигов,
    // но и без проявления — интерфейс меняется мгновенно, как просил пользователь
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = (): void => {
      MotionGlobalConfig.skipAnimations = motion === 'reduce' || (motion === 'system' && media.matches);
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [motion]);

  return null;
}
