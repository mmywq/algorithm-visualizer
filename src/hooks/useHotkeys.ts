import { useEffect, useRef } from 'react';

type HotkeyMap = Record<string, (event: KeyboardEvent) => void>;

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
};

/**
 * Глобальные сочетания клавиш. Ключ — event.key ('ArrowLeft', ' ', 'f')
 * с необязательным префиксом 'mod+' для Ctrl/⌘. В полях ввода игнорируются
 * все сочетания, кроме mod+.
 */
export function useHotkeys(map: HotkeyMap, enabled = true): void {
  const mapRef = useRef(map);
  mapRef.current = map;

  useEffect(() => {
    if (!enabled) return undefined;
    const onKeyDown = (event: KeyboardEvent): void => {
      const withMod = event.ctrlKey || event.metaKey;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const combo = withMod ? `mod+${key}` : key;
      if (!withMod && (isTypingTarget(event.target) || event.altKey)) return;
      if (document.querySelector('[role="dialog"]') !== null && !withMod) return;
      const handler = mapRef.current[combo];
      if (handler !== undefined) {
        event.preventDefault();
        handler(event);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
