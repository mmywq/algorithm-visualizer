import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { spring } from '@/lib/motion';

interface CatSaysProps {
  readonly text: string;
  /** куда смотрит «хвостик» облачка */
  readonly tail?: 'left' | 'bottom' | 'right';
  readonly className?: string;
  readonly speed?: number;
}

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  (document.documentElement.dataset.motion === 'reduce' ||
    (document.documentElement.dataset.motion !== 'full' && window.matchMedia('(prefers-reduced-motion: reduce)').matches));

/**
 * Реплика кота: текст печатается по буквам, в конце мигает курсор.
 * Место под всю фразу занято сразу (невидимой копией), поэтому облачко не дёргается,
 * пока буквы появляются; при смене фразы оно плавно меняет размер.
 */
export function CatSays({ text, tail = 'left', className = '', speed = 28 }: CatSaysProps) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setShown(text.length);
      return undefined;
    }
    setShown(0);
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setShown(index);
      if (index >= text.length) window.clearInterval(timer);
    }, speed);
    return () => window.clearInterval(timer);
  }, [text, speed]);

  const tailClass =
    tail === 'left'
      ? 'left-[-10px] top-5 border-y-[8px] border-r-[10px] border-y-transparent border-r-line-strong'
      : tail === 'right'
        ? 'right-[-10px] top-5 border-y-[8px] border-l-[10px] border-y-transparent border-l-line-strong'
        : 'bottom-[-10px] left-8 border-x-[8px] border-t-[10px] border-x-transparent border-t-line-strong';

  return (
    <motion.div
      aria-live="polite"
      className={`relative rounded-xl border-2 border-line-strong bg-surface px-3.5 py-2.5 shadow-pop ${className}`}
      layout
      style={{ borderRadius: 12 }}
      transition={spring.smooth}
    >
      <span aria-hidden="true" className={`absolute h-0 w-0 ${tailClass}`} />
      <motion.p className="relative text-[15px] font-bold leading-6 text-ink" layout="position" transition={spring.smooth}>
        <span className="sr-only">{text}</span>
        {/* невидимая полная фраза задаёт размер облачка */}
        <span aria-hidden="true" className="invisible">
          {text}
          <span className="ml-0.5 inline-block h-4 w-2" />
        </span>
        <span aria-hidden="true" className="absolute inset-0">
          {text.slice(0, shown)}
          <span className={`ml-0.5 inline-block h-4 w-2 translate-y-0.5 bg-brand ${shown >= text.length ? 'animate-blink' : ''}`} />
        </span>
      </motion.p>
    </motion.div>
  );
}
