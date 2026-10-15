import { ArrowRight, BookOpen, CircleCheck, Lightbulb, Play, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PixelCat } from '@/components/mascot/PixelCat';
import type { AlgorithmEntry } from '@/content/catalog';
import { loadTheory } from '@/content/loaders';
import { XP } from '@/lib/progress';
import { useUserStore } from '@/stores/userStore';
import type { AlgorithmTheory } from '@/types';
import type { AlgorithmTab } from './AlgorithmContext';

interface TheoryViewProps {
  readonly entry: AlgorithmEntry;
  readonly onNavigate: (tab: AlgorithmTab) => void;
}

export function TheoryView({ entry, onNavigate }: TheoryViewProps) {
  const [theory, setTheory] = useState<AlgorithmTheory | null | undefined>(undefined);
  const markTheory = useUserStore((state) => state.markTheory);
  const theoryDone = useUserStore((state) => state.data.progress[entry.id]?.theoryAt !== undefined);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadTheory(entry.category, entry.id).then((result) => {
      if (!cancelled) setTheory(result);
    });
    return () => {
      cancelled = true;
    };
  }, [entry]);

  // теория засчитывается, когда читатель долистал до конца статьи
  useEffect(() => {
    const node = endRef.current;
    if (node === null || theory === undefined || theory === null || theoryDone) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((item) => item.isIntersecting)) {
        markTheory(entry.id);
        observer.disconnect();
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [theory, theoryDone, entry.id, markTheory]);

  if (theory === undefined) {
    return (
      <div aria-busy="true" className="flex max-w-3xl flex-col gap-3">
        <div className="skeleton h-6 w-1/2" />
        <div className="skeleton h-24 w-full" />
        <div className="skeleton h-24 w-full" />
      </div>
    );
  }

  if (theory === null) {
    return <p className="card p-6 font-semibold text-ink-2">Теория для этого алгоритма готовится.</p>;
  }

  return (
    <article className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-w-0 max-w-3xl flex-col gap-9">
        <section>
          <SectionTitle icon={<BookOpen size={20} strokeWidth={2.5} />} title="Как это работает" />
          <div className="mt-3 space-y-4">
            {theory.intro.map((paragraph, index) => (
              <p className={`leading-8 text-ink ${index === 0 ? 'text-[19px] font-bold' : 'text-[17px] font-medium'}`} key={paragraph.slice(0, 40)}>
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        {theory.purpose.length > 0 && (
          <section>
            <SectionTitle icon={<Lightbulb size={20} strokeWidth={2.5} />} title="Где применяется" />
            <ul className="mt-3 grid gap-2.5">
              {theory.purpose.map((item) => (
                <li className="flex gap-3 text-[16px] font-semibold leading-7 text-ink" key={item.slice(0, 40)}>
                  <CircleCheck className="mt-1 shrink-0 text-green" size={20} strokeWidth={2.5} />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        )}

        {theory.properties.length > 0 && (
          <section>
            <SectionTitle icon={<Sparkles size={20} strokeWidth={2.5} />} title="Свойства" />
            <ul className="mt-3 grid gap-2.5">
              {theory.properties.map((item, index) => (
                <li className="flex gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-[16px] font-semibold leading-7 text-ink" key={item.slice(0, 40)}>
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cat font-mono text-xs font-black text-on">
                    {index + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </section>
        )}

        {theory.complexity.length > 0 && (
          <section>
            <SectionTitle title="Сложность" />
            <div className="mt-3 overflow-x-auto rounded-2xl border-2 border-line">
              <table className="w-full min-w-[480px] border-collapse text-left">
                <thead>
                  <tr className="bg-surface-2 text-sm font-extrabold text-ink-2">
                    <th className="px-4 py-3" scope="col">
                      Что измеряем
                    </th>
                    <th className="px-4 py-3" scope="col">
                      Лучший
                    </th>
                    <th className="px-4 py-3" scope="col">
                      Средний
                    </th>
                    <th className="px-4 py-3" scope="col">
                      Худший
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {theory.complexity.map((row) => (
                    <tr className="border-t-2 border-line" key={row.operation}>
                      <th className="px-4 py-3 text-[15px] font-extrabold text-ink" scope="row">
                        {row.operation}
                      </th>
                      <td className="px-4 py-3 font-mono text-[14px] font-bold text-green">{row.best ?? row.average}</td>
                      <td className="px-4 py-3 font-mono text-[14px] font-bold text-ink">{row.average}</td>
                      <td className="px-4 py-3 font-mono text-[14px] font-bold text-red">{row.worst}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {theory.complexityNote !== undefined && <p className="mt-3 text-[15px] font-semibold leading-7 text-ink-2">{theory.complexityNote}</p>}
          </section>
        )}

        {theory.pseudocode.length > 0 && (
          <section>
            <SectionTitle title="Псевдокод" />
            <ol className="mt-3 overflow-x-auto rounded-2xl bg-[rgb(27_31_43)] p-4 font-mono text-[14px] leading-7 text-[rgb(226_230_240)] dark:bg-surface-2">
              {theory.pseudocode.map((line, index) => (
                <li className="flex gap-3" key={`${index}-${line.code}`}>
                  <span className="w-5 shrink-0 select-none text-right text-[rgb(120_128_150)]">{index + 1}</span>
                  <span>
                    {line.code}
                    {line.note !== undefined && <span className="ml-2 font-sans text-[13px] font-semibold text-[rgb(140_150_175)]">// {line.note}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <div className="card flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center" ref={endRef}>
          <PixelCat pose={theoryDone ? 'happy' : 'sit'} size={78} />
          <div className="flex-1">
            <p className="text-lg font-black text-ink">{theoryDone ? 'Теория изучена' : 'Вы дочитали до конца'}</p>
            <p className="text-[15px] font-semibold text-ink-2">
              {theoryDone ? `+${XP.theory} XP уже начислено. Закрепите материал на практике.` : 'Этап засчитан. Теперь посмотрите алгоритм в движении.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-cat" onClick={() => onNavigate('demo')} type="button">
              <Play fill="currentColor" size={16} />К демонстрации
            </button>
            <button className="btn btn-secondary" onClick={() => onNavigate('quiz')} type="button">
              Пройти тест
              <ArrowRight size={18} strokeWidth={2.75} />
            </button>
          </div>
        </div>
      </div>

      {theory.terms.length > 0 && (
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <h2 className="font-display text-[24px] leading-none text-ink">Словарик</h2>
          <dl className="mt-3 flex flex-col gap-2.5">
            {theory.terms.map((term) => (
              <div className="card p-4" key={term.term}>
                <dt className="font-black text-cat">{term.term}</dt>
                <dd className="mt-1 text-[15px] font-semibold leading-6 text-ink-2">{term.definition}</dd>
              </div>
            ))}
          </dl>
        </aside>
      )}
    </article>
  );
}

function SectionTitle({ title, icon }: { readonly title: string; readonly icon?: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 font-display text-[24px] leading-tight text-ink">
      {icon !== undefined && <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-cat/12 text-cat">{icon}</span>}
      {title}
    </h2>
  );
}
