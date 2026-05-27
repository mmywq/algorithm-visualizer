import type { ArrayPreset, GraphPreset, GraphSnapshot } from '@/types';
import { loadFromStorage, saveToStorage } from './localStorage';
import { STORAGE_KEYS } from './keys';

const nowIso = (): string => new Date().toISOString();

export const loadArrayPresets = (): readonly ArrayPreset[] =>
  loadFromStorage<readonly ArrayPreset[]>(STORAGE_KEYS.arrayPresets, []);

export const saveArrayPreset = (name: string, values: readonly number[]): ArrayPreset => {
  const presets = loadArrayPresets();
  const timestamp = nowIso();

  const preset: ArrayPreset = {
    id: `array-${Date.now()}`,
    name,
    values,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  saveToStorage(STORAGE_KEYS.arrayPresets, [preset, ...presets].slice(0, 20));
  return preset;
};

export const removeArrayPreset = (id: string): void => {
  const presets = loadArrayPresets().filter((preset) => preset.id !== id);
  saveToStorage(STORAGE_KEYS.arrayPresets, presets);
};

export const renameArrayPreset = (id: string, name: string): void => {
  const normalizedName = name.trim();
  if (normalizedName.length === 0) {
    return;
  }

  const presets = loadArrayPresets().map((preset) =>
    preset.id === id
      ? {
          ...preset,
          name: normalizedName,
          updatedAt: nowIso(),
        }
      : preset,
  );

  saveToStorage(STORAGE_KEYS.arrayPresets, presets);
};

export const loadGraphPresets = (): readonly GraphPreset[] =>
  loadFromStorage<readonly GraphPreset[]>(STORAGE_KEYS.graphPresets, []);

export const saveGraphPreset = (name: string, graph: GraphSnapshot): GraphPreset => {
  const presets = loadGraphPresets();
  const timestamp = nowIso();

  const preset: GraphPreset = {
    id: `graph-${Date.now()}`,
    name,
    graph,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  saveToStorage(STORAGE_KEYS.graphPresets, [preset, ...presets].slice(0, 20));
  return preset;
};

export const removeGraphPreset = (id: string): void => {
  const presets = loadGraphPresets().filter((preset) => preset.id !== id);
  saveToStorage(STORAGE_KEYS.graphPresets, presets);
};

export const renameGraphPreset = (id: string, name: string): void => {
  const normalizedName = name.trim();
  if (normalizedName.length === 0) {
    return;
  }

  const presets = loadGraphPresets().map((preset) =>
    preset.id === id
      ? {
          ...preset,
          name: normalizedName,
          updatedAt: nowIso(),
        }
      : preset,
  );

  saveToStorage(STORAGE_KEYS.graphPresets, presets);
};
