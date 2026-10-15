import { Check, Copy, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PixelCat } from '@/components/mascot/PixelCat';
import { toast } from '@/components/ui/Toaster';
import { copyText } from '@/lib/clipboard';
import type { Preset, PresetKind } from '@/lib/userData';
import { useUserStore } from '@/stores/userStore';
import type { GraphSnapshot } from '@/types';

const kindLabels: Record<PresetKind, string> = { numbers: 'ЧИСЛА', graph: 'ГРАФ', text: 'ТЕКСТ', grid: 'КАРТА' };

const describe = (preset: Preset): string => {
  if (preset.kind === 'numbers' && Array.isArray(preset.value)) return `[${(preset.value as number[]).join(', ')}]`;
  if (preset.kind === 'graph' && typeof preset.value === 'object' && preset.value !== null) {
    const graph = preset.value as GraphSnapshot;
    return `${graph.nodes?.length ?? 0} вершин, ${graph.edges?.length ?? 0} рёбер`;
  }
  if (typeof preset.value === 'string') return preset.value;
  return JSON.stringify(preset.value).slice(0, 80);
};

/** Сохранённые наборы данных: переименование, копирование и удаление. */
export function PresetsPanel() {
  const presets = useUserStore((state) => state.data.presets);
  const renamePreset = useUserStore((state) => state.renamePreset);
  const removePreset = useUserStore((state) => state.removePreset);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  if (presets.length === 0) {
    return (
      <div className="flex items-center gap-4">
        <PixelCat pose="think" size={78} />
        <p className="text-[15px] font-semibold leading-6 text-ink-2">
          Здесь появятся наборы, которые вы сохраните на страницах алгоритмов кнопкой «Сохранить набор». Они доступны на всех страницах с таким же типом данных.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {presets.map((preset) => (
        <li className="flex items-start gap-3 rounded-2xl border-2 border-line bg-surface-2 p-4" key={preset.id}>
          <span className="tag shrink-0 border-purple text-purple">{kindLabels[preset.kind]}</span>
          <div className="min-w-0 flex-1">
            {editing?.id === preset.id ? (
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  renamePreset(preset.id, editing.name);
                  setEditing(null);
                }}
              >
                <input
                  aria-label="Новое имя набора"
                  autoFocus
                  className="input input-sm"
                  maxLength={60}
                  onChange={(event) => setEditing({ id: preset.id, name: event.target.value })}
                  value={editing.name}
                />
                <button aria-label="Сохранить" className="btn btn-primary btn-sm btn-icon" type="submit">
                  <Check size={16} strokeWidth={3} />
                </button>
              </form>
            ) : (
              <p className="truncate font-black text-ink">{preset.name}</p>
            )}
            <p className="mt-1 truncate font-mono text-[13px] font-semibold text-ink-2">{describe(preset)}</p>
            <p className="mt-1 text-[12px] font-bold text-ink-3">
              {new Date(preset.updatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              aria-label={`Скопировать «${preset.name}»`}
              className="btn btn-ghost btn-sm btn-icon"
              onClick={() => {
                void copyText(describe(preset)).then((ok) => (ok ? toast.success('Скопировано') : toast.error('Не удалось скопировать')));
              }}
              type="button"
            >
              <Copy size={16} strokeWidth={2.5} />
            </button>
            <button
              aria-label={`Переименовать «${preset.name}»`}
              className="btn btn-ghost btn-sm btn-icon"
              onClick={() => setEditing({ id: preset.id, name: preset.name })}
              type="button"
            >
              <Pencil size={16} strokeWidth={2.5} />
            </button>
            <button
              aria-label={`Удалить «${preset.name}»`}
              className="btn btn-ghost btn-sm btn-icon hover:text-red"
              onClick={() => removePreset(preset.id)}
              type="button"
            >
              <Trash2 size={16} strokeWidth={2.5} />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
