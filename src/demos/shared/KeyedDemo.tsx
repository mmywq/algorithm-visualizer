import { useState, type ReactNode } from 'react';
import { Tabs } from '@/components/ui/Tabs';
import { DemoLayout } from '@/features/demo/DemoLayout';
import type { LegendItem } from '@/features/demo/Legend';
import { NumbersInput } from '@/features/demo/NumbersInput';
import { useDemoPlayer } from '@/features/player/useDemoPlayer';
import { useFrames, type AnyFrame } from '@/features/player/usePlayer';
import { intCodec, numbersCodec, stringCodec, useUrlState } from '@/hooks/useUrlState';
import type { PseudocodeLine } from '@/types';
import type { NumbersInputOptions } from './ArrayAlgorithmDemo';

export interface KeyAction<F> {
  readonly key: string;
  readonly label: string;
  /** нужна ли операции ключ (поиск, удаление) или она работает с набором целиком */
  readonly needsKey: boolean;
  readonly run: (values: readonly number[], target: number) => Generator<F, unknown, unknown>;
  readonly pseudocode?: readonly PseudocodeLine[];
}

export interface KeyedDemoProps<F extends AnyFrame> {
  readonly build: (values: readonly number[]) => Generator<F, unknown, unknown>;
  readonly buildLabel?: string;
  readonly pseudocode: readonly PseudocodeLine[];
  readonly defaultValues: readonly number[];
  readonly actions?: readonly KeyAction<F>[];
  readonly defaultTarget?: number;
  readonly keyHint?: string;
  readonly input?: NumbersInputOptions;
  readonly renderStage: (frame: F | null) => ReactNode;
  readonly legend: (frames: readonly F[]) => readonly LegendItem[];
  readonly aside?: (frame: F | null) => ReactNode;
}

export function KeyedDemo<F extends AnyFrame>({
  build,
  buildLabel = 'Построение',
  pseudocode,
  defaultValues,
  actions = [],
  defaultTarget,
  keyHint,
  input = {},
  renderStage,
  legend,
  aside,
}: KeyedDemoProps<F>) {
  const { minSize = 2, maxSize = 12, minValue = -99, maxValue = 99 } = input;
  const [values, setValues] = useUrlState('in', defaultValues, numbersCodec({ min: minValue, max: maxValue, maxCount: maxSize }));
  const [operation, setOperation] = useUrlState('op', 'build', stringCodec(24));
  const [target, setTarget] = useUrlState('k', defaultTarget ?? values[Math.floor(values.length / 2)] ?? 0, intCodec(-999, 999));
  const [targetDraft, setTargetDraft] = useState(String(target));
  const action = actions.find((item) => item.key === operation);

  const frameSet = useFrames<F>(() => (action === undefined ? build(values) : action.run(values, target)), [values, action, target, build]);
  const player = useDemoPlayer(frameSet);

  const applyTarget = (): void => {
    const parsed = Number(targetDraft.trim());
    if (targetDraft.trim().length > 0 && Number.isInteger(parsed) && Math.abs(parsed) <= 999) setTarget(parsed);
  };

  const toolbar =
    actions.length === 0 ? undefined : (
      <div className="flex w-full flex-wrap items-center gap-2.5 lg:w-auto">
        <div className="max-w-full overflow-x-auto scrollbar-none">
          <Tabs
            ariaLabel="Операция"
            items={[{ value: 'build', label: buildLabel }, ...actions.map((item) => ({ value: item.key, label: item.label }))]}
            onChange={(value) => setOperation(value)}
            size="sm"
            value={action === undefined ? 'build' : action.key}
          />
        </div>
        {action?.needsKey === true && (
          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              applyTarget();
            }}
          >
            <label className="text-sm font-extrabold text-ink-2" htmlFor="structure-key">
              Ключ
            </label>
            <input
              className="input input-sm w-24 font-mono"
              id="structure-key"
              inputMode="numeric"
              onBlur={applyTarget}
              onChange={(event) => setTargetDraft(event.target.value)}
              value={targetDraft}
            />
            <button className="btn btn-primary btn-sm" type="submit">
              Показать
            </button>
          </form>
        )}
      </div>
    );

  return (
    <DemoLayout
      aside={aside?.(player.frame)}
      data={{
        summary: `[${values.join(', ')}]`,
        editor: (
          <NumbersInput
            hint={keyHint ?? 'Ключи вставляются в порядке ввода слева направо.'}
            maxSize={maxSize}
            maxValue={maxValue}
            minSize={minSize}
            minValue={minValue}
            onApply={setValues}
            scenarios={input.scenarios ?? true}
            unique={input.unique ?? true}
            value={values}
          />
        ),
      }}
      legend={legend(frameSet.frames)}
      player={player}
      pseudocode={action?.pseudocode ?? pseudocode}
      resultInput={`[${values.join(', ')}]${action?.needsKey === true ? `, ключ ${target}` : ''}`}
      stage={renderStage(player.frame)}
      toolbar={toolbar}
    />
  );
}
