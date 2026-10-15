import { Window } from '@/components/ui/Window';

interface ScriptPanelProps {
  /** подписи операций сценария по порядку */
  readonly labels: readonly string[];
  /** номер выполняемой операции; undefined — сценарий ещё не начался */
  readonly current: number | undefined;
  readonly done: boolean;
  /** текущая операция отклонена (дек полон, ключа нет…) */
  readonly rejected?: boolean;
}

/** Список операций сценария: выполненные зачёркнуты, текущая подсвечена. */
export function ScriptPanel({ labels, current, done, rejected = false }: ScriptPanelProps) {
  return (
    <Window bodyClassName="p-3" color="purple" title="Сценарий">
      <ol className="flex flex-wrap gap-1.5">
        {labels.map((label, index) => {
          const state = done || (current !== undefined && index < current) ? 'done' : index === current ? 'now' : 'next';
          return (
            <li
              aria-current={state === 'now' ? 'step' : undefined}
              className={`rounded-lg border-2 px-2 py-1 font-mono text-[12px] font-bold transition-colors ${
                state === 'now' && rejected
                  ? 'border-red bg-red/12 text-red'
                  : state === 'now'
                    ? 'border-brand bg-brand text-on'
                    : state === 'done'
                      ? 'border-line bg-surface-2 text-ink-3 line-through decoration-2'
                      : 'border-line-strong text-ink-2'
              }`}
              key={`${index}-${label}`}
            >
              {label}
            </li>
          );
        })}
      </ol>
    </Window>
  );
}
