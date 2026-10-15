import { useLayoutEffect, useState } from 'react';

/** Ширина элемента вместе с внутренними отступами (clientWidth), обновляется через ResizeObserver. */
export function useElementWidth<T extends HTMLElement>(): readonly [(node: T | null) => void, number] {
  const [node, setNode] = useState<T | null>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    if (node === null) return undefined;
    setWidth(node.clientWidth);
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry !== undefined) setWidth((entry.target as HTMLElement).clientWidth);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  return [setNode, width] as const;
}
