import { MAX_PRESETS, type Preset, type UserData } from './userData';

/** Перенос наборов данных из первой версии сайта (ключи algorithm-visualizer:*). */

interface LegacyNumbersPreset {
  readonly id: string;
  readonly name: string;
  readonly values: readonly number[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface LegacyGraphPreset {
  readonly id: string;
  readonly name: string;
  readonly graph: unknown;
  readonly createdAt: string;
  readonly updatedAt: string;
}

function readLegacy<T>(key: string): readonly T[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function migrateLegacyPresets(data: UserData): UserData {
  if (data.flags['legacy-migrated'] === true || typeof window === 'undefined') return data;
  const numbers = [
    ...readLegacy<LegacyNumbersPreset>('algorithm-visualizer:array-presets'),
    ...readLegacy<LegacyNumbersPreset>('algorithm-visualizer:structure-presets'),
  ].filter((preset) => Array.isArray(preset.values));
  const graphs = readLegacy<LegacyGraphPreset>('algorithm-visualizer:graph-presets').filter((preset) => typeof preset.graph === 'object');

  const migrated: Preset[] = [
    ...numbers.map((preset) => ({
      id: `numbers-legacy-${preset.id}`,
      kind: 'numbers' as const,
      name: preset.name,
      value: preset.values,
      createdAt: preset.createdAt,
      updatedAt: preset.updatedAt,
    })),
    ...graphs.map((preset) => ({
      id: `graph-legacy-${preset.id}`,
      kind: 'graph' as const,
      name: preset.name,
      value: preset.graph,
      createdAt: preset.createdAt,
      updatedAt: preset.updatedAt,
    })),
  ];

  const existingIds = new Set(data.presets.map((preset) => preset.id));
  return {
    ...data,
    presets: [...data.presets, ...migrated.filter((preset) => !existingIds.has(preset.id))].slice(0, MAX_PRESETS),
    flags: { ...data.flags, 'legacy-migrated': true },
  };
}
