import { motion } from 'framer-motion';
import { GraduationCap, House, LayoutGrid, Search, UserRound, type LucideIcon } from 'lucide-react';
import { Fragment } from 'react';
import { NavLink } from 'react-router-dom';
import { spring } from '@/lib/motion';
import { useUiStore } from '@/stores/uiStore';

const items = [
  { to: '/', label: 'Главная', icon: House, end: true },
  { to: '/catalog', label: 'Каталог', icon: LayoutGrid, end: false },
  { to: '/cabinet', label: 'Прогресс', icon: UserRound, end: false },
  { to: '/for-schools', label: 'Учителям', icon: GraduationCap, end: false },
] as const;

function NavIcon({ icon: Icon, active }: { readonly icon: LucideIcon; readonly active: boolean }) {
  return (
    <span className="relative inline-flex h-8 w-14 items-center justify-center">
      {active && (
        <motion.span
          className="absolute inset-0 rounded-full"
          layoutId="mobile-nav-pill"
          style={{ background: 'rgb(var(--c-brand) / 0.16)' }}
          transition={spring.snappy}
        />
      )}
      <Icon className={`relative ${active ? 'text-brand' : 'text-ink-3'}`} size={22} strokeWidth={active ? 2.75 : 2.25} />
    </span>
  );
}

/** Нижняя панель навигации на телефоне: разделы и поиск, крупные зоны нажатия. */
export function MobileNav() {
  const setPaletteOpen = useUiStore((state) => state.setPaletteOpen);

  return (
    <nav
      aria-label="Навигация"
      data-cat-floor=""
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-line-strong bg-surface/95 backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-1 pb-[calc(6px+env(safe-area-inset-bottom))] pt-1.5">
        {items.map((item, index) => (
          <Fragment key={item.to}>
            {index === 2 && (
              <li className="flex-1 sm:hidden">
                <button className="flex w-full flex-col items-center gap-0.5 rounded-2xl py-1.5" onClick={() => setPaletteOpen(true)} type="button">
                  <NavIcon active={false} icon={Search} />
                  <span className="text-[12px] font-extrabold text-ink-3">Поиск</span>
                </button>
              </li>
            )}
            <li className="flex-1">
              <NavLink className="flex flex-col items-center gap-0.5 rounded-2xl py-1.5" end={item.end} to={item.to}>
                {({ isActive }) => (
                  <>
                    <NavIcon active={isActive} icon={item.icon} />
                    <span className={`text-[12px] font-extrabold ${isActive ? 'text-brand' : 'text-ink-3'}`}>{item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          </Fragment>
        ))}
      </ul>
    </nav>
  );
}
