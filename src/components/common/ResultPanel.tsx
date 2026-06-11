import { useState } from 'react';

interface ResultPanelProps {
  readonly summary: string | null;
  readonly steps: readonly string[];
  readonly inputSummary?: string | undefined;
}

export function ResultPanel({ summary, steps, inputSummary }: ResultPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const copyReport = (): void => {
    const lines: string[] = [];
    if (inputSummary !== undefined) lines.push(`Вход: ${inputSummary}`);
    if (summary !== null) lines.push(`Итог: ${summary}`);
    if (steps.length > 0) {
      lines.push('', 'Журнал шагов:');
      steps.forEach((entry, index) => lines.push(`${index + 1}. ${entry}`));
    }
    const text = lines.join('\n');

    const markCopied = (): void => {
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 2000);
    };

    if (navigator.clipboard?.writeText !== undefined) {
      navigator.clipboard.writeText(text).then(markCopied).catch(() => fallbackCopy(text, markCopied));
    } else {
      fallbackCopy(text, markCopied);
    }
  };

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
          <div className="flex flex-wrap gap-2">
            <button className="control-button" onClick={() => setIsExpanded((current) => !current)} type="button">
              {isExpanded ? 'Скрыть журнал шагов' : `Показать журнал — ${steps.length} ${formatStepsWord(steps.length)}`}
            </button>
            <button className="control-button" onClick={copyReport} type="button">
              {isCopied ? 'Скопировано ✓' : 'Скопировать отчёт'}
            </button>
          </div>

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

const fallbackCopy = (text: string, onDone: () => void): void => {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    onDone();
  } finally {
    document.body.removeChild(textarea);
  }
};

const formatStepsWord = (count: number): string => {
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'шагов';
  const mod10 = count % 10;
  if (mod10 === 1) return 'шаг';
  if (mod10 >= 2 && mod10 <= 4) return 'шага';
  return 'шагов';
};
