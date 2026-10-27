import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface RevealProps {
  readonly children: ReactNode;
  readonly delay?: number;
  readonly className?: string;
  readonly y?: number;
  /** li — когда блок стоит прямо в списке: между ul/ol и li не должно быть лишних обёрток */
  readonly as?: 'div' | 'li';
}

/** Появление блока при прокрутке: короткий подъём с лёгкой «пружиной». */
export function Reveal({ children, delay = 0, className = '', y = 18, as = 'div' }: RevealProps) {
  const Element = as === 'li' ? motion.li : motion.div;
  return (
    <Element
      className={className}
      initial={{ opacity: 0, y, scale: 0.98 }}
      transition={{ delay, type: 'spring', stiffness: 260, damping: 24 }}
      viewport={{ once: true, margin: '-60px' }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
    >
      {children}
    </Element>
  );
}
