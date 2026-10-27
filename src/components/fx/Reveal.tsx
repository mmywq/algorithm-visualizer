import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { spring } from '@/lib/motion';

interface RevealProps {
  readonly children: ReactNode;
  readonly delay?: number;
  readonly className?: string;
  readonly y?: number;
  /** li — когда блок стоит прямо в списке: между ul/ol и li не должно быть лишних обёрток */
  readonly as?: 'div' | 'li';
}

/**
 * Появление блока при прокрутке: блок «проявляется» — небольшой подъём, прозрачность
 * и лёгкое размытие, уходящее в резкость. Без отскока: блок встаёт на место и не пружинит.
 * Срабатывает один раз, когда в окне видна заметная часть блока, а не его краешек.
 */
export function Reveal({ children, delay = 0, className = '', y = 16, as = 'div' }: RevealProps) {
  const Element = as === 'li' ? motion.li : motion.div;
  return (
    <Element
      className={className}
      initial={{ opacity: 0, y, filter: 'blur(6px)' }}
      transition={{ ...spring.smooth, delay }}
      viewport={{ once: true, amount: 0.2 }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
    >
      {children}
    </Element>
  );
}
