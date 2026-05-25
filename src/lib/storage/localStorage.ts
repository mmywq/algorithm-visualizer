const isStorageAvailable = (): boolean => typeof window !== 'undefined' && window.localStorage !== undefined;

export const loadFromStorage = <T>(key: string, fallback: T): T => {
  if (!isStorageAvailable()) {
    return fallback;
  }

  const serialized = window.localStorage.getItem(key);

  if (serialized === null) {
    return fallback;
  }

  try {
    return JSON.parse(serialized) as T;
  } catch {
    return fallback;
  }
};

export const saveToStorage = <T>(key: string, value: T): void => {
  if (!isStorageAvailable()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
};
