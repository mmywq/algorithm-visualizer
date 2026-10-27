import { motion, type MotionStyle } from 'framer-motion';
import { ArrowRight, Check, ClipboardCopy, ListOrdered, SearchX } from 'lucide-react';
import { useState } from 'react';
import { PixelCat } from '@/components/mascot/PixelCat';
import { toast } from '@/components/ui/Toaster';
import { useOptionalAlgorithm } from '@/features/algorithm/AlgorithmContext';
import { copyText } from '@/lib/clipboard';
import { spring } from '@/lib/motion';
import { pluralize } from '@/lib/progress';

interface ResultPanelProps {
  readonly summary: string | null;
  readonly steps: readonly string[];
  readonly input?: string | undefined;
  /** алгоритм честно отработал, но искомого нет — кот грустит, панель красная */
  readonly miss?: boolean;
}

export function ResultPanel({ summary, steps, input, miss = false }: ResultPanelProps) {
  const algorithm = useOptionalAlgorithm();
  const [showLog, setShowLog] = useState(false);

  const copyReport = async (): Promise<void> => {
    const lines: string[] = [];
    if (algorithm !== null) lines.push(algorithm.entry.title, '');
    if (input !== undefined) lines.push(`Входные данные: ${input}`);
    if (summary !== null) lines.push(`Итог: ${summary}`);
    if (steps.length > 0) {
      lines.push('', 'Журнал шагов:');
      steps.forEach((entry, index) => lines.push(`${index + 1}. ${entry}`));
    }
    const ok = await copyText(lines.join('\n'));
    if (ok) toast.success('Отчёт скопирован', 'Его можно вставить в конспект или отчёт по лабораторной.');
    else toast.error('Не удалось скопировать', 'Браузер запретил доступ к буферу обмена.');
  };

  return (
    <motion.section
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`window ${miss ? 'border-red/70' : 'border-green/70'}`}
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      style={
        (miss
          ? { '--cat': 'var(--c-red)', '--cat-press': 'var(--c-red-press)' }
          : { '--cat': 'var(--c-green)', '--cat-press': 'var(--c-green-press)' }) as MotionStyle
      }
      transition={spring.smooth}
    >
      <div className="window-bar">
        <span className="window-title">result.txt</span>
        <span aria-hidden="true" className="window-dots">
          <span className="bg-brand" />
          <span className="bg-yellow" />
          <span className="bg-green" />
        </span>
      </div>
      <div className={`flex items-start gap-4 p-4 sm:p-5 ${miss ? 'bg-red/8' : 'bg-green/8'}`}>
        <PixelCat pose={miss ? 'cry' : 'happy'} size={78} />
        <div className="min-w-0">
          {miss ? (
            <p className="tag border-red text-red">
              <SearchX size={14} strokeWidth={3} />
              НЕ НАЙДЕНО
            </p>
          ) : (
            <p className="tag border-green text-green">
              <Check size={14} strokeWidth={3.5} />
              ГОТОВО
            </p>
          )}
          <h3 className="mt-2 text-lg font-black text-ink">{miss ? 'Искомого здесь нет' : 'Вот что получилось'}</h3>
          {summary !== null && <p className="mt-1 text-[15px] font-semibold leading-6 text-ink-2">{summary}</p>}
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {input !== undefined && (
          <p className="text-sm font-semibold text-ink-2">
            Входные данные: <span className="font-mono text-ink">{input}</span>
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {steps.length > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowLog((current) => !current)} type="button">
              <ListOrdered size={16} strokeWidth={2.5} />
              {showLog ? 'Скрыть журнал' : `Журнал: ${steps.length} ${pluralize(steps.length, 'шаг', 'шага', 'шагов')}`}
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => void copyReport()} type="button">
            <ClipboardCopy size={16} strokeWidth={2.5} />
            Скопировать отчёт
          </button>
          {algorithm !== null && !algorithm.embed && (
            <button className="btn btn-green btn-sm" onClick={() => algorithm.setTab('quiz')} type="button">
              Проверить себя
              <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {showLog && (
          <ol className="mt-3 max-h-[380px] list-decimal space-y-1.5 overflow-y-auto rounded-2xl bg-surface-2 p-4 pl-10 text-sm font-medium leading-6 text-ink-2">
            {steps.map((entry, index) => (
              <li key={`${index}-${entry.slice(0, 24)}`}>{entry}</li>
            ))}
          </ol>
        )}
      </div>
    </motion.section>
  );
}
