import { X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

interface TextInputProps {
  readonly label: string;
  readonly value: string;
  readonly onApply: (value: string) => void;
  /** возвращает текст ошибки или null; в onApply попадает уже нормализованное значение */
  readonly validate: (raw: string) => { readonly value: string } | { readonly error: string };
  readonly hint: string;
  readonly placeholder?: string;
  readonly presets?: readonly { readonly name: string; readonly value: string }[];
  readonly mono?: boolean;
}

/** Поле для строковых входных данных: слова для бора, текст и образец для поиска подстроки. */
export function TextInput({ label, value, onApply, validate, hint, placeholder, presets = [], mono = true }: TextInputProps) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(value);
    setError(null);
  }, [value]);

  const apply = (raw: string = draft): void => {
    const result = validate(raw);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setError(null);
    setDraft(result.value);
    onApply(result.value);
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="label" htmlFor={id}>
          {label}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <input
              aria-describedby={`${id}-hint`}
              aria-invalid={error !== null}
              className={`input pr-10 ${mono ? 'font-mono' : ''} ${error !== null ? 'input-error' : ''}`}
              id={id}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') apply();
              }}
              placeholder={placeholder}
              spellCheck={false}
              value={draft}
            />
            {draft.length > 0 && (
              <button
                aria-label="Очистить поле"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink"
                onClick={() => setDraft('')}
                type="button"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            )}
          </div>
          <button className="btn btn-primary" onClick={() => apply()} type="button">
            Применить
          </button>
        </div>
        <p
          className={`mt-1.5 text-sm font-semibold ${error !== null ? 'text-red' : 'text-ink-3'}`}
          id={`${id}-hint`}
          role={error !== null ? 'alert' : undefined}
        >
          {error ?? hint}
        </p>
      </div>
      {presets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button className="btn btn-secondary btn-sm" key={preset.name} onClick={() => apply(preset.value)} type="button">
              {preset.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
