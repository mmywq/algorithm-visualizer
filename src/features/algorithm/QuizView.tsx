import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, RotateCcw, Target, Trophy, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PixelCat } from '@/components/mascot/PixelCat';
import { ProgressBar, ProgressRing } from '@/components/ui/Progress';
import type { AlgorithmEntry } from '@/content/catalog';
import { loadQuiz } from '@/content/loaders';
import { useHotkeys } from '@/hooks/useHotkeys';
import { celebrate } from '@/lib/celebrate';
import { pluralize, QUIZ_PASS_SCORE, XP } from '@/lib/progress';
import { useUserStore } from '@/stores/userStore';
import type { QuizQuestion } from '@/types/quiz';
import type { AlgorithmTab } from './AlgorithmContext';

interface PreparedQuestion extends QuizQuestion {
  readonly order: readonly number[];
}

const shuffle = <T,>(items: readonly T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
};

type Phase = 'intro' | 'question' | 'result';

export function QuizView({ entry, onNavigate }: { readonly entry: AlgorithmEntry; readonly onNavigate: (tab: AlgorithmTab) => void }) {
  const [questions, setQuestions] = useState<readonly QuizQuestion[] | null>(null);
  const [prepared, setPrepared] = useState<readonly PreparedQuestion[]>([]);
  const [phase, setPhase] = useState<Phase>('intro');
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [answers, setAnswers] = useState<readonly boolean[]>([]);
  const recordQuiz = useUserStore((state) => state.recordQuiz);
  const best = useUserStore((state) => state.data.progress[entry.id]?.quizBest);
  const passedBefore = useUserStore((state) => state.data.progress[entry.id]?.quizAt !== undefined);

  useEffect(() => {
    let cancelled = false;
    void loadQuiz(entry.category, entry.id).then((result) => {
      if (!cancelled) setQuestions(result);
    });
    return () => {
      cancelled = true;
    };
  }, [entry]);

  const start = useCallback(() => {
    if (questions === null) return;
    setPrepared(shuffle(questions).map((question) => ({ ...question, order: shuffle(question.options.map((_, index) => index)) })));
    setCurrent(0);
    setSelected(null);
    setChecked(false);
    setAnswers([]);
    setPhase('question');
  }, [questions]);

  const question = prepared[current];
  const isCorrect = question !== undefined && selected !== null && question.order[selected] === question.answer;

  const check = (): void => {
    if (selected === null || checked) return;
    setChecked(true);
    setAnswers((previous) => [...previous, isCorrect]);
  };

  const next = (): void => {
    if (current + 1 < prepared.length) {
      setCurrent(current + 1);
      setSelected(null);
      setChecked(false);
      return;
    }
    const score = answers.filter(Boolean).length / prepared.length;
    const firstPass = !passedBefore && score >= QUIZ_PASS_SCORE;
    recordQuiz(entry.id, score);
    setPhase('result');
    if (score >= 1) celebrate('big');
    else if (firstPass) celebrate('small');
  };

  useHotkeys(
    {
      '1': () => !checked && setSelected(0),
      '2': () => !checked && setSelected(1),
      '3': () => !checked && setSelected(2),
      '4': () => !checked && setSelected(3),
      Enter: () => (checked ? next() : check()),
    },
    phase === 'question',
  );

  const score = useMemo(() => (prepared.length === 0 ? 0 : answers.filter(Boolean).length / prepared.length), [answers, prepared.length]);

  if (questions === null) {
    return <div aria-busy="true" className="skeleton mx-auto h-64 max-w-2xl rounded-3xl" />;
  }

  if (questions.length === 0) {
    return <p className="card mx-auto max-w-2xl p-6 font-semibold text-ink-2">Тест для этого алгоритма скоро появится.</p>;
  }

  if (phase === 'intro') {
    return (
      <div className="card mx-auto flex max-w-2xl flex-col items-center p-8 text-center sm:p-10">
        <PixelCat pose="think" size={104} />
        <p className="tag mt-5 border-green text-green">
          <Target size={14} strokeWidth={3} />
          ТЕСТ
        </p>
        <h2 className="h-section mt-3">Проверьте себя</h2>
        <p className="mt-2 max-w-md text-[17px] font-semibold leading-7 text-ink-2">
          {questions.length} {pluralize(questions.length, 'вопрос', 'вопроса', 'вопросов')} по алгоритму «{entry.title}». Чтобы тест засчитался, нужно ответить
          верно хотя бы на {Math.round(QUIZ_PASS_SCORE * 100)}%.
        </p>
        {best !== undefined && (
          <p className="mt-4 rounded-full bg-surface-2 px-4 py-1.5 text-sm font-extrabold text-ink-2">Лучший результат: {Math.round(best * 100)}%</p>
        )}
        <button className="btn btn-green btn-lg mt-7" onClick={start} type="button">
          {best === undefined ? 'Начать тест' : 'Пройти ещё раз'}
          <ArrowRight size={20} strokeWidth={2.75} />
        </button>
        <p className="mt-4 text-sm font-bold text-ink-3">
          +{XP.quiz} XP за сдачу, ещё +{XP.quizPerfect} XP — без ошибок
        </p>
      </div>
    );
  }

  if (phase === 'result') {
    const passed = score >= QUIZ_PASS_SCORE;
    const mistakes = prepared.filter((_, index) => answers[index] === false);
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <div style={{ '--cat': passed ? 'var(--c-green)' : 'var(--c-orange)' } as React.CSSProperties}>
          <motion.div animate={{ opacity: 1, scale: 1 }} className="card flex flex-col items-center p-8 text-center" initial={{ opacity: 0, scale: 0.96 }}>
            <div className="flex items-center gap-5">
              <PixelCat pose={passed ? 'happy' : 'cry'} size={104} />
              <ProgressRing size={120} stroke={12} value={score}>
                <span className="font-display text-[32px] leading-none text-ink">{Math.round(score * 100)}%</span>
              </ProgressRing>
            </div>
            <h2 className="h-section mt-5">{score >= 1 ? 'Безупречно!' : passed ? 'Тест сдан!' : 'Почти получилось'}</h2>
            <p className="mt-2 max-w-md text-[16px] font-semibold leading-7 text-ink-2">
              Верных ответов: {answers.filter(Boolean).length} из {prepared.length}.{' '}
              {passed ? 'Этап засчитан в ваш прогресс.' : `Для зачёта нужно ${Math.round(QUIZ_PASS_SCORE * 100)}%. Загляните в теорию и попробуйте снова.`}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button className="btn btn-secondary" onClick={start} type="button">
                <RotateCcw size={18} strokeWidth={2.5} />
                Ещё раз
              </button>
              {!passed && (
                <button className="btn btn-primary" onClick={() => onNavigate('theory')} type="button">
                  Повторить теорию
                </button>
              )}
              {passed && (
                <button className="btn btn-primary" onClick={() => onNavigate('demo')} type="button">
                  <Trophy size={18} strokeWidth={2.5} />К демонстрации
                </button>
              )}
            </div>
          </motion.div>
        </div>

        {mistakes.length > 0 && (
          <section className="card p-5 sm:p-6">
            <h3 className="text-lg font-black text-ink">Разбор ошибок</h3>
            <ul className="mt-4 flex flex-col gap-4">
              {mistakes.map((item) => (
                <li className="rounded-2xl bg-surface-2 p-4" key={item.q}>
                  <p className="font-extrabold text-ink">{item.q}</p>
                  <p className="mt-2 flex items-start gap-2 text-[15px] font-bold text-green">
                    <Check className="mt-0.5 shrink-0" size={18} strokeWidth={3} />
                    {item.options[item.answer]}
                  </p>
                  <p className="mt-1.5 text-[15px] font-semibold leading-6 text-ink-2">{item.explain}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  if (question === undefined) return null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col">
      <div className="flex items-center gap-3">
        <button aria-label="Прервать тест" className="btn btn-ghost btn-icon btn-sm" onClick={() => setPhase('intro')} type="button">
          <X size={22} strokeWidth={2.75} />
        </button>
        <ProgressBar
          className="flex-1"
          color="rgb(var(--c-green))"
          height={16}
          label="Прогресс теста"
          value={(current + (checked ? 1 : 0)) / prepared.length}
        />
        <span className="font-display text-[16px] leading-none text-ink-3">
          {current + 1}/{prepared.length}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          animate={{ opacity: 1, x: 0 }}
          className="mt-7"
          exit={{ opacity: 0, x: -24 }}
          initial={{ opacity: 0, x: 24 }}
          key={current}
          transition={{ duration: 0.2 }}
        >
          <h2 className="text-[22px] font-black leading-snug tracking-[-0.015em] text-ink sm:text-[24px]">{question.q}</h2>
          {question.code !== undefined && (
            <pre
              aria-label="Фрагмент к вопросу"
              className="mt-4 overflow-x-auto rounded-2xl bg-surface-2 p-4 font-mono text-[14px] font-semibold leading-6 text-ink"
              role="region"
              tabIndex={0}
            >
              {question.code}
            </pre>
          )}
          <div className="mt-6 grid gap-3" role="radiogroup">
            {question.order.map((optionIndex, position) => {
              const isSelected = selected === position;
              const isAnswer = optionIndex === question.answer;
              let tone = 'border-line bg-surface hover:border-line-strong hover:bg-surface-2/50';
              let shadow = 'rgb(var(--c-line))';
              if (isSelected && !checked) {
                tone = 'border-brand bg-brand/8 text-brand';
                shadow = 'rgb(var(--c-brand) / 0.6)';
              }
              if (checked && isAnswer) {
                tone = 'border-green bg-green/10';
                shadow = 'rgb(var(--c-green) / 0.6)';
              } else if (checked && isSelected) {
                tone = 'border-red bg-red/10';
                shadow = 'rgb(var(--c-red) / 0.6)';
              }
              return (
                <motion.button
                  animate={checked && isSelected && !isAnswer ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
                  aria-checked={isSelected}
                  className={`flex w-full items-center gap-3.5 rounded-2xl border-2 px-4 py-3.5 text-left text-[16px] font-bold text-ink transition-colors disabled:cursor-default ${tone}`}
                  disabled={checked}
                  key={optionIndex}
                  onClick={() => setSelected(position)}
                  role="radio"
                  style={{ boxShadow: `0 3px 0 ${shadow}` }}
                  transition={{ duration: 0.4 }}
                  type="button"
                >
                  <span
                    className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 font-mono text-sm font-black ${isSelected ? 'border-current' : 'border-line text-ink-3'}`}
                  >
                    {checked && isAnswer ? <Check size={16} strokeWidth={3.5} /> : checked && isSelected ? <X size={16} strokeWidth={3.5} /> : position + 1}
                  </span>
                  {question.options[optionIndex]}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      <div
        className={`mt-6 rounded-3xl border-2 p-4 transition-colors sm:p-5 ${!checked ? 'border-transparent' : isCorrect ? 'border-green/40 bg-green/10' : 'border-red/40 bg-red/10'}`}
      >
        {checked && (
          <motion.div animate={{ opacity: 1, y: 0 }} className="mb-4 flex gap-4" initial={{ opacity: 0, y: 6 }}>
            <PixelCat className="hidden sm:inline-block" pose={isCorrect ? 'happy' : 'cry'} size={78} />
            <div className="min-w-0">
              <p className={`flex items-center gap-2 font-display text-[24px] leading-none ${isCorrect ? 'text-green' : 'text-red'}`}>
                {isCorrect ? <Check size={22} strokeWidth={3.5} /> : <X size={22} strokeWidth={3.5} />}
                {isCorrect ? 'Верно!' : 'Не совсем'}
              </p>
              {!isCorrect && <p className="mt-2 font-bold text-ink">Правильный ответ: {question.options[question.answer]}</p>}
              <p className="mt-1.5 text-[15px] font-semibold leading-6 text-ink-2">{question.explain}</p>
            </div>
          </motion.div>
        )}
        <button
          className={`btn btn-lg w-full ${!checked ? 'btn-green' : isCorrect ? 'btn-green' : 'btn-danger'}`}
          disabled={selected === null}
          onClick={checked ? next : check}
          type="button"
        >
          {!checked ? 'Проверить' : current + 1 < prepared.length ? 'Дальше' : 'Завершить'}
        </button>
      </div>
    </div>
  );
}
