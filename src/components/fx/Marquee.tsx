import { useEffect, useRef, type CSSProperties } from 'react';
import type { ColorName } from '@/content/catalog';

interface MarqueeProps {
  readonly items: readonly string[];
  readonly color?: ColorName;
  readonly duration?: number;
  readonly reverse?: boolean;
  readonly className?: string;
}

function Star() {
  return (
    <svg aria-hidden="true" className="pixelated mx-4 inline-block h-3 w-3 shrink-0" viewBox="0 0 3 3">
      <rect fill="currentColor" height="3" width="1" x="1" y="0" />
      <rect fill="currentColor" height="1" width="3" x="0" y="1" />
    </svg>
  );
}

const reducedMotion = (): boolean =>
  document.documentElement.dataset.motion === 'reduce' ||
  (document.documentElement.dataset.motion !== 'full' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

/**
 * Бегущая строка в духе аркадных автоматов. Откликается на прокрутку: при быстрой прокрутке вниз
 * разгоняется, при прокрутке вверх ненадолго бежит назад, потом плавно возвращается к своему ходу.
 * Наведение ставит её на паузу, а за пределами экрана она не тратит кадры.
 */
export function Marquee({ items, color = 'purple', duration = 40, reverse = false, className = '' }: MarqueeProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const sequence = [...items, ...items];

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    if (root === null || track === null || reducedMotion()) return undefined;
    const animation = track.getAnimations()[0];
    if (animation === undefined) return undefined;

    let visible = true;
    let hovered = false;
    const sync = (): void => {
      if (visible && !hovered) animation.play();
      else animation.pause();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      sync();
    });
    observer.observe(root);
    const onEnter = (): void => {
      hovered = true;
      sync();
    };
    const onLeave = (): void => {
      hovered = false;
      sync();
    };
    root.addEventListener('pointerenter', onEnter);
    root.addEventListener('pointerleave', onLeave);

    // скорость прокрутки (пикселей за миллисекунду) превращается в добавку к скорости строки
    let lastY = window.scrollY;
    let lastTime = performance.now();
    let target = 0;
    let boost = 0;
    let frame = 0;
    const tick = (): void => {
      boost += (target - boost) * 0.18;
      target *= 0.9;
      if (Math.abs(boost) < 0.01 && Math.abs(target) < 0.01) {
        animation.playbackRate = 1;
        frame = 0;
        return;
      }
      animation.playbackRate = 1 + boost;
      frame = requestAnimationFrame(tick);
    };
    const onScroll = (): void => {
      const now = performance.now();
      const velocity = (window.scrollY - lastY) / Math.max(16, now - lastTime);
      lastY = window.scrollY;
      lastTime = now;
      target = Math.max(-3, Math.min(5, velocity * 2.4));
      if (frame === 0) frame = requestAnimationFrame(tick);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      observer.disconnect();
      root.removeEventListener('pointerenter', onEnter);
      root.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      aria-label={items.join(' · ')}
      className={`marquee relative overflow-hidden border-y-2 py-2.5 text-on ${className}`}
      ref={rootRef}
      role="marquee"
      style={{ background: `rgb(var(--c-${color}))`, borderColor: `rgb(var(--c-${color}-press))` }}
    >
      {/* надпись растворяется у краёв, а сама полоса остаётся сплошной */}
      <div className="marquee-fade">
        <div
          aria-hidden="true"
          className="marquee-track flex w-max items-center whitespace-nowrap font-display text-[16px] leading-none sm:text-[24px]"
          ref={trackRef}
          style={{ '--dur': `${duration}s`, animationDirection: reverse ? 'reverse' : 'normal' } as CSSProperties}
        >
          {[0, 1].map((copy) => (
            <span className="flex items-center" key={copy}>
              {sequence.map((item, index) => (
                <span className="flex items-center" key={`${copy}-${index}`}>
                  {item}
                  <Star />
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
