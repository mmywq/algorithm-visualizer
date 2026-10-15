import { Monitor, Moon, Sun } from 'lucide-react';
import type { ReactNode } from 'react';
import { PixelCat } from '@/components/mascot/PixelCat';
import { Switch } from '@/components/ui/Switch';
import { Window } from '@/components/ui/Window';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useConsentStore } from '@/stores/consentStore';
import { SPEED_OPTIONS, useSettingsStore, type MotionPreference, type ThemePreference } from '@/stores/settingsStore';
import { AccountCard } from './cabinet/AccountCard';

function Choice<T extends string>({
  value,
  current,
  onSelect,
  children,
}: {
  readonly value: T;
  readonly current: T;
  readonly onSelect: (value: T) => void;
  readonly children: ReactNode;
}) {
  const active = value === current;
  return (
    <button
      aria-pressed={active}
      className={`flex flex-1 flex-col items-center gap-2 rounded-2xl border-2 px-4 py-4 text-[15px] font-extrabold transition-colors ${
        active ? 'border-brand bg-brand/12 text-ink' : 'border-line bg-surface-2 text-ink-2 hover:border-line-strong hover:text-ink'
      }`}
      onClick={() => onSelect(value)}
      type="button"
    >
      {children}
    </button>
  );
}

const themes: readonly { value: ThemePreference; label: string; icon: ReactNode }[] = [
  { value: 'dark', label: 'Ночная', icon: <Moon size={22} strokeWidth={2.5} /> },
  { value: 'light', label: 'Дневная', icon: <Sun size={22} strokeWidth={2.5} /> },
  { value: 'system', label: 'Как в системе', icon: <Monitor size={22} strokeWidth={2.5} /> },
];

const motions: readonly { value: MotionPreference; label: string; hint: string }[] = [
  { value: 'system', label: 'Как в системе', hint: 'учитывает настройку «уменьшить движение»' },
  { value: 'full', label: 'Все анимации', hint: 'фон, кот, конфетти' },
  { value: 'reduce', label: 'Минимум', hint: 'без фоновых эффектов' },
];

export default function SettingsPage() {
  usePageMeta({ title: 'Настройки', noindex: true });
  const settings = useSettingsStore();
  const reopenConsent = useConsentStore((state) => state.reopen);
  const consent = useConsentStore((state) => state.choice);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="tag border-purple text-purple">НАСТРОЙКИ</p>
          <h1 className="h-display mt-4 text-ink">Под себя</h1>
        </div>
        <PixelCat className="hidden sm:inline-block" pose="sit" size={78} />
      </header>

      <Window bodyClassName="p-5 sm:p-6" color="purple" title="Оформление">
        <p className="label">Тема</p>
        <div className="flex gap-2">
          {themes.map((theme) => (
            <Choice current={settings.theme} key={theme.value} onSelect={settings.setTheme} value={theme.value}>
              {theme.icon}
              {theme.label}
            </Choice>
          ))}
        </div>
        <div className="mt-6 border-t-2 border-line pt-5">
          <Switch
            checked={settings.catWalks}
            description="Кэш гуляет по нижнему краю экрана, садится отдохнуть и иногда засыпает. Его можно погладить."
            label="Кэш гуляет по экрану"
            onChange={settings.setCatWalks}
          />
        </div>
        <p className="label mt-6">Анимации</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          {motions.map((motion) => (
            <Choice current={settings.motion} key={motion.value} onSelect={settings.setMotion} value={motion.value}>
              {motion.label}
              <span className="text-center text-[12px] font-bold text-ink-3">{motion.hint}</span>
            </Choice>
          ))}
        </div>
      </Window>

      <Window bodyClassName="p-5 sm:p-6" color="brand" title="Демонстрации">
        <p className="label">Скорость по умолчанию</p>
        <div className="flex flex-wrap gap-2">
          {SPEED_OPTIONS.map((speed) => (
            <button
              aria-pressed={settings.speed === speed}
              className={`btn btn-sm font-display text-[16px] ${settings.speed === speed ? 'btn-primary' : 'btn-secondary'}`}
              key={speed}
              onClick={() => settings.setSpeed(speed)}
              type="button"
            >
              {String(speed).replace('.', ',')}×
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm font-semibold text-ink-3">Скорость можно менять и прямо в плеере — клавишами + и −.</p>
      </Window>

      <Window bodyClassName="p-5 sm:p-6" color="yellow" title="Данные и конфиденциальность">
        <AccountCard />
        <div className="mt-6 border-t-2 border-line pt-5">
          <Switch
            checked={consent === 'all'}
            description="Обезличенная статистика посещений помогает улучшать демонстрации. Прогресс и настройки сохраняются в любом случае."
            label="Необязательные cookie"
            onChange={(checked) => useConsentStore.getState().decide(checked ? 'all' : 'necessary')}
          />
          <button className="link mt-4 text-sm" onClick={reopenConsent} type="button">
            Показать уведомление о cookie ещё раз
          </button>
        </div>
      </Window>
    </div>
  );
}
