import { useState } from 'react';
import type { AlgorithmTheory } from '@/types';

interface TheoryPanelProps {
  readonly theory: AlgorithmTheory;
}

export function TheoryPanel({ theory }: TheoryPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <section className="app-panel">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-app-primary">Теория</h2>
        <button className="control-button" onClick={() => setIsExpanded((current) => !current)} type="button">
          {isExpanded ? 'Свернуть' : 'Развернуть'}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 grid grid-cols-1 gap-5">
          {theory.intro.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Что это и как работает</h3>
              <div className="mt-2 space-y-2">
                {theory.intro.map((paragraph) => (
                  <p className="text-sm leading-6 text-app-muted" key={paragraph.slice(0, 48)}>{paragraph}</p>
                ))}
              </div>
            </div>
          )}

          {theory.purpose.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Зачем это нужно</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-app-muted">
                {theory.purpose.map((item) => <li key={item.slice(0, 48)}>{item}</li>)}
              </ul>
            </div>
          )}

          {theory.properties.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Свойства</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-app-muted">
                {theory.properties.map((item) => <li key={item.slice(0, 48)}>{item}</li>)}
              </ul>
            </div>
          )}

          {theory.terms.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Термины и обозначения</h3>
              <dl className="mt-2 grid grid-cols-1 gap-2">
                {theory.terms.map((term) => (
                  <div className="rounded-xl border border-app bg-surface px-3 py-2" key={term.term}>
                    <dt className="text-sm font-semibold text-app-primary">{term.term}</dt>
                    <dd className="mt-1 text-sm leading-6 text-app-muted">{term.definition}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {(theory.complexity.length > 0 || theory.complexityNote !== undefined) && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Сложность операций</h3>
              {theory.complexity.length > 0 && (
                <div className="mt-2 overflow-x-auto rounded-2xl border border-app">
                  <table className="min-w-full border-collapse text-left text-sm text-app-muted">
                    <thead className="text-xs uppercase tracking-[0.14em] text-app-muted/80">
                      <tr>
                        <th className="px-4 py-2.5">Операция</th>
                        <th className="px-4 py-2.5">Лучший случай</th>
                        <th className="px-4 py-2.5">Средний случай</th>
                        <th className="px-4 py-2.5">Худший случай</th>
                      </tr>
                    </thead>
                    <tbody>
                      {theory.complexity.map((row) => (
                        <tr className="border-t border-app" key={row.operation}>
                          <th className="px-4 py-2.5 font-semibold text-app-primary">{row.operation}</th>
                          <td className="px-4 py-2.5 font-mono">{row.best ?? row.average}</td>
                          <td className="px-4 py-2.5 font-mono">{row.average}</td>
                          <td className="px-4 py-2.5 font-mono">{row.worst}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {theory.complexityNote !== undefined && (
                <p className="mt-2 text-sm leading-6 text-app-muted">{theory.complexityNote}</p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
