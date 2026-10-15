import confetti from 'canvas-confetti';

const prefersReducedMotion = (): boolean => {
  const motion = document.documentElement.dataset.motion;
  if (motion === 'reduce') return true;
  if (motion === 'full') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const readColor = (name: string): string => {
  const rgb = getComputedStyle(document.documentElement).getPropertyValue(`--c-${name}`).trim().split(/\s+/).join(',');
  return rgb.length > 0 ? `rgb(${rgb})` : '#2f62ff';
};

/** Праздничный залп конфетти в фирменных цветах. Учитывает настройку уменьшенной анимации. */
export const celebrate = (intensity: 'small' | 'big' = 'small'): void => {
  if (typeof window === 'undefined' || prefersReducedMotion()) return;
  const colors = ['brand', 'green', 'yellow', 'pink', 'orange', 'cyan'].map(readColor);
  const base = { colors, disableForReducedMotion: true, zIndex: 120, ticks: 220 } as const;

  if (intensity === 'small') {
    void confetti({ ...base, particleCount: 70, spread: 70, startVelocity: 38, origin: { y: 0.75 } });
    return;
  }
  void confetti({ ...base, particleCount: 90, angle: 60, spread: 65, origin: { x: 0, y: 0.8 } });
  void confetti({ ...base, particleCount: 90, angle: 120, spread: 65, origin: { x: 1, y: 0.8 } });
  window.setTimeout(() => void confetti({ ...base, particleCount: 120, spread: 100, startVelocity: 45, origin: { y: 0.6 } }), 220);
};
