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

  saveToStorage(STORAGE_KEYS.arrayPresets, [preset, ...presets]);
  return preset;
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

  saveToStorage(STORAGE_KEYS.graphPresets, [preset, ...presets]);
  return preset;
};
