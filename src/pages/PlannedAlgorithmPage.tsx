interface PlannedAlgorithmPageProps {
  readonly title: string;
  readonly navigate: (route: string) => void;
}

export function PlannedAlgorithmPage({ title, navigate }: PlannedAlgorithmPageProps) {
  return (
    <section className="mx-auto w-full max-w-4xl rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
      <p className="text-xs uppercase tracking-[0.22em] text-amber-300">Roadmap</p>
      <h1 className="mt-2 text-3xl font-bold text-white">{title}</h1>
      <p className="mt-3 text-slate-300">
        Страница создана. На следующем этапе добавим отдельный генератор, псевдокод, визуализацию структуры
        и интеграцию с общим плеером.
      </p>
      <button className="control-button mt-5" onClick={() => navigate('/')} type="button">
        Назад к каталогу
      </button>
    </section>
  );
}
