import { useEffect, useId, useState } from 'react';

interface KeyFieldProps {
  readonly value: number;
  readonly onApply: (value: number) => void;
  readonly label?: string;
  readonly min?: number;
  readonly max?: number;
  readonly submitLabel?: string;
}

/** Поле «Ключ» в панели демонстрации: применяется по Enter, кнопке или потере фокуса. */
export function KeyField({ value, onApply, label = 'Ключ', min = -999, max = 999, submitLabel = 'Искать' }: KeyFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  const [invalid, setInvalid] = useState(false);

  // значение может прийти снаружи — из ссылки или кнопки «случайный ключ»
  useEffect(() => {
    setDraft(String(value));
    setInvalid(false);
  }, [value]);

  const apply = (): void => {
    const text = draft.trim().replace('−', '-');
    const parsed = Number(text);
    const ok = text.length > 0 && Number.isInteger(parsed) && parsed >= min && parsed <= max;
    setInvalid(!ok);
    if (ok && parsed !== value) onApply(parsed);
  };

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        apply();
      }}
    >
      <label className="text-sm font-extrabold text-ink-2" htmlFor={id}>
        {label}
      </label>
      <input
        aria-describedby={invalid ? `${id}-error` : undefined}
        aria-invalid={invalid}
        className={`input input-sm w-20 font-mono ${invalid ? 'border-red' : ''}`}
        id={id}
        inputMode="numeric"
        onBlur={apply}
        onChange={(event) => setDraft(event.target.value)}
        value={draft}
      />
      <button className="btn btn-primary btn-sm" type="submit">
        {submitLabel}
      </button>
      {invalid && (
        <span className="sr-only" id={`${id}-error`} role="alert">
          Введите целое число от {min} до {max}
        </span>
      )}
    </form>
  );
}
