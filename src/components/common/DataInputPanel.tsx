import { useEffect, useState, type ReactNode } from 'react';
import {
  loadArrayPresets,
  loadStructurePresets,
  removeArrayPreset,
  removeStructurePreset,
  renameArrayPreset,
  renameStructurePreset,
  saveArrayPreset,
  saveStructurePreset,
} from '@/lib/storage';
import type { ArrayPreset } from '@/types';

type PresetStorageKind = 'array' | 'structure';

interface DataInputPanelProps {
  readonly values: readonly number[];
  readonly onApply: (values: readonly number[]) => void;
  readonly storageKind: PresetStorageKind;
  readonly minSize?: number;
  readonly maxSize?: number;
  readonly minValue?: number;
  readonly maxValue?: number;
  readonly uniqueRandom?: boolean;
  readonly hint?: string;
  readonly children?: ReactNode;
}

const presetStorage: Record<PresetStorageKind, {
  readonly load: () => readonly ArrayPreset[];
  readonly save: (name: string, values: readonly number[]) => unknown;
  readonly remove: (id: string) => void;
  readonly rename: (id: string, name: string) => void;
}> = {
  array: { load: loadArrayPresets, save: saveArrayPreset, remove: removeArrayPreset, rename: renameArrayPreset },
  structure: { load: loadStructurePresets, save: saveStructurePreset, remove: removeStructurePreset, rename: renameStructurePreset },
};

export function DataInputPanel({
  values,
  onApply,
  storageKind,
  minSize = 2,
  maxSize = 16,
  minValue = -100,
  maxValue = 100,
  uniqueRandom = false,
  hint,
  children,
}: DataInputPanelProps) {
  const storage = presetStorage[storageKind];
  const [manualInput, setManualInput] = useState(values.join(', '));
  const [inputError, setInputError] = useState<string | null>(null);
  const [presets, setPresets] = useState(storage.load());
  const [presetName, setPresetName] = useState('');
  const [renameState, setRenameState] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    setManualInput(values.join(', '));
  }, [values]);

  const applyParsedValues = (next: readonly number[]): void => {
    setInputError(null);
    onApply(next);
  };

  const applyManualInput = (): void => {
    const segments = manualInput.split(',').map((segment) => segment.trim()).filter((segment) => segment.length > 0);
    if (segments.length === 0) {
      setInputError('Введите значения через запятую.');
      return;
    }

    const parsed: number[] = [];
    for (const segment of segments) {
      if (/^-?\d+$/.test(segment) === false) {
        setInputError(`Недопустимое значение «${segment}». Используйте только целые числа.`);
        return;
      }
      const value = Number(segment);
      if (value < minValue || value > maxValue) {
        setInputError(`Число ${value} вне диапазона ${minValue}…${maxValue}.`);
        return;
      }
      parsed.push(value);
    }

    if (parsed.length < minSize) {
      setInputError(`Введите минимум ${minSize} ${minSize === 2 ? 'числа' : 'чисел'}.`);
      return;
    }
    if (parsed.length > maxSize) {
      setInputError(`Слишком много значений: максимум ${maxSize}.`);
      return;
    }
    if (new Set(parsed).size === 1) {
      setInputError('Все значения одинаковые — на таком наборе не видно сравнений. Добавьте хотя бы одно отличающееся число.');
      return;
    }

    applyParsedValues(parsed);
  };

  const generateRandomValues = (): void => {
    const size = Math.min(maxSize, Math.max(minSize, values.length));
    let next: number[];
    if (uniqueRandom) {
      const pool = new Set<number>();
      while (pool.size < size) {
        pool.add(randomInRange(minValue, maxValue));
      }
      next = [...pool];
    } else {
      next = Array.from({ length: size }, () => randomInRange(minValue, maxValue));
      const firstValue = next[0];
      if (firstValue !== undefined && next.length > 1 && new Set(next).size === 1) {
        next[0] = firstValue === maxValue ? firstValue - 1 : firstValue + 1;
      }
    }
    applyParsedValues(next);
  };

  const savePreset = (): void => {
    const name = presetName.trim() || `Набор от ${new Date().toLocaleTimeString()}`;
    storage.save(name, values);
    setPresetName('');
    setPresets(storage.load());
  };

  const confirmRename = (): void => {
    if (renameState === null) return;
    storage.rename(renameState.id, renameState.name);
    setRenameState(null);
    setPresets(storage.load());
  };

  return (
    <section className="app-panel">
      <h2 className="text-xl font-semibold text-app-primary">Входные данные</h2>
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <label className="block flex-1 text-sm text-app-muted">
          Введите целые числа через запятую
          <input
            className="control-input mt-2 w-full"
            onChange={(event) => setManualInput(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') applyManualInput(); }}
            placeholder="Например: 42, -7, 0, 15"
            value={manualInput}
          />
          <span className="mt-2 block text-xs text-app-muted/80">
            От {minSize} до {maxSize} чисел в диапазоне {minValue}…{maxValue}.{hint === undefined ? '' : ` ${hint}`}
          </span>
        </label>
        <div className="flex flex-wrap gap-2">
          <button className="control-button control-button-primary" onClick={applyManualInput} type="button">Применить</button>
          <button className="control-button" onClick={generateRandomValues} type="button">Случайные значения</button>
        </div>
      </div>

      <p className="mt-3 text-sm text-app-muted">Текущий набор: <strong className="text-app-primary">[{values.join(', ')}]</strong></p>
      {inputError !== null && <p className="mt-2 text-sm text-rose-300">{inputError}</p>}

      <div className="mt-4 rounded-2xl border border-app bg-surface p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-app-primary">Пресеты</p>
          <input
            className="control-input"
            onChange={(event) => setPresetName(event.target.value)}
            placeholder="Имя пресета"
            value={presetName}
          />
          <button className="control-button" onClick={savePreset} type="button">Сохранить текущий набор</button>
        </div>
        {presets.length === 0 ? (
          <p className="mt-3 text-xs text-app-muted">Сохранённых наборов пока нет. Сохраните текущий набор, чтобы быстро возвращаться к нему позже.</p>
        ) : (
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {presets.slice(0, 9).map((preset) => (
              <div className="flex items-center gap-2" key={preset.id}>
                <button
                  className="control-button min-w-0 flex-1"
                  onClick={() => applyParsedValues(preset.values)}
                  title={`[${preset.values.join(', ')}]`}
                  type="button"
                >
                  <span className="truncate">{preset.name}</span>
                </button>
                <button className="control-button" onClick={() => setRenameState({ id: preset.id, name: preset.name })} type="button">Переим.</button>
                <button className="control-button" onClick={() => { storage.remove(preset.id); setPresets(storage.load()); }} type="button">Удалить</button>
              </div>
            ))}
          </div>
        )}

        {renameState !== null && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-app bg-surface p-3">
            <p className="text-sm text-app-muted">Новое имя</p>
            <input
              className="control-input"
              onChange={(event) => setRenameState({ ...renameState, name: event.target.value })}
              value={renameState.name}
            />
            <button className="control-button" onClick={confirmRename} type="button">Сохранить</button>
            <button className="control-button" onClick={() => setRenameState(null)} type="button">Отмена</button>
          </div>
        )}
      </div>

      {children}
    </section>
  );
}

const randomInRange = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
