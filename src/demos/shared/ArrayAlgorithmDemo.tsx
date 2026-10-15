import type { ReactNode } from 'react';
import { ArrayBars, arrayLegend } from '@/components/visualizers/arrays/ArrayBars';
import { AuxiliaryStrip, OperationCounters } from '@/components/visualizers/arrays/ArrayExtras';
import { DemoLayout } from '@/features/demo/DemoLayout';
import type { LegendItem } from '@/features/demo/Legend';
import { NumbersInput } from '@/features/demo/NumbersInput';
import { useDemoPlayer } from '@/features/player/useDemoPlayer';
import { useFrames } from '@/features/player/usePlayer';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { numbersCodec, useUrlState } from '@/hooks/useUrlState';
import type { ArrayAlgorithmFrame, PseudocodeLine } from '@/types';

export interface NumbersInputOptions {
  readonly minSize?: number;
  readonly maxSize?: number;
  readonly minValue?: number;
  readonly maxValue?: number;
  readonly unique?: boolean;
  readonly sortedOnly?: boolean;
  readonly scenarios?: boolean;
  readonly hint?: string;
}

interface ArrayAlgorithmDemoProps {
  readonly run: (values: readonly number[]) => Generator<ArrayAlgorithmFrame, unknown, unknown>;
  readonly pseudocode: readonly PseudocodeLine[];
  readonly defaultValues: readonly number[];
  readonly input?: NumbersInputOptions;
  readonly legend?: readonly LegendItem[];
  readonly counters?: boolean;
  /** панель над сценой; функция получает текущий массив (для кнопок «ключ из массива» и т. п.) */
  readonly toolbar?: ReactNode | ((values: readonly number[]) => ReactNode);
  /** панели под сценой, зависящие от входа (например, карта деления для слияния) */
  readonly below?: (values: readonly number[]) => ReactNode;
  readonly aside?: (frame: ArrayAlgorithmFrame | null) => ReactNode;
  readonly companion?: (frame: ArrayAlgorithmFrame | null) => ReactNode;
  readonly inputExtra?: ReactNode;
  readonly runKey?: string;
  readonly stageHeight?: number;
  /** подпись входных данных в отчёте, если кроме массива есть ещё параметры */
  readonly describeInput?: (values: readonly number[]) => string;
}

export function ArrayAlgorithmDemo({
  run,
  pseudocode,
  defaultValues,
  input = {},
  legend = arrayLegend,
  counters = true,
  toolbar,
  below,
  aside,
  companion,
  inputExtra,
  runKey = '',
  stageHeight = 280,
  describeInput = (values) => `[${values.join(', ')}]`,
}: ArrayAlgorithmDemoProps) {
  const { minSize = 2, maxSize = 16, minValue = -99, maxValue = 99 } = input;
  const [values, setValues] = useUrlState('in', defaultValues, numbersCodec({ min: minValue, max: maxValue, maxCount: maxSize }));
  const frameSet = useFrames(() => run(values), [values, run, runKey]);
  const player = useDemoPlayer(frameSet);
  const frame = player.frame;
  const isPhone = useMediaQuery('(max-width: 639px)');

  return (
    <DemoLayout
      aside={
        <>
          {counters && <OperationCounters frames={frameSet.frames} index={player.index} />}
          {aside?.(frame)}
        </>
      }
      below={below?.(values)}
      companion={companion?.(frame)}
      data={{
        summary: `[${values.join(', ')}]`,
        editor: (
          <NumbersInput
            hint={input.hint}
            maxSize={maxSize}
            maxValue={maxValue}
            minSize={minSize}
            minValue={minValue}
            onApply={setValues}
            scenarios={input.scenarios ?? true}
            sortedOnly={input.sortedOnly ?? false}
            unique={input.unique ?? false}
            value={values}
          >
            {inputExtra}
          </NumbersInput>
        ),
      }}
      legend={legend}
      player={player}
      pseudocode={pseudocode}
      resultInput={describeInput(values)}
      stage={
        <>
          <ArrayBars frame={frame} height={isPhone ? Math.min(220, stageHeight) : stageHeight} />
          <AuxiliaryStrip frame={frame} />
        </>
      }
      toolbar={typeof toolbar === 'function' ? toolbar(values) : toolbar}
      truncatedNote="Демонстрация сокращена: слишком много шагов для показа. Уменьшите размер входных данных."
    />
  );
}
