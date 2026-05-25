import { loadFromStorage, saveToStorage } from './localStorage';
import { STORAGE_KEYS } from './keys';

export interface AppSettings {
  readonly mode: 'arrays' | 'graphs';
  readonly playbackSpeedMs: number;
  readonly lastArrayValues: readonly number[];
  readonly lastGraphStartNodeId: string;
  readonly lastRoute?: string;
}

const defaultSettings: AppSettings = {
  mode: 'arrays',
  playbackSpeedMs: 650,
  lastArrayValues: [42, 18, 64, 9, 73, 31, 55, 27],
  lastGraphStartNodeId: 'A',
  lastRoute: '/',
};

export const loadSettings = (): AppSettings => loadFromStorage<AppSettings>(STORAGE_KEYS.settings, defaultSettings);

export const saveSettings = (settings: AppSettings): void => {
  saveToStorage(STORAGE_KEYS.settings, settings);
};

export const getDefaultSettings = (): AppSettings => defaultSettings;
