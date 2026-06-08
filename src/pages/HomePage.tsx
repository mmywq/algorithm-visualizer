import { algorithmCatalog } from '@/config/algorithmCatalog';

interface HomePageProps {
  readonly navigate: (route: string) => void;
}

export function HomePage({ navigate }: HomePageProps) {
  return (
    <section className="w-full app-panel shadow-xl shadow-slate-950/10">
      <h1 className="text-4xl font-bold tracking-tight text-app-primary">Каталог алгоритмов</h1>
      <p className="mt-3 max-w-3xl text-app-muted">
        Выбери категорию и переходи на отдельную страницу алгоритма. Готовые страницы уже имеют плеер
        и визуализацию. Остальные страницы созданы как roadmap и будут заполняться поэтапно.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {algorithmCatalog.map((category) => (
          <article className="rounded-2xl border border-app bg-surface p-4" key={category.id}>
            <h2 className="text-xl font-semibold text-app-primary">{category.title}</h2>
            <p className="mt-1 text-sm text-app-muted">{category.description}</p>
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
