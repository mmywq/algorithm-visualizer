import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined') return () => undefined;
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    () => (typeof window === 'undefined' ? false : window.matchMedia(query).matches),
    () => false,
  );
}

export const useIsDesktop = (): boolean => useMediaQuery('(min-width: 1024px)');
