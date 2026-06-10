import { useState } from 'react';

interface StepHistoryPanelProps {
  readonly steps: readonly string[];
  readonly title?: string;
}

export function StepHistoryPanel({ steps, title = 'Полный список выполненных шагов' }: StepHistoryPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (steps.length === 0) {
    return null;
  }

  return (
    <section className="app-panel">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-app-primary">{title}</h3>
          <p className="mt-1 text-sm text-app-muted">
            Список содержит {steps.length} шагов. Он скрыт, чтобы страница не становилась слишком длинной после завершения алгоритма.
          </p>
        </div>
        <button className="control-button" onClick={() => setIsExpanded((current) => !current)} type="button">
          {isExpanded ? 'Скрыть шаги' : `Показать шаги (${steps.length})`}
        </button>
      </div>

      {isExpanded && (
        <ol className="mt-4 max-h-[420px] list-decimal space-y-1 overflow-y-auto rounded-2xl border border-app bg-surface p-4 pl-8 text-sm text-app-muted">
          {steps.map((entry, index) => <li key={`${index}-${entry}`}>{entry}</li>)}
        </ol>
      )}
    </section>
  );
}
