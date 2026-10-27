import { animate, motion, useMotionValue, useReducedMotionConfig, useTransform } from 'framer-motion';
import { useEffect } from 'react';
import { ease } from '@/lib/motion';

/**
 * Число, которое при изменении «досчитывается» до нового значения — например, опыт после
 * сданного теста. При первом показе стоит сразу на месте; с уменьшенным движением меняется мгновенно.
 */
export function AnimatedNumber({ value, className }: { readonly value: number; readonly className?: string }) {
  const current = useMotionValue(value);
  const text = useTransform(current, (latest) => Math.round(latest).toString());
  const reduceMotion = useReducedMotionConfig();

  useEffect(() => {
    if (reduceMotion === true) {
      current.set(value);
      return undefined;
    }
    const controls = animate(current, value, { duration: 0.9, ease: ease.out });
    return () => controls.stop();
  }, [value, current, reduceMotion]);

  return <motion.span className={className}>{text}</motion.span>;
}
