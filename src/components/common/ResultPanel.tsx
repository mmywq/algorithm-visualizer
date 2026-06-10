import { useState } from 'react';

interface ResultPanelProps {
  readonly summary: string | null;
  readonly steps: readonly string[];
}

export function ResultPanel({ summary, steps }: ResultPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section className="app-panel">
      <h2 className="text-xl font-semibold text-app-primary">Результат</h2>
      {summary !== null && <p className="mt-2 text-sm leading-6 text-app-muted">{summary}</p>}

      {steps.length > 0 && (
        <div className="mt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-app-muted">
              Алгоритм выполнил {steps.length} {formatStepsWord(steps.length)}. Полный журнал можно развернуть и изучить шаг за шагом.
            </p>
            <button className="control-button" onClick={() => setIsExpanded((current) => !current)} type="button">
              {isExpanded ? 'Скрыть журнал' : `Показать журнал (${steps.length})`}
            </button>
          </div>

          {isExpanded && (
            <ol className="mt-4 max-h-[420px] list-decimal space-y-1 overflow-y-auto rounded-2xl border border-app bg-surface p-4 pl-10 text-sm leading-6 text-app-muted">
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
