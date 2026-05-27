import type { AlgorithmFrame } from '@/types';

interface StepTutorPanelProps {
  readonly frame: AlgorithmFrame<unknown, Record<string, unknown>> | null;
  readonly title: string;
  readonly complexity: string;
  readonly useCases: readonly string[];
  readonly pseudocodeLines?: readonly string[];
}

export function StepTutorPanel({ frame, title, complexity, useCases, pseudocodeLines = [] }: StepTutorPanelProps) {
  const explanation = frame?.description ?? frame?.message ?? 'Запустите плеер, чтобы увидеть пояснение шага.';

  return (
    <aside className="rounded-3xl border border-app bg-surface p-5">
      <h3 className="text-lg font-semibold text-app-primary">Теория</h3>
      <p className="mt-2 text-sm text-app-muted">{title}</p>
      <p className="mt-2 text-sm text-app-muted">Сложность: {complexity}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-app-muted">
        {useCases.map((useCase) => (
          <li key={useCase}>{useCase}</li>
        ))}
      </ul>

      <div className="mt-4 rounded-2xl border border-app bg-surface p-3 text-sm text-app-muted">
        <p className="font-semibold text-accent">Пояснение шага</p>
        <p className="mt-2">{explanation}</p>
      </div>

      <div className="mt-4 rounded-2xl border border-app bg-surface p-3 text-sm text-app-muted">
        <p className="font-semibold text-accent">Псевдокод</p>
        {pseudocodeLines.length > 0 ? (
          <div className="mt-2 space-y-1">
            {pseudocodeLines.map((line, index) => (
              <p className={frame?.pseudocode.line === index + 1 ? 'font-semibold text-accent' : ''} key={line}>
                {index + 1}. {line}
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-2">Активная строка: {frame?.pseudocode.line ?? '—'}</p>
        )}
      </div>
    </aside>
  );
}
