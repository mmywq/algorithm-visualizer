import { ArrowDownWideNarrow, ArrowUpNarrowWide, Bookmark, Copy, Dices, Pencil, Trash2, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { toast } from '@/components/ui/Toaster';
import { useOptionalAlgorithm } from '@/features/algorithm/AlgorithmContext';
import { useUserStore } from '@/stores/userStore';

interface NumbersInputProps {
  readonly value: readonly number[];
  readonly onApply: (values: readonly number[]) => void;
  readonly minSize?: number;
  readonly maxSize?: number;
  readonly minValue?: number;
  readonly maxValue?: number;
  readonly unique?: boolean;
  readonly hint?: string | undefined;
  /** быстрые сценарии: по возрастанию, по убыванию, с повторами */
  readonly scenarios?: boolean;
  readonly sortedOnly?: boolean;
  readonly children?: ReactNode | undefined;
}

const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

export function NumbersInput({
  value,
  onApply,
  minSize = 2,
  maxSize = 16,
  minValue = -99,
  maxValue = 99,
  unique = false,
  hint,
  scenarios = false,
  sortedOnly = false,
  children,
}: NumbersInputProps) {
  const algorithm = useOptionalAlgorithm();
  const markCustomInput = useUserStore((state) => state.markCustomInput);
  const presets = useUserStore((state) => state.data.presets);
  const savePreset = useUserStore((state) => state.savePreset);
  const removePreset = useUserStore((state) => state.removePreset);
  const renamePreset = useUserStore((state) => state.renamePreset);
  const [draft, setDraft] = useState(value.join(', '));
  const [error, setError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const numberPresets = presets.filter((preset) => preset.kind === 'numbers' && Array.isArray(preset.value)).slice(0, 8);

  useEffect(() => setDraft(value.join(', ')), [value]);

  const apply = (next: readonly number[]): void => {
    const prepared = sortedOnly ? [...next].sort((a, b) => a - b) : next;
    setError(null);
    onApply(prepared);
    if (algorithm !== null) markCustomInput(algorithm.entry.id);
  };

  const parse = (): void => {
    const tokens = draft
      .split(/[\s,;]+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 0);
    if (tokens.length === 0) return setError('Введите числа через запятую или пробел.');
    const parsed: number[] = [];
    for (const token of tokens) {
      if (!/^-?\d+$/.test(token)) return setError(`«${token}» — не целое число.`);
      const number = Number(token);
      if (number < minValue || number > maxValue) return setError(`Число ${number} вне диапазона от ${minValue} до ${maxValue}.`);
      parsed.push(number);
    }
    if (parsed.length < minSize) return setError(`Нужно хотя бы ${minSize} ${minSize < 5 ? 'числа' : 'чисел'}.`);
    if (parsed.length > maxSize) return setError(`Слишком много чисел: максимум ${maxSize}, чтобы анимация оставалась читаемой.`);
    if (unique && new Set(parsed).size !== parsed.length) return setError('Значения должны быть разными: в этой структуре ключи не повторяются.');
    if (!unique && parsed.length > 1 && new Set(parsed).size === 1)
      return setError('Все числа одинаковые — на таком наборе нечего показывать. Измените хотя бы одно.');
    apply(parsed);
  };

  const size = Math.min(maxSize, Math.max(minSize, value.length));

  const generate = (kind: 'random' | 'asc' | 'desc' | 'dupes'): void => {
    let next: number[];
    if (unique || kind !== 'dupes') {
      const pool = new Set<number>();
      const span = maxValue - minValue + 1;
      while (pool.size < Math.min(size, span)) pool.add(randomInt(minValue, maxValue));
      next = [...pool];
    } else {
      const base = Array.from({ length: Math.max(2, Math.ceil(size / 2)) }, () => randomInt(minValue, maxValue));
      next = Array.from({ length: size }, (_, index) => base[index % base.length]!).sort(() => Math.random() - 0.5);
    }
    if (kind === 'asc') next.sort((a, b) => a - b);
    if (kind === 'desc') next.sort((a, b) => b - a);
    apply(next);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="label" htmlFor="numbers-input">
          Числа через запятую
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <input
              aria-describedby="numbers-hint"
              aria-invalid={error !== null}
              className={`input pr-10 font-mono ${error !== null ? 'input-error' : ''}`}
              id="numbers-input"
              inputMode="text"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') parse();
              }}
              placeholder="Например: 42, -7, 0, 15"
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
          <button className="btn btn-primary" onClick={parse} type="button">
            Применить
          </button>
        </div>
        <p
          className={`mt-1.5 text-sm font-semibold ${error !== null ? 'text-red' : 'text-ink-3'}`}
          id="numbers-hint"
          role={error !== null ? 'alert' : undefined}
        >
          {error ??
            `От ${minSize} до ${maxSize} целых чисел в диапазоне ${minValue}…${maxValue}.${sortedOnly ? ' Массив будет упорядочен автоматически.' : ''}${hint === undefined ? '' : ` ${hint}`}`}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn btn-secondary btn-sm" onClick={() => generate('random')} type="button">
          <Dices size={16} strokeWidth={2.5} />
          Случайно
        </button>
        {scenarios && !sortedOnly && (
          <>
            <button className="btn btn-secondary btn-sm" onClick={() => generate('asc')} title="Лучший случай для многих сортировок" type="button">
              <ArrowUpNarrowWide size={16} strokeWidth={2.5} />
              Уже по возрастанию
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => generate('desc')} title="Худший случай для простых сортировок" type="button">
              <ArrowDownWideNarrow size={16} strokeWidth={2.5} />
              По убыванию
            </button>
            {!unique && (
              <button className="btn btn-secondary btn-sm" onClick={() => generate('dupes')} title="Проверка стабильности и равных ключей" type="button">
                <Copy size={16} strokeWidth={2.5} />С повторами
              </button>
            )}
          </>
        )}
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            savePreset('numbers', '', [...value]);
            toast.success('Набор сохранён', 'Он появится в списке ниже и в личном кабинете.');
          }}
          type="button"
        >
          <Bookmark size={16} strokeWidth={2.5} />
          Сохранить набор
        </button>
      </div>

      {numberPresets.length > 0 && (
        <div>
          <p className="label">Мои наборы</p>
          <ul className="flex flex-wrap gap-2">
            {numberPresets.map((preset) => (
              <li className="group inline-flex items-center rounded-xl border-2 border-line bg-surface" key={preset.id}>
                {renaming?.id === preset.id ? (
                  <input
                    aria-label="Новое имя набора"
                    autoFocus
                    className="h-9 w-40 rounded-xl bg-transparent px-3 text-sm font-bold outline-none"
                    onBlur={() => {
                      renamePreset(preset.id, renaming.name);
                      setRenaming(null);
                    }}
                    onChange={(event) => setRenaming({ id: preset.id, name: event.target.value })}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
                      if (event.key === 'Escape') setRenaming(null);
                    }}
                    value={renaming.name}
                  />
                ) : (
                  <button
                    className="h-9 max-w-[200px] truncate px-3 text-sm font-bold text-ink hover:text-brand"
                    onClick={() => apply((preset.value as number[]).slice(0, maxSize))}
                    title={`[${(preset.value as number[]).join(', ')}]`}
                    type="button"
                  >
                    {preset.name}
                  </button>
                )}
                <button
                  aria-label={`Переименовать «${preset.name}»`}
                  className="h-9 px-1.5 text-ink-3 hover:text-ink"
                  onClick={() => setRenaming({ id: preset.id, name: preset.name })}
                  type="button"
                >
                  <Pencil size={14} strokeWidth={2.5} />
                </button>
                <button
                  aria-label={`Удалить «${preset.name}»`}
                  className="h-9 pl-1 pr-2.5 text-ink-3 hover:text-red"
                  onClick={() => removePreset(preset.id)}
                  type="button"
                >
                  <Trash2 size={14} strokeWidth={2.5} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {children}
    </div>
  );
}
