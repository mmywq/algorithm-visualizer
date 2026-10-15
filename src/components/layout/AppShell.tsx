import { motion } from 'framer-motion';
import { Suspense, useEffect } from 'react';
import { Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { BackgroundFX } from '@/components/fx/BackgroundFX';
import { SideScenery } from '@/components/fx/SideScenery';
import { WalkingCat } from '@/components/mascot/WalkingCat';
import { Toaster } from '@/components/ui/Toaster';
import { findEntryByPath } from '@/content/catalog';
import { useAuthStore } from '@/features/auth/authStore';
import { SyncController } from '@/features/sync/SyncController';
import { AchievementWatcher } from './AchievementWatcher';
import { CommandPalette } from './CommandPalette';
import { CookieBanner } from './CookieBanner';
import { LevelUpWatcher } from './LevelUpWatcher';
import { MobileNav } from './MobileNav';
import { OfflineBanner } from './OfflineBanner';
import { PageSkeleton } from './PageSkeleton';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

export function AppShell() {
  const location = useLocation();
  const [params] = useSearchParams();
  const embed = params.get('embed') === '1';
  const isAlgorithmPage = findEntryByPath(location.pathname) !== undefined;

  useEffect(() => {
    void useAuthStore.getState().init();
  }, []);

  useEffect(() => {
    if (location.hash.length === 0) window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname, location.hash]);

  if (embed) {
    return (
      <main className="min-h-screen bg-bg p-3 sm:p-4" id="main">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
        <Toaster />
      </main>
    );
  }

  return (
    <>
      <a className="sr-only left-3 top-3 z-[100] rounded-xl bg-brand px-4 py-2 font-bold text-on focus:not-sr-only focus:fixed" href="#main">
        Перейти к содержимому
      </a>
      <BackgroundFX />
      <SideScenery />
      <SiteHeader />
      <OfflineBanner />
      <main className={`mx-auto w-full max-w-[1320px] px-4 pt-5 sm:px-6 sm:pt-7 ${isAlgorithmPage ? 'pb-6' : 'pb-24 lg:pb-8'}`} id="main">
        <Suspense fallback={<PageSkeleton />}>
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 10 }}
            key={location.pathname}
            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <Outlet />
          </motion.div>
        </Suspense>
      </main>
      <div className={isAlgorithmPage ? 'hidden lg:block' : 'pb-20 lg:pb-0'}>
        <SiteFooter />
      </div>
      {!isAlgorithmPage && <MobileNav />}
      <CommandPalette />
      <Toaster />
      <AchievementWatcher />
      <LevelUpWatcher />
      <CookieBanner />
      <SyncController />
      <WalkingCat />
    </>
  );
}
