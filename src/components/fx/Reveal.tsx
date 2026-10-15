import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface RevealProps {
  readonly children: ReactNode;
  readonly delay?: number;
  readonly className?: string;
  readonly y?: number;
}

/** Появление блока при прокрутке: короткий подъём с лёгкой «пружиной». */
export function Reveal({ children, delay = 0, className = '', y = 18 }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, scale: 0.98 }}
      transition={{ delay, type: 'spring', stiffness: 260, damping: 24 }}
      viewport={{ once: true, margin: '-60px' }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
    >
      {children}
    </motion.div>
  );
}
