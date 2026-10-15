import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { brand } from '@/config/brand';
import { useConsentStore } from '@/stores/consentStore';

const COOKIE = ['..OOOO..', '.OccccO.', 'OcdcccdO', 'OccccccO', 'OcccdccO', 'OdccccdO', '.OccccO.', '..OOOO..'];
const cookieColors: Record<string, string> = { O: '#3E1A3F', c: '#F2B36B', d: '#7A3E1D' };

function PixelCookie() {
  return (
    <svg aria-hidden="true" className="pixelated h-12 w-12 shrink-0 fx-float" style={{ '--dur': '3s' } as React.CSSProperties} viewBox="0 0 8 8">
      {COOKIE.flatMap((row, y) =>
        [...row].map((char, x) => (char === '.' ? null : <rect fill={cookieColors[char]} height={1.04} key={`${x}-${y}`} width={1.04} x={x} y={y} />)),
      )}
    </svg>
  );
}

/** Плашка согласия на cookie: показывается один раз, пока пользователь не выберет вариант. */
export function CookieBanner() {
  const choice = useConsentStore((state) => state.choice);
  const decide = useConsentStore((state) => state.decide);
  const year = new Date().getFullYear();

  return (
    <AnimatePresence>
      {choice === null && (
        <motion.aside
          animate={{ opacity: 1, y: 0 }}
          aria-label="Согласие на использование cookie"
          className="window no-print fixed inset-x-3 bottom-[calc(84px+env(safe-area-inset-bottom))] z-[75] mx-auto max-w-xl shadow-float lg:bottom-5 lg:left-5 lg:right-auto lg:mx-0"
          exit={{ opacity: 0, y: 24 }}
          initial={{ opacity: 0, y: 24 }}
          role="dialog"
          transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.6 }}
        >
          <div className="window-bar" style={{ '--cat': 'var(--c-yellow)' } as React.CSSProperties}>
            <span className="window-title">cookie.exe</span>
            <span className="window-dots">
              <span className="bg-brand" />
              <span className="bg-yellow" />
              <span className="bg-green" />
            </span>
          </div>
          <div className="flex gap-4 p-4 sm:p-5">
            <PixelCookie />
            <div className="min-w-0">
              <p className="text-[15px] font-semibold leading-6 text-ink-2">
                Мы используем cookie и хранилище браузера, чтобы сохранять ваш прогресс, настройки и вход в аккаунт. Необязательные cookie для статистики
                включаются только с вашего согласия. Подробнее — в{' '}
                <Link className="link" to="/privacy">
                  политике конфиденциальности
                </Link>
                .
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="btn btn-primary btn-sm" onClick={() => decide('all')} type="button">
                  Принять все
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => decide('necessary')} type="button">
                  Только необходимые
                </button>
              </div>
              <p className="mt-3 font-display text-[16px] leading-none text-ink-3">
                © {year} {brand.name}
              </p>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
