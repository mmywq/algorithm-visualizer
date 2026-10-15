import { motion } from 'framer-motion';

interface SwitchProps {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly label: string;
  readonly description?: string;
  readonly disabled?: boolean;
}

export function Switch({ checked, onChange, label, description, disabled = false }: SwitchProps) {
  return (
    <label className={`flex cursor-pointer items-start justify-between gap-4 ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}>
      <span className="min-w-0">
        <span className="block font-extrabold text-ink">{label}</span>
        {description !== undefined && <span className="mt-0.5 block text-sm leading-5 text-ink-2">{description}</span>}
      </span>
      <button
        aria-checked={checked}
        aria-label={label}
        className={`relative mt-0.5 inline-flex h-8 w-[52px] shrink-0 items-center rounded-full border-2 p-0.5 transition-colors ${
          checked ? 'border-green-press bg-green' : 'border-line-strong bg-line'
        }`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        role="switch"
        type="button"
      >
        <motion.span
          animate={{ x: checked ? 20 : 0 }}
          className="block h-6 w-6 rounded-full bg-white shadow-[0_2px_0_rgb(0_0_0/0.15)]"
          transition={{ type: 'spring', stiffness: 600, damping: 34 }}
        />
      </button>
    </label>
  );
}
