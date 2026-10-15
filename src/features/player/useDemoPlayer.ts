import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useOptionalAlgorithm } from '@/features/algorithm/AlgorithmContext';
import { celebrate } from '@/lib/celebrate';
import { useDemoStateStore } from '@/stores/demoStateStore';
import { useUserStore } from '@/stores/userStore';
import { usePlayer, type FrameSet, type Player } from './usePlayer';

/**
 * Плеер страницы алгоритма: начальный шаг берётся из ссылки (?s=12),
 * завершение демонстрации засчитывается в прогресс, первое — с конфетти.
 */
export function useDemoPlayer<F>(set: FrameSet<F>): Player<F> {
  const algorithm = useOptionalAlgorithm();
  const [params] = useSearchParams();
  const markDemo = useUserStore((state) => state.markDemo);
  const initialIndex = useMemo(() => {
    const raw = Number(params.get('s'));
    return Number.isFinite(raw) && raw > 0 ? raw - 1 : 0;
    // шаг из ссылки применяется только при первой загрузке
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onComplete = useCallback(() => {
    if (algorithm === null || algorithm.embed) return;
    const first = useUserStore.getState().data.progress[algorithm.entry.id]?.demoAt === undefined;
    markDemo(algorithm.entry.id);
    if (first) celebrate('small');
  }, [algorithm, markDemo]);

  const player = usePlayer(set, { onComplete, initialIndex });

  useEffect(() => {
    useDemoStateStore.setState({ index: player.index, total: player.total });
  }, [player.index, player.total]);

  return player;
}
