import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CatSays } from '@/components/mascot/CatSays';
import { PixelCat } from '@/components/mascot/PixelCat';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useUiStore } from '@/stores/uiStore';

export default function NotFoundPage() {
  usePageMeta({ title: 'Страница не найдена', noindex: true });
  const setPaletteOpen = useUiStore((state) => state.setPaletteOpen);

  return (
    <div className="flex flex-col items-center py-10 text-center sm:py-16">
      <p className="h-display-xl text-brand">404</p>
      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
        <PixelCat pose="sleep" size={130} />
        <CatSays className="max-w-xs text-left" tail="left" text="Мур… Здесь ничего нет. Наверное, страница переехала или в адресе опечатка." />
      </div>
      <h1 className="h-section mt-10">Страница потерялась</h1>
      <p className="mt-3 max-w-md text-[17px] font-semibold leading-7 text-ink-2">
        Найдите нужный алгоритм поиском или начните с главной — прогресс никуда не делся.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button className="btn btn-primary btn-lg" onClick={() => setPaletteOpen(true)} type="button">
          <Search size={20} strokeWidth={2.5} />
          Найти алгоритм
        </button>
        <Link className="btn btn-secondary btn-lg" to="/">
          На главную
        </Link>
      </div>
    </div>
  );
}
