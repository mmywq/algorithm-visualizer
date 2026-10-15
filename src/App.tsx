import { MotionConfig } from 'framer-motion';
import { lazy } from 'react';
import { createBrowserRouter, Navigate, RouterProvider, useLocation } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ThemeController } from '@/components/layout/ThemeController';
import { findEntryByPath, findLegacyEntry } from '@/content/catalog';
import { RouteError } from '@/pages/RouteError';
import { useSettingsStore } from '@/stores/settingsStore';

const HomePage = lazy(() => import('@/pages/HomePage'));
const CatalogPage = lazy(() => import('@/pages/CatalogPage'));
const AlgorithmRoute = lazy(() => import('@/features/algorithm/AlgorithmRoute'));
const CabinetPage = lazy(() => import('@/pages/cabinet/CabinetPage'));
const ClassPage = lazy(() => import('@/pages/cabinet/ClassPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const AuthCallbackPage = lazy(() => import('@/pages/auth/AuthCallbackPage'));
const JoinClassPage = lazy(() => import('@/pages/cabinet/JoinClassPage'));
const SchoolsPage = lazy(() => import('@/pages/SchoolsPage'));
const LegalPage = lazy(() => import('@/pages/LegalPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const DesignPreviewPage = lazy(() => import('@/pages/DesignPreviewPage'));

/** Всё, что не совпало с явными маршрутами: страница алгоритма, старый адрес или 404. */
function CatchAll() {
  const location = useLocation();
  const entry = findEntryByPath(location.pathname);
  if (entry !== undefined) return <AlgorithmRoute entry={entry} key={entry.id} />;
  const legacy = findLegacyEntry(location.pathname);
  if (legacy !== undefined) return <Navigate replace to={{ pathname: legacy.path, search: location.search }} />;
  return <NotFoundPage />;
}

const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'catalog', element: <CatalogPage /> },
      { path: 'cabinet', element: <CabinetPage /> },
      { path: 'cabinet/classes/:classId', element: <ClassPage /> },
      { path: 'join/:code', element: <JoinClassPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'auth/callback', element: <AuthCallbackPage /> },
      { path: 'for-schools', element: <SchoolsPage /> },
      { path: 'privacy', element: <LegalPage kind="privacy" /> },
      { path: 'terms', element: <LegalPage kind="terms" /> },
      ...(import.meta.env.DEV ? [{ path: '__design', element: <DesignPreviewPage /> }] : []),
      { path: '*', element: <CatchAll /> },
    ],
  },
]);

const motionMode = { system: 'user', reduce: 'always', full: 'never' } as const;

export default function App() {
  const motion = useSettingsStore((state) => state.motion);
  return (
    <MotionConfig reducedMotion={motionMode[motion]}>
      <ThemeController />
      <RouterProvider router={router} />
    </MotionConfig>
  );
}
