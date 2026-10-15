import type { CSSProperties } from 'react';
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

/** Бегущая строка в духе аркадных автоматов. Наведение ставит её на паузу. */
export function Marquee({ items, color = 'purple', duration = 40, reverse = false, className = '' }: MarqueeProps) {
  const sequence = [...items, ...items];
  return (
    <div
      aria-label={items.join(' · ')}
      className={`marquee relative overflow-hidden border-y-2 py-2.5 text-on ${className}`}
      role="marquee"
      style={{ background: `rgb(var(--c-${color}))`, borderColor: `rgb(var(--c-${color}-press))` }}
    >
      <div
        aria-hidden="true"
        className="marquee-track flex w-max items-center whitespace-nowrap font-display text-[16px] leading-none sm:text-[24px]"
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
  );
}
