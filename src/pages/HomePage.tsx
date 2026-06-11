import { algorithmCatalog } from '@/config/algorithmCatalog';

interface HomePageProps {
  readonly navigate: (route: string) => void;
}

const heroBars = [34, 58, 22, 76, 41, 90, 50, 67] as const;
const heroBarColors = ['#475569', '#06b6d4', '#475569', '#8b5cf6', '#475569', '#10b981', '#475569', '#475569'] as const;

const learningFeatures = [
  {
    title: 'Свои данные',
    text: 'Каждая демонстрация принимает собственные значения: ручной ввод, случайная генерация и сохраняемые пресеты с переименованием.',
  },
  {
    title: 'Пошаговая анимация',
    text: 'Алгоритм выполняется по шагам с цветовой подсветкой: видно, что сравнивается, что перемещается и что уже готово. Скорость и направление управляются плеером.',
  },
  {
    title: 'Теория и псевдокод',
    text: 'У каждого раздела — теория со свойствами и терминами, таблица сложности и псевдокод, строки которого подсвечиваются синхронно с анимацией.',
  },
  {
    title: 'Результат с числами',
    text: 'После выполнения выводится итог: что получилось, сколько операций потребовалось, и полный журнал шагов с конкретными значениями.',
  },
] as const;

const popularDemos = [
  { label: 'Сравнение 6 сортировок', note: 'один массив — шесть алгоритмов', route: '/sorting/compare' },
  { label: 'Поиск в ширину и в глубину', note: 'очередь против стека на графе', route: '/graphs/traversal' },
  { label: 'Двоичное дерево поиска', note: 'построение и путь поиска ключа', route: '/trees/bst' },
  { label: 'Алгоритм Дейкстры', note: 'кратчайшие пути с таблицей расстояний', route: '/graphs/dijkstra' },
] as const;

export function HomePage({ navigate }: HomePageProps) {
  const totalAlgorithms = algorithmCatalog.reduce((sum, category) => sum + category.items.length, 0);

  return (
    <div className="flex w-full flex-col gap-6">
      <section className="app-panel overflow-hidden shadow-xl shadow-slate-950/10">
        <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent">Учебное наглядное пособие</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-app-primary">
              Алгоритмы и структуры данных — по шагам и на ваших данных
            </h1>
            <p className="mt-4 text-base leading-7 text-app-muted">
              Интерактивная среда для изучения классических алгоритмов: {totalAlgorithms} демонстраций в {algorithmCatalog.length} разделах —
              от стека и очереди до хеш-таблиц, куч и алгоритмов на графах. Каждая страница объединяет теорию,
              псевдокод, анимацию и разбор результата в один учебный сценарий.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button className="control-button control-button-primary" onClick={() => navigate('/sorting/compare')} type="button">
                Сравнить 6 сортировок
              </button>
              <button className="control-button" onClick={() => navigate('/graphs/traversal')} type="button">
                Обойти граф
              </button>
              <button className="control-button" onClick={() => navigate('/trees/bst')} type="button">
                Построить дерево поиска
              </button>
            </div>
          </div>

          <div aria-hidden="true" className="hidden shrink-0 items-end gap-2 self-end pb-1 lg:flex">
            {heroBars.map((height, index) => (
              <div
                className="w-9 rounded-t-lg border border-white/10"
                key={index}
                style={{ background: heroBarColors[index], height: `${height * 2}px`, opacity: 0.9 }}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {learningFeatures.map((feature) => (
          <article className="app-panel" key={feature.title}>
            <h2 className="text-lg font-semibold text-app-primary">{feature.title}</h2>
            <p className="mt-2 text-sm leading-6 text-app-muted">{feature.text}</p>
          </article>
        ))}
      </section>

      <section className="app-panel">
        <h2 className="text-2xl font-bold text-app-primary">С чего начать</h2>
        <p className="mt-2 text-sm text-app-muted">Демонстрации, которые быстрее всего показывают, как устроен сайт.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {popularDemos.map((demo) => (
            <button
              className="rounded-2xl border border-app bg-surface p-4 text-left transition hover:border-accent/60"
              key={demo.route}
              onClick={() => navigate(demo.route)}
              type="button"
            >
              <p className="font-semibold text-app-primary">{demo.label}</p>
              <p className="mt-1 text-sm text-app-muted">{demo.note}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="app-panel">
        <h2 className="text-2xl font-bold text-app-primary">Каталог разделов</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {algorithmCatalog.map((category) => (
            <article className="rounded-2xl border border-app bg-surface p-5" key={category.id}>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-xl font-semibold text-app-primary">{category.title}</h3>
                <span className="shrink-0 rounded-full border border-app px-2.5 py-0.5 text-xs text-app-muted">{category.items.length}</span>
              </div>
              <p className="mt-1 text-sm text-app-muted">{category.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {category.items.map((item) => (
                  <button
                    className="control-button"
                    key={item.id}
                    onClick={() => navigate(item.route)}
                    type="button"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
