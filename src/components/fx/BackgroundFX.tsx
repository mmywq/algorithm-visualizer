import { useEffect, useMemo, useRef, type CSSProperties } from 'react';

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

/** Пиксельная звезда-крестик; у «искрящих» звёзд иногда на миг вырастают длинные лучи. */
function PixelStar({ tone, sparkle }: { readonly tone: string; readonly sparkle: boolean }) {
  const fill = `rgb(${tone})`;
  return (
    <>
      <rect fill={fill} height="3" width="1" x="2" y="1" />
      <rect fill={fill} height="1" width="3" x="1" y="2" />
      {sparkle && (
        <g className="fx-rays" fill={fill}>
          <rect height="1" width="1" x="2" y="0" />
          <rect height="1" width="1" x="2" y="4" />
          <rect height="1" width="1" x="0" y="2" />
          <rect height="1" width="1" x="4" y="2" />
        </g>
      )}
    </>
  );
}

/** Комета: голова и хвост из пикселей, который тускнеет к концу. */
function PixelComet() {
  const tail = [1, 0.75, 0.55, 0.38, 0.24, 0.12];
  return (
    <svg aria-hidden="true" className="pixelated block" height="12" viewBox="0 0 16 2" width="96">
      <rect fill="rgb(var(--fx-star))" height="2" width="2" x="0" y="0" />
      {tail.map((alpha, index) => (
        <rect fill="rgb(var(--fx-star))" height="1" key={alpha} opacity={alpha} width="2" x={2 + index * 2} y={index < 2 ? 0 : 1} />
      ))}
    </svg>
  );
}

/**
 * Живой фон: мерцающие пиксельные звёзды, медленно плывущие облака и редкая комета.
 * Мерцание стартует «с середины» (отрицательные задержки), поэтому звёзды не вспыхивают
 * разом при загрузке. Слой не перехватывает события и замирает при «уменьшении движения».
 */
export function BackgroundFX() {
  const stars = useMemo(() => {
    const random = seeded(42);
    return Array.from({ length: 28 }, (_, index) => {
      const duration = 2.6 + random() * 3.4;
      return {
        id: index,
        left: `${random() * 100}%`,
        top: `${random() * 100}%`,
        // 5 клеток рисунка × целое число экранных пикселей — крестики остаются чёткими
        size: random() < 0.25 ? 20 : random() < 0.6 ? 15 : 10,
        tone: random() < 0.3 ? 'var(--fx-star-2)' : 'var(--fx-star)',
        sparkle: index % 3 === 0,
        delay: `${(-random() * duration).toFixed(2)}s`,
        duration: `${duration.toFixed(2)}s`,
      };
    });
  }, []);

  // комета каждый пролёт стартует с нового места и под новым углом
  const cometRef = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const comet = cometRef.current;
    if (comet === null) return undefined;
    const random = seeded(7);
    const place = (): void => {
      comet.style.setProperty('--comet-x', `${55 + random() * 40}vw`);
      comet.style.setProperty('--comet-y', `${4 + random() * 30}vh`);
      comet.style.setProperty('--comet-angle', `${-(16 + random() * 22)}deg`);
    };
    place();
    comet.addEventListener('animationiteration', place);
    return () => comet.removeEventListener('animationiteration', place);
  }, []);

  return (
    <div aria-hidden="true" className="fx-layer dot-grid pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {stars.map((star) => (
        <svg
          className={`fx-star pixelated absolute ${star.sparkle ? 'fx-sparkle' : ''}`}
          key={star.id}
          style={{ left: star.left, top: star.top, width: star.size, height: star.size, '--delay': star.delay, '--dur': star.duration } as CSSProperties}
          viewBox="0 0 5 5"
        >
          <PixelStar sparkle={star.sparkle} tone={star.tone} />
        </svg>
      ))}
      <PixelCloud className="fx-cloud opacity-60" style={{ top: '14%', width: 128, height: 48, '--dur': '110s', '--delay': '-20s' } as CSSProperties} />
      <PixelCloud className="fx-cloud opacity-40" style={{ top: '46%', width: 96, height: 36, '--dur': '150s', '--delay': '-90s' } as CSSProperties} />
      <PixelCloud className="fx-cloud opacity-50" style={{ top: '78%', width: 160, height: 60, '--dur': '130s', '--delay': '-50s' } as CSSProperties} />
      <span className="fx-comet absolute left-0 top-0 block" ref={cometRef}>
        <PixelComet />
      </span>
    </div>
  );
}
