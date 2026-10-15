import { GraduationCap, LayoutGrid, LogIn, LogOut, Moon, Search, Settings, Sun, UserRound } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { Logo } from '@/components/ui/Logo';
import { Menu } from '@/components/ui/Menu';
import { useAuthStore } from '@/features/auth/authStore';
import { resolveTheme, useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
import { useUserStore } from '@/stores/userStore';
import { StatsChips } from './StatsChips';

const navItems = [
  { to: '/catalog', label: 'Каталог' },
  { to: '/cabinet', label: 'Мой прогресс' },
  { to: '/for-schools', label: 'Для преподавателей' },
] as const;

export function SiteHeader() {
  const navigate = useNavigate();
  const setPaletteOpen = useUiStore((state) => state.setPaletteOpen);
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const profile = useUserStore((state) => state.data.profile);
  const authStatus = useAuthStore((state) => state.status);
  const authUser = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const dark = resolveTheme(theme) === 'dark';
  const displayName = profile.name.length > 0 ? profile.name : (authUser?.name ?? '');

  return (
    <header className="sticky top-0 z-50 border-b-2 border-line-strong bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-2 px-3 sm:gap-3 sm:px-6">
        <Link aria-label="На главную" className="mr-1 shrink-0 rounded-xl" to="/">
          <Logo />
        </Link>

        <nav aria-label="Основная навигация" className="ml-4 hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <NavLink
              className={({ isActive }) =>
                `relative rounded-xl px-3.5 py-2 text-[15px] font-extrabold transition-colors ${isActive ? 'bg-brand/14 text-brand' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'}`
              }
              key={item.to}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <button
            aria-label="Поиск алгоритмов"
            className="hidden h-10 w-52 items-center gap-2 rounded-xl border-2 border-line-strong bg-surface-2 px-3 text-[15px] font-bold text-ink-3 transition-colors hover:border-brand/60 hover:text-ink-2 md:flex xl:w-60"
            onClick={() => setPaletteOpen(true)}
            type="button"
          >
            <Search size={18} strokeWidth={2.5} />
            <span className="flex-1 text-left">Найти алгоритм</span>
            <span className="kbd">Ctrl K</span>
          </button>
          <button aria-label="Поиск" className="btn btn-ghost btn-icon hidden sm:inline-flex md:hidden" onClick={() => setPaletteOpen(true)} type="button">
            <Search size={22} strokeWidth={2.5} />
          </button>

          <StatsChips />

          <button
            aria-label={dark ? 'Светлая тема' : 'Тёмная тема'}
            className="btn btn-ghost btn-icon hidden sm:inline-flex"
            onClick={() => setTheme(dark ? 'light' : 'dark')}
            title={dark ? 'Светлая тема' : 'Тёмная тема'}
            type="button"
          >
            {dark ? <Sun size={20} strokeWidth={2.5} /> : <Moon size={20} strokeWidth={2.5} />}
          </button>

          <Menu
            header={
              <div className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5">
                <Avatar avatar={profile.avatar} name={displayName} size={40} />
                <div className="min-w-0">
                  <p className="truncate font-black text-ink">{displayName.length > 0 ? displayName : 'Гость'}</p>
                  <p className="truncate text-sm font-semibold text-ink-3">
                    {authStatus === 'signed-in' ? authUser?.email : authStatus === 'disabled' ? 'Прогресс хранится на этом устройстве' : 'Вход не выполнен'}
                  </p>
                </div>
              </div>
            }
            items={[
              { key: 'cabinet', label: 'Личный кабинет', icon: <UserRound size={18} strokeWidth={2.5} />, onSelect: () => navigate('/cabinet') },
              { key: 'catalog', label: 'Каталог', icon: <LayoutGrid size={18} strokeWidth={2.5} />, onSelect: () => navigate('/catalog') },
              { key: 'schools', label: 'Для преподавателей', icon: <GraduationCap size={18} strokeWidth={2.5} />, onSelect: () => navigate('/for-schools') },
              { key: 'settings', label: 'Настройки', icon: <Settings size={18} strokeWidth={2.5} />, onSelect: () => navigate('/settings') },
              'divider',
              authStatus === 'signed-in'
                ? { key: 'logout', label: 'Выйти', icon: <LogOut size={18} strokeWidth={2.5} />, onSelect: () => void signOut(), danger: true }
                : authStatus === 'signed-out'
                  ? { key: 'login', label: 'Войти или зарегистрироваться', icon: <LogIn size={18} strokeWidth={2.5} />, onSelect: () => navigate('/login') }
                  : {
                      key: 'theme',
                      label: dark ? 'Светлая тема' : 'Тёмная тема',
                      icon: dark ? <Sun size={18} strokeWidth={2.5} /> : <Moon size={18} strokeWidth={2.5} />,
                      onSelect: () => setTheme(dark ? 'light' : 'dark'),
                    },
            ]}
            trigger={({ toggle, open }) => (
              <button
                aria-expanded={open}
                aria-haspopup="menu"
                aria-label="Меню профиля"
                className="rounded-full p-0.5 transition-transform active:scale-95"
                onClick={toggle}
                type="button"
              >
                <Avatar avatar={profile.avatar} name={displayName} />
              </button>
            )}
            width={280}
          />
        </div>
      </div>
    </header>
  );
}
