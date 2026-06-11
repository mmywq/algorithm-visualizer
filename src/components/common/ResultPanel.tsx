import { useState } from 'react';

interface ResultPanelProps {
  readonly summary: string | null;
  readonly steps: readonly string[];
  readonly inputSummary?: string | undefined;
}

export function ResultPanel({ summary, steps, inputSummary }: ResultPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section className="rounded-3xl border-2 border-accent/40 bg-surface p-5">
      <h2 className="text-lg font-semibold text-app-primary">Результат выполнения</h2>

      <dl className="mt-3 grid gap-2">
        {inputSummary !== undefined && (
          <div className="flex flex-col gap-1 rounded-xl border border-app bg-surface px-4 py-2.5 sm:flex-row sm:gap-3">
            <dt className="shrink-0 text-sm font-semibold text-app-muted">Вход:</dt>
            <dd className="text-sm leading-6 text-app-primary">{inputSummary}</dd>
          </div>
        )}
        {summary !== null && (
          <div className="flex flex-col gap-1 rounded-xl border border-accent/40 bg-accent/10 px-4 py-2.5 sm:flex-row sm:gap-3">
            <dt className="shrink-0 text-sm font-semibold text-app-muted">Итог:</dt>
            <dd className="text-sm leading-6 text-app-primary">{summary}</dd>
          </div>
        )}
      </dl>

      {steps.length > 0 && (
        <div className="mt-3">
          <button className="control-button" onClick={() => setIsExpanded((current) => !current)} type="button">
            {isExpanded ? 'Скрыть журнал шагов' : `Показать журнал — ${steps.length} ${formatStepsWord(steps.length)}`}
          </button>

          {isExpanded && (
            <ol className="mt-3 max-h-[420px] list-decimal space-y-1 overflow-y-auto rounded-2xl border border-app bg-surface p-4 pl-10 text-sm leading-6 text-app-muted">
              {steps.map((entry, index) => <li key={`${index}-${entry.slice(0, 32)}`}>{entry}</li>)}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}

const formatStepsWord = (count: number): string => {
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'шагов';
  const mod10 = count % 10;
  if (mod10 === 1) return 'шаг';
  if (mod10 >= 2 && mod10 <= 4) return 'шага';
  return 'шагов';
};
