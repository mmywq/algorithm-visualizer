export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Загрузка" className="flex flex-col gap-4" role="status">
      <div className="skeleton h-9 w-2/3 max-w-md" />
      <div className="skeleton h-5 w-full max-w-xl" />
      <div className="mt-2 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="skeleton h-[340px] rounded-3xl" />
        <div className="hidden flex-col gap-4 lg:flex">
          <div className="skeleton h-40 rounded-3xl" />
          <div className="skeleton h-56 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
