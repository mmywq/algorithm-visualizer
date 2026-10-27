import { motion, type MotionStyle } from 'framer-motion';
import { ArrowRight, BookOpen, GraduationCap, Play, Presentation, Share2, Target, Users, WifiOff } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { bubbleSort } from '@/algorithms/arrays';
import { AlgorithmCard } from '@/components/AlgorithmCard';
import { Marquee } from '@/components/fx/Marquee';
import { Reveal } from '@/components/fx/Reveal';
import { CatSays } from '@/components/mascot/CatSays';
import { MASCOT_NAME, PixelCat } from '@/components/mascot/PixelCat';
import { QuestsPanel } from '@/components/QuestsPanel';
import { ArrayBars } from '@/components/visualizers/arrays/ArrayBars';
import { categoryVars } from '@/components/ui/cat';
import { CategoryArt } from '@/components/ui/CategoryArt';
import { ProgressBar, ProgressRing } from '@/components/ui/Progress';
import { Window } from '@/components/ui/Window';
import { brand } from '@/config/brand';
import { catalog, categories, entryById } from '@/content/catalog';
import { collectFrames } from '@/features/player/usePlayer';
import { usePageMeta } from '@/hooks/usePageMeta';
import { categoryStats, computeStreak, pluralize, progressShare } from '@/lib/progress';
import { useUserStore } from '@/stores/userStore';

const featuredIds = ['quick-sort', 'dijkstra', 'a-star', 'red-black', 'knapsack', 'kmp'] as const;

const marqueeItems = [
  `${catalog.length} алгоритмов`,
  'анимация каждого шага',
  'ваши данные',
  'теория и тесты',
  'миссии дня',
  'работает офлайн',
  'для вузов и школ',
];

const petCat = (): void => useUserStore.getState().petCat();

export default function HomePage() {
  usePageMeta({});

  return (
    <div className="flex flex-col gap-16 sm:gap-24">
      <Hero />
      <div className="relative left-1/2 -my-6 w-screen -translate-x-1/2 sm:-my-10">
        <Marquee items={marqueeItems} />
      </div>
      <TodayBlock />
      <Worlds />
      <HowItWorks />
      <Featured />
      <TeachersTeaser />
    </div>
  );
}

function Hero() {
  const lastVisit = useUserStore((state) => state.data.history[0]);
  const continueEntry = lastVisit === undefined ? undefined : entryById.get(lastVisit.id);

  return (
    <section className="grid grid-cols-1 items-center gap-12 pt-4 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pt-10">
      <div>
        <motion.div animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-2" initial={{ opacity: 0, y: 8 }}>
          <span className="tag border-brand text-brand">PLAYER 01</span>
          <span className="tag border-green text-green">{catalog.length} ДЕМО</span>
          <span className="tag border-yellow text-yellow">БЕЗ РЕГИСТРАЦИИ</span>
        </motion.div>
        <motion.h1
          animate={{ opacity: 1, y: 0 }}
          className="h-display-xl mt-6 text-ink"
          initial={{ opacity: 0, y: 14 }}
          transition={{ delay: 0.05, type: 'spring', stiffness: 200, damping: 22 }}
        >
          Алгоритмы,
          <br />
          <span className="relative inline-block text-brand">
            которые видно
            <svg aria-hidden="true" className="pixelated absolute -bottom-3 left-0 h-2 w-full" preserveAspectRatio="none" viewBox="0 0 40 2">
              <rect fill="rgb(var(--c-yellow))" height="1" width="40" x="0" y="0" />
              <rect fill="rgb(var(--c-yellow-press))" height="1" width="40" x="0" y="1" />
            </svg>
          </span>
        </motion.h1>
        <motion.p
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 max-w-xl text-[18px] font-semibold leading-8 text-ink-2"
          initial={{ opacity: 0, y: 14 }}
          transition={{ delay: 0.1 }}
        >
          {brand.name} показывает работу алгоритма шаг за шагом — на ваших собственных данных. Теория, псевдокод с подсветкой текущей строки, тесты и миссии дня
          — как в игре, только по программе курса.
        </motion.p>
        <motion.div animate={{ opacity: 1, y: 0 }} className="mt-9 flex flex-wrap gap-3" initial={{ opacity: 0, y: 14 }} transition={{ delay: 0.15 }}>
          <Link className="btn btn-primary btn-lg font-display text-[24px]" to={continueEntry?.path ?? '/sorting/bubble'}>
            {continueEntry === undefined ? 'Начать игру' : 'Продолжить'} ▶
          </Link>
          <Link className="btn btn-secondary btn-lg" to="/for-schools">
            <GraduationCap size={20} strokeWidth={2.5} />
            Для преподавателей
          </Link>
        </motion.div>
        <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-[15px] font-bold text-ink-2">
          <li className="inline-flex items-center gap-2">
            <Play className="text-brand" size={18} strokeWidth={2.5} />
            Анимация каждого шага
          </li>
          <li className="inline-flex items-center gap-2">
            <Target className="text-green" size={18} strokeWidth={2.5} />
            Тесты с разбором
          </li>
          <li className="inline-flex items-center gap-2">
            <WifiOff className="text-yellow" size={18} strokeWidth={2.5} />
            Офлайн в аудитории
          </li>
        </ul>
      </div>
      <HeroDemo />
    </section>
  );
}

const heroValues = [42, 15, 63, 8, 34, 71, 27, 52];

const catLine = (phase: string | undefined): string => {
  if (phase === 'compare') return 'Сравниваю двух соседей. Кто больше — тот правее!';
  if (phase === 'swap') return 'Меняю местами: большое число всплывает, как пузырёк.';
  if (phase === 'complete') return 'Готово! Все числа на своих местах. Попробуешь на своих?';
  return 'Смотри: справа копятся числа, которые уже на месте.';
};

/** Настоящая пузырьковая сортировка по кругу; Кэш комментирует происходящее. */
function HeroDemo() {
  const frames = useMemo(() => collectFrames(bubbleSort(heroValues)).frames, []);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const atEnd = index >= frames.length - 1;
    const timer = window.setTimeout(() => setIndex(atEnd ? 0 : index + 1), atEnd ? 3200 : 560);
    return () => window.clearTimeout(timer);
  }, [index, frames.length]);

  const frame = frames[index] ?? null;
  const phase = frame?.phase;
  const wanted = catLine(phase === 'inspect' || phase === 'initial' ? undefined : phase);
  // реплика держится хотя бы 3,5 секунды, чтобы её успели прочитать
  const [line, setLine] = useState(wanted);
  const lineChangedAt = useRef(Date.now());
  useEffect(() => {
    if (wanted === line) return;
    const isFinal = phase === 'complete';
    if (isFinal || Date.now() - lineChangedAt.current > 3500) {
      lineChangedAt.current = Date.now();
      setLine(wanted);
    }
  }, [wanted, line, phase]);

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="relative pt-20"
      initial={{ opacity: 0, y: 20 }}
      style={categoryVars('sorting') as MotionStyle}
      transition={{ delay: 0.15, type: 'spring', stiffness: 160, damping: 20 }}
    >
      {/* Кэш выглядывает из-за окна: голова над рамкой, лапы держатся за край */}
      <div className="absolute right-5 top-[23px] z-[2] sm:right-10">
        <PixelCat interactive label={`${MASCOT_NAME} выглядывает из-за окна`} onPet={petCat} pose="peek" size={64} />
      </div>
      <div className="absolute left-0 top-0 z-10 max-w-[calc(100%-150px)] sm:max-w-[320px]">
        <CatSays tail="right" text={line} />
      </div>
      <Window className="relative z-[1] shadow-pixel-lg" title="bubble_sort.exe">
        <div className="p-3 sm:p-4">
          <ArrayBars frame={frame} height={210} />
          <div className="mt-3 flex items-center gap-3">
            <span
              className={`tag shrink-0 ${phase === 'swap' ? 'border-orange text-orange' : phase === 'compare' ? 'border-brand text-brand' : 'border-green text-green'}`}
            >
              {phase === 'swap' ? 'ОБМЕН' : phase === 'compare' ? 'СРАВНЕНИЕ' : phase === 'complete' ? 'ГОТОВО' : 'ПРОХОД'}
            </span>
            <div className="h-3 flex-1 overflow-hidden rounded-[3px] border border-line-strong bg-surface-2">
              <div className="h-full bg-cat transition-[width] duration-300" style={{ width: `${((index + 1) / frames.length) * 100}%` }} />
            </div>
            <span className="font-display text-[16px] leading-none text-ink-3">
              {index + 1}/{frames.length}
            </span>
          </div>
        </div>
      </Window>
    </motion.div>
  );
}

function TodayBlock() {
  const data = useUserStore((state) => state.data);
  const lastVisit = data.history[0];
  const entry = lastVisit === undefined ? undefined : entryById.get(lastVisit.id);
  const streak = computeStreak(data.activity);

  return (
    <section aria-label="Сегодня" className="grid grid-cols-1 gap-5 lg:grid-cols-[1.25fr_1fr]">
      <Reveal>
        {entry !== undefined ? (
          <Link className="card card-hover flex h-full flex-col gap-5 p-6 sm:flex-row sm:items-center" style={categoryVars(entry.category)} to={entry.path}>
            <ProgressRing size={84} stroke={10} value={progressShare(data.progress[entry.id])}>
              <Play className="translate-x-[2px] text-cat" fill="currentColor" size={28} />
            </ProgressRing>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[16px] text-ink-3">ПРОДОЛЖИТЬ</p>
              <p className="mt-1 text-2xl font-black tracking-[-0.01em] text-ink">{entry.title}</p>
              <p className="mt-1 text-[15px] font-semibold text-ink-2">{entry.short}</p>
              {streak > 0 && (
                <p className="tag mt-3 border-orange text-orange">
                  СЕРИЯ {streak} {pluralize(streak, 'ДЕНЬ', 'ДНЯ', 'ДНЕЙ')}
                </p>
              )}
            </div>
            <span className="btn btn-cat self-start sm:self-auto">
              Вперёд
              <ArrowRight size={18} strokeWidth={2.75} />
            </span>
          </Link>
        ) : (
          <div className="card flex h-full flex-col items-start gap-5 p-6 sm:flex-row sm:items-center">
            <PixelCat interactive onPet={petCat} pose="sit" size={104} />
            <div className="min-w-0 flex-1">
              <p className="font-display text-[16px] text-brand">ПРИВЕТ!</p>
              <p className="mt-1 text-2xl font-black tracking-[-0.01em] text-ink">Я {MASCOT_NAME}, ваш напарник по алгоритмам</p>
              <p className="mt-2 text-[15px] font-semibold leading-6 text-ink-2">
                Начнём с пузырьковой сортировки — это семь минут. Прогресс сохранится сам, а за каждый этап я буду начислять опыт.
              </p>
              <Link className="btn btn-primary mt-4" to="/sorting/bubble">
                Поехали ▶
              </Link>
            </div>
          </div>
        )}
      </Reveal>
      <Reveal delay={0.08}>
        <QuestsPanel className="h-full" />
      </Reveal>
    </section>
  );
}

function Worlds() {
  const data = useUserStore((state) => state.data);
  return (
    <section aria-labelledby="worlds-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="tag border-purple text-purple">ВЫБЕРИ МИР</p>
          <h2 className="h-section mt-3" id="worlds-title">
            Девять миров — от стека до графов
          </h2>
          <p className="mt-3 max-w-2xl text-[17px] font-semibold leading-7 text-ink-2">
            Миры идут в порядке классического курса «Алгоритмы и структуры данных», но открыты все сразу — начинайте с любого.
          </p>
        </div>
        <Link className="btn btn-secondary" to="/catalog">
          Весь каталог
          <ArrowRight size={18} strokeWidth={2.75} />
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category, index) => {
          const stats = categoryStats(data, category.id);
          return (
            <Reveal delay={Math.min(index, 5) * 0.05} key={category.id}>
              <Link className="window card-hover group flex h-full flex-col" style={categoryVars(category.id)} to={`/catalog?c=${category.id}`}>
                <div className="window-bar">
                  <span className="window-title">МИР {String(index + 1).padStart(2, '0')}</span>
                  <span className="font-display text-[16px] leading-none text-ink-3">
                    {stats.mastered}/{stats.total}
                  </span>
                </div>
                <div className="relative h-36 overflow-hidden bg-cat/8">
                  <CategoryArt
                    category={category.id}
                    className="absolute inset-0 m-auto h-full w-full p-3 transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-[1.05]"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-xl font-black tracking-[-0.015em] text-ink group-hover:text-cat">{category.title}</h3>
                  <p className="mt-1.5 text-[15px] font-semibold leading-6 text-ink-2">{category.description}</p>
                  <div className="mt-auto flex items-center gap-3 pt-5">
                    <ProgressBar className="flex-1" height={10} label={`Прогресс мира «${category.title}»`} value={stats.share} />
                    <span className="w-12 text-right font-display text-[16px] leading-none text-ink-2">{Math.round(stats.share * 100)}%</span>
                  </div>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: BookOpen,
      color: 'purple',
      tag: 'ЭТАП 1',
      title: 'Разберитесь в идее',
      text: 'Короткая теория: что делает алгоритм, где применяется, какие у него свойства и сложность.',
    },
    {
      icon: Play,
      color: 'brand',
      tag: 'ЭТАП 2',
      title: 'Посмотрите в движении',
      text: 'Анимация на ваших данных. Строка псевдокода и пояснение меняются вместе с каждым шагом.',
    },
    {
      icon: Target,
      color: 'green',
      tag: 'ЭТАП 3',
      title: 'Проверьте себя',
      text: 'Тест с разбором ошибок. За каждый этап начисляется опыт, растут уровень и серия дней.',
    },
  ] as const;

  return (
    <section aria-labelledby="how-title">
      <p className="tag border-green text-green">КАК ЭТО РАБОТАЕТ</p>
      <h2 className="h-section mt-3" id="how-title">
        Три этапа — и алгоритм ваш
      </h2>
      <ol className="mt-8 grid gap-5 md:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <Reveal as="li" className="card relative h-full p-6" delay={index * 0.08} key={step.title}>
              <div className="flex items-center justify-between">
                <span
                  className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border-2 text-on"
                  style={{
                    background: `rgb(var(--c-${step.color}))`,
                    borderColor: `rgb(var(--c-${step.color}-press))`,
                    boxShadow: `0 4px 0 rgb(var(--c-${step.color}-press))`,
                  }}
                >
                  <Icon size={26} strokeWidth={2.5} />
                </span>
                <span className="font-display text-[16px] text-ink-3">{step.tag}</span>
              </div>
              <h3 className="mt-5 text-xl font-black text-ink">{step.title}</h3>
              <p className="mt-2 text-[16px] font-semibold leading-7 text-ink-2">{step.text}</p>
            </Reveal>
          );
        })}
      </ol>
    </section>
  );
}

function Featured() {
  return (
    <section aria-labelledby="featured-title">
      <p className="tag border-yellow text-yellow">★ САМОЕ ЗРЕЛИЩНОЕ</p>
      <h2 className="h-section mt-3" id="featured-title">
        Лучше один раз увидеть
      </h2>
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {featuredIds.map((id, index) => {
          const entry = entryById.get(id);
          return entry === undefined ? null : (
            <Reveal delay={index * 0.05} key={id}>
              <AlgorithmCard entry={entry} />
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

function TeachersTeaser() {
  const features = [
    { icon: Presentation, title: 'Режим лекции', text: 'Полноэкранная демонстрация с управлением с клавиатуры или пульта.' },
    { icon: Users, title: 'Классы и задания', text: 'Студенты вступают по коду, а вы видите прогресс каждого.' },
    { icon: Share2, title: 'Ссылка на шаг', text: 'Поделитесь конкретным состоянием демонстрации или встройте её в LMS.' },
  ];
  return (
    <Reveal>
      <Window bodyClassName="relative grid grid-cols-1 gap-10 p-6 sm:p-10 lg:grid-cols-[1fr_1.15fr] lg:items-center" color="purple" title="for_teachers.exe">
        <div>
          <p className="tag border-purple text-purple">ДЛЯ ВУЗОВ, КОЛЛЕДЖЕЙ И ШКОЛ</p>
          <h2 className="h-section mt-4">Готовое наглядное пособие для вашего курса</h2>
          <p className="mt-4 max-w-lg text-[17px] font-semibold leading-7 text-ink-2">
            Покажите алгоритм на лекции, выдайте задание группе и следите за прогрессом — без установки программ на компьютеры аудитории.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link className="btn btn-primary btn-lg" to="/for-schools">
              Условия лицензии
              <ArrowRight size={20} strokeWidth={2.75} />
            </Link>
            <PixelCat interactive onPet={petCat} pose="wow" size={78} />
          </div>
        </div>
        <ul className="grid gap-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <li
                className="flex items-start gap-4 rounded-2xl border-2 border-line bg-surface-2 p-4 transition-colors hover:border-purple/60"
                key={feature.title}
              >
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-purple-press bg-purple text-on">
                  <Icon size={22} strokeWidth={2.5} />
                </span>
                <span>
                  <span className="block text-lg font-black text-ink">{feature.title}</span>
                  <span className="block text-[15px] font-semibold leading-6 text-ink-2">{feature.text}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </Window>
    </Reveal>
  );
}
