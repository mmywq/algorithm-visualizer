import { useMemo, type CSSProperties } from 'react';

/** Детерминированный генератор случайных чисел: звёзды не «прыгают» между перерисовками. */
const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const CLOUD = ['......cccc......', '...cccccccccc...', '.cccccccccccccc.', 'cccccccccccccccc', 'ssssssssssssssss', '.ssssssssssssss.'];

function PixelCloud({ style, className = '' }: { readonly style: CSSProperties; readonly className?: string }) {
  return (
    <svg aria-hidden="true" className={`pixelated absolute ${className}`} style={style} viewBox="0 0 16 6">
      {CLOUD.flatMap((row, y) =>
        [...row].map((char, x) =>
          char === '.' ? null : (
            <rect fill={char === 'c' ? 'rgb(var(--fx-cloud))' : 'rgb(var(--fx-cloud-shade))'} height={1.04} key={`${x}-${y}`} width={1.04} x={x} y={y} />
          ),
        ),
      )}
    </svg>
  );
}

/**
 * Живой фон: мерцающие пиксельные звёзды, медленно плывущие облака
 * и редкая падающая звезда. Слой не перехватывает события и отключается
 * вместе с анимациями при «уменьшении движения».
 */
export function BackgroundFX() {
  const stars = useMemo(() => {
    const random = seeded(42);
    return Array.from({ length: 28 }, (_, index) => ({
      id: index,
      left: `${random() * 100}%`,
      top: `${random() * 100}%`,
      size: random() < 0.25 ? 12 : random() < 0.6 ? 9 : 6,
      tone: random() < 0.3 ? 'var(--fx-star-2)' : 'var(--fx-star)',
      delay: `${(random() * 6).toFixed(2)}s`,
      duration: `${(2.6 + random() * 3.4).toFixed(2)}s`,
    }));
  }, []);

  return (
    <div aria-hidden="true" className="fx-layer dot-grid pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {stars.map((star) => (
        <svg
          className="fx-star pixelated absolute"
          key={star.id}
          style={{ left: star.left, top: star.top, width: star.size, height: star.size, '--delay': star.delay, '--dur': star.duration } as CSSProperties}
          viewBox="0 0 3 3"
        >
          <rect fill={`rgb(${star.tone})`} height="3" width="1" x="1" y="0" />
          <rect fill={`rgb(${star.tone})`} height="1" width="3" x="0" y="1" />
        </svg>
      ))}
      <PixelCloud className="fx-cloud opacity-60" style={{ top: '14%', width: 128, height: 48, '--dur': '110s', '--delay': '-20s' } as CSSProperties} />
      <PixelCloud className="fx-cloud opacity-40" style={{ top: '46%', width: 96, height: 36, '--dur': '150s', '--delay': '-90s' } as CSSProperties} />
      <PixelCloud className="fx-cloud opacity-50" style={{ top: '78%', width: 160, height: 60, '--dur': '130s', '--delay': '-50s' } as CSSProperties} />
      <span
        className="fx-shoot absolute right-[8%] top-[10%] block h-[3px] w-[120px] rounded-full"
        style={{ background: 'linear-gradient(90deg, rgb(var(--fx-star)), transparent)' }}
      />
    </div>
  );
}
