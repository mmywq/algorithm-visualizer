import { useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

interface Codec<T> {
  readonly parse: (raw: string) => T | null;
  readonly serialize: (value: T) => string;
}

/**
 * Состояние, которое живёт в адресной строке: так любой набор данных
 * становится ссылкой, которой можно поделиться. Значение по умолчанию
 * в адрес не пишется, чтобы ссылки оставались короткими.
 */
export function useUrlState<T>(key: string, fallback: T, codec: Codec<T>): readonly [T, (value: T) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get(key);
  const fallbackRef = useRef(fallback);
  const codecRef = useRef(codec);
  codecRef.current = codec;

  const value = useMemo(() => {
    if (raw === null) return fallbackRef.current;
    return codecRef.current.parse(raw) ?? fallbackRef.current;
  }, [raw]);

  const setValue = useCallback(
    (next: T) => {
      setParams(
        (previous) => {
          const updated = new URLSearchParams(previous);
          const serialized = codecRef.current.serialize(next);
          if (serialized === codecRef.current.serialize(fallbackRef.current)) updated.delete(key);
          else updated.set(key, serialized);
          updated.delete('s');
          return updated;
        },
        { replace: true },
      );
    },
    [key, setParams],
  );

  return [value, setValue] as const;
}

export const numbersCodec = (options: { min?: number; max?: number; maxCount?: number } = {}): Codec<readonly number[]> => ({
  parse: (raw) => {
    const values = raw
      .split(/[,_ ]/)
      .filter((token) => token.length > 0)
      .map(Number);
    if (values.length === 0 || values.some((value) => !Number.isInteger(value))) return null;
    if (options.min !== undefined && values.some((value) => value < options.min!)) return null;
    if (options.max !== undefined && values.some((value) => value > options.max!)) return null;
    return values.slice(0, options.maxCount ?? 32);
  },
  serialize: (values) => values.join(','),
});

export const stringCodec = (maxLength = 64): Codec<string> => ({
  parse: (raw) => (raw.length > 0 ? raw.slice(0, maxLength) : null),
  serialize: (value) => value,
});

export const enumCodec = <T extends string>(allowed: readonly T[]): Codec<T> => ({
  parse: (raw) => (allowed.includes(raw as T) ? (raw as T) : null),
  serialize: (value) => value,
});

export const intCodec = (min: number, max: number): Codec<number> => ({
  parse: (raw) => {
    const value = Number(raw);
    return Number.isInteger(value) && value >= min && value <= max ? value : null;
  },
  serialize: (value) => String(value),
});
