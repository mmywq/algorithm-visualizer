import { useEffect, useMemo, useState } from 'react';
import { SortingVisualizer } from '@/components/visualizers/arrays/SortingVisualizer';
import { GraphTraversalVisualizer } from '@/components/visualizers/graphs/GraphTraversalVisualizer';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { algorithmCatalog } from '@/config/algorithmCatalog';
import { loadSettings, saveSettings } from '@/lib/storage';
import { HomePage } from '@/pages/HomePage';
import { StructuresPage } from '@/pages/StructuresPage';
import { PlannedAlgorithmPage } from '@/pages/PlannedAlgorithmPage';
import { useAlgorithmPlayerStore } from '@/stores';

const getInitialRoute = (): string => window.location.hash.replace('#', '') || '/';

function App() {
  const settings = useMemo(() => loadSettings(), []);
  const [route, setRoute] = useState<string>(getInitialRoute());
  const setPlaybackSpeed = useAlgorithmPlayerStore((state) => state.setPlaybackSpeed);

  useEffect(() => {
    setPlaybackSpeed(settings.playbackSpeedMs);
  }, [setPlaybackSpeed, settings.playbackSpeedMs]);

  useEffect(() => {
    const onHashChange = () => {
      setRoute(getInitialRoute());
    };

    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  const navigate = (nextRoute: string): void => {
    window.location.hash = nextRoute;
  };

  useEffect(() => {
    const currentSettings = loadSettings();
    saveSettings({ ...currentSettings, mode: route.includes('/graphs') ? 'graphs' : 'arrays' });
  }, [route]);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <SiteHeader navigate={navigate} />
      {renderRoute(route, navigate, settings)}
    </main>
  );
}

const renderRoute = (
  route: string,
  navigate: (nextRoute: string) => void,
  settings: ReturnType<typeof loadSettings>,
) => {
  if (route === '/') {
    return <HomePage navigate={navigate} />;
  }

  if (route === '/sorting/player') {
    return <SortingVisualizer defaultValues={settings.lastArrayValues} />;
  }


  if (route === '/structures/player') {
    return <StructuresPage />;
  }

  if (route === '/graphs/traversal') {
    return <GraphTraversalVisualizer defaultStartNodeId={settings.lastGraphStartNodeId} />;
  }

  const plannedItem = algorithmCatalog
    .flatMap((category) => category.items)
    .find((item) => item.route === route);

  if (plannedItem !== undefined) {
    return <PlannedAlgorithmPage navigate={navigate} title={plannedItem.name} />;
  }

  return <PlannedAlgorithmPage navigate={navigate} title="Страница не найдена" />;
};

export default App;
