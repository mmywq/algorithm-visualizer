import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { spring } from '@/lib/motion';

interface ProgressRingProps {
  readonly value: number; // 0..1
  readonly size?: number;
  readonly stroke?: number;
  readonly color?: string;
  readonly track?: string;
  readonly children?: ReactNode;
  readonly label?: string;
}

export function ProgressRing({ value, size = 56, stroke = 7, color = 'rgb(var(--cat))', track = 'rgb(var(--c-line))', children, label }: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(clamped * 100)}
      className="relative inline-flex shrink-0 items-center justify-center"
      role="progressbar"
      style={{ height: size, width: size }}
    >
      <svg className="-rotate-90" height={size} width={size}>
        <circle cx={size / 2} cy={size / 2} fill="none" r={radius} stroke={track} strokeWidth={stroke} />
        <motion.circle
          animate={{ strokeDashoffset: circumference * (1 - clamped) }}
          cx={size / 2}
          cy={size / 2}
          fill="none"
          initial={{ strokeDashoffset: circumference }}
          r={radius}
          stroke={color}
          strokeDasharray={circumference}
          strokeLinecap="round"
          strokeWidth={stroke}
          transition={spring.gentle}
        />
      </svg>
      {children !== undefined && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}

interface ProgressBarProps {
  readonly value: number; // 0..1
  readonly color?: string;
  readonly className?: string;
  readonly height?: number;
  readonly label?: string;
}

export function ProgressBar({ value, color = 'rgb(var(--cat))', className = '', height = 12, label }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(clamped * 100)}
      className={`relative w-full overflow-hidden rounded-full bg-line ${className}`}
      role="progressbar"
      style={{ height }}
    >
      <motion.div
        animate={{ clipPath: `inset(0 ${100 - clamped * 100}% 0 0 round 999px)` }}
        className="relative h-full w-full rounded-full"
        initial={{ clipPath: 'inset(0 100% 0 0 round 999px)' }}
        style={{ background: color }}
        transition={spring.gentle}
      >
        {/* блик сверху — фирменная деталь «объёмных» индикаторов */}
        <span className="absolute inset-x-2 top-[3px] h-[3px] rounded-full bg-white/35" style={{ display: height >= 10 ? 'block' : 'none' }} />
      </motion.div>
    </div>
  );
}
