import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MASCOT_NAME, PixelCat } from '@/components/mascot/PixelCat';
import { useMotionAllowed } from '@/components/mascot/WalkingCat';
import { Logo } from '@/components/ui/Logo';
import { brand } from '@/config/brand';
import { catalog, categories } from '@/content/catalog';
import { useConsentStore } from '@/stores/consentStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUserStore } from '@/stores/userStore';

const linkClass = 'font-semibold text-ink-2 transition-colors hover:text-brand';

export function SiteFooter() {
  const year = new Date().getFullYear();
  const reopenConsent = useConsentStore((state) => state.reopen);
  const petCat = useUserStore((state) => state.petCat);
  const pets = useUserStore((state) => state.data.counters.pets ?? 0);
  const [awake, setAwake] = useState(false);
  // если Кэш гуляет по экрану, второй кот в подвале не нужен
  const catWalks = useSettingsStore((state) => state.catWalks);
  const motionAllowed = useMotionAllowed();
  const showCat = !catWalks || !motionAllowed;

  return (
    <footer className="relative mt-24 border-t-2 border-line-strong bg-surface">
      {/* Кэш дремлет на кромке подвала; если погладить — проснётся и обрадуется */}
      {showCat && (
        <div className="absolute -top-[76px] right-9 sm:right-16" onMouseEnter={() => setAwake(true)} onMouseLeave={() => setAwake(false)}>
          <PixelCat interactive label={`${MASCOT_NAME} — маскот. Погладьте его!`} onPet={petCat} pose={awake ? 'sit' : 'sleep'} size={78} />
          {pets > 0 && (
            <span className="tag absolute -left-3 -top-2 border-brand bg-surface text-brand" title="Сколько раз вы погладили Кэша">
              ♥ {pets}
            </span>
          )}
        </div>
      )}

      <div className="mx-auto grid max-w-[1320px] grid-cols-1 gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_2fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-[15px] font-semibold leading-6 text-ink-2">{brand.description}</p>
          <p className="tag mt-5 border-line-strong text-ink-2">
            {catalog.length} ДЕМО · {categories.length} РАЗДЕЛОВ
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          <nav aria-label="Разделы">
            <p className="font-display text-[16px] text-ink">Разделы</p>
            <ul className="mt-3 space-y-2 text-[15px]">
              {categories.slice(0, 5).map((category) => (
                <li key={category.id}>
                  <Link className={linkClass} to={`/catalog?c=${category.id}`}>
                    {category.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Ещё разделы">
            <p className="font-display text-[16px] text-ink">&nbsp;</p>
            <ul className="mt-3 space-y-2 text-[15px]">
              {categories.slice(5).map((category) => (
                <li key={category.id}>
                  <Link className={linkClass} to={`/catalog?c=${category.id}`}>
                    {category.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Продукт">
            <p className="font-display text-[16px] text-ink">Продукт</p>
            <ul className="mt-3 space-y-2 text-[15px]">
              <li>
                <Link className={linkClass} to="/for-schools">
                  Для учебных заведений
                </Link>
              </li>
              <li>
                <Link className={linkClass} to="/cabinet">
                  Личный кабинет
                </Link>
              </li>
              <li>
                <Link className={linkClass} to="/settings">
                  Настройки
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <div className="border-t-2 border-line">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-4 py-5 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="font-display text-[16px] text-ink-3">
            © {year} {brand.legalEntity.length > 0 ? brand.legalEntity : brand.name}
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li>
              <Link className={linkClass} to="/privacy">
                Политика конфиденциальности
              </Link>
            </li>
            <li>
              <Link className={linkClass} to="/terms">
                Условия использования
              </Link>
            </li>
            <li>
              <button className={linkClass} onClick={reopenConsent} type="button">
                Настройки cookie
              </button>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
