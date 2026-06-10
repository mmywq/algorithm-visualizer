import type { AlgorithmFrame, PseudocodeLine } from '@/types';

interface StepExplainPanelProps {
  readonly frame: AlgorithmFrame<unknown, Record<string, unknown>> | null;
  readonly pseudocode: readonly PseudocodeLine[];
}

export function StepExplainPanel({ frame, pseudocode }: StepExplainPanelProps) {
  const explanation = frame?.description ?? frame?.message ?? 'Нажмите «Старт» или листайте шаги кнопками «Вперёд» и «Назад» — здесь появится пояснение каждого шага.';
  const activeLine = frame?.pseudocode.line ?? null;

  return (
    <aside className="app-panel flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Текущий шаг</h3>
        <p className="mt-2 min-h-[120px] rounded-2xl border border-app bg-surface px-4 py-3 text-sm leading-6 text-app-muted">
          {explanation}
        </p>
      </div>

      {pseudocode.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Псевдокод</h3>
          <ol className="mt-2 space-y-1">
            {pseudocode.map((line, index) => {
              const isActive = activeLine === index + 1;
              return (
                <li
                  className={`rounded-xl border px-3 py-2 transition ${isActive ? 'border-accent/60 bg-accent/10' : 'border-transparent'}`}
                  key={line.code}
                >
                  <p className={`text-sm ${isActive ? 'font-semibold text-app-primary' : 'text-app-muted'}`}>
                    <span className="mr-2 inline-block w-5 text-right font-mono text-xs text-app-muted/70">{index + 1}</span>
                    {line.code}
                  </p>
                  {line.note !== undefined && (
                    <p className="mt-1 pl-7 text-xs leading-5 text-app-muted/80">{line.note}</p>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </aside>
  );
}
