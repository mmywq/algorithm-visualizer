import { algorithmCatalog } from '@/config/algorithmCatalog';

interface HomePageProps {
  readonly navigate: (route: string) => void;
}

export function HomePage({ navigate }: HomePageProps) {
  return (
    <section className="mx-auto w-full max-w-6xl rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/20">
      <h1 className="text-4xl font-bold tracking-tight text-white">Каталог алгоритмов</h1>
      <p className="mt-3 max-w-3xl text-slate-300">
        Выбери категорию и переходи на отдельную страницу алгоритма. Готовые страницы уже имеют плеер
        и визуализацию. Остальные страницы созданы как roadmap и будут заполняться поэтапно.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {algorithmCatalog.map((category) => (
          <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4" key={category.id}>
            <h2 className="text-xl font-semibold text-slate-100">{category.title}</h2>
            <p className="mt-1 text-sm text-slate-400">{category.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {category.items.map((item) => (
                <button
                  className={item.status === 'ready' ? 'control-button control-button-primary' : 'control-button'}
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
  );
}
