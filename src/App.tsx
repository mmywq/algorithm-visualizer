import { useEffect, useMemo, useState } from 'react';
import { SortingVisualizer } from '@/components/visualizers/arrays/SortingVisualizer';
import { GraphTraversalVisualizer } from '@/components/visualizers/graphs/GraphTraversalVisualizer';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { algorithmCatalog } from '@/config/algorithmCatalog';
import { loadSettings, saveSettings } from '@/lib/storage';
import { HomePage } from '@/pages/HomePage';
import { StructuresPage } from '@/pages/StructuresPage';
import { PlannedAlgorithmPage } from '@/pages/PlannedAlgorithmPage';
import { AlgorithmPage, algorithmRouteRegistry } from '@/pages/AlgorithmPages';
import { useAlgorithmPlayerStore } from '@/stores';
import { useUiPreferencesStore } from '@/stores';

const getInitialRoute = (): string => window.location.hash.replace('#', '') || '/';

function App() {
  const settings = useMemo(() => loadSettings(), []);
  const [route, setRoute] = useState<string>(getInitialRoute());
  const setPlaybackSpeed = useAlgorithmPlayerStore((state) => state.setPlaybackSpeed);
  const theme = useUiPreferencesStore((state) => state.theme);

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
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  useEffect(() => {
    const currentSettings = loadSettings();
    saveSettings({
      ...currentSettings,
      theme,
      mode: route.includes('/graphs') ? 'graphs' : 'arrays',
      lastRoute: route,
    });
  }, [route, theme]);

  return (
    <main className="min-h-screen bg-app px-4 py-6 text-app-primary lg:px-6 lg:py-8">
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


  if (route === '/structures/stack-array') {
    return <StructuresPage initialDemo="stack-array" />;
  }

  if (route === '/structures/stack-list') {
    return <StructuresPage initialDemo="stack-list" />;
  }

  if (route === '/structures/queue-array') {
    return <StructuresPage initialDemo="queue-array" />;
  }

  if (route === '/structures/queue-list') {
    return <StructuresPage initialDemo="queue-list" />;
  }

  if (route === '/structures/indexing') {
    return <StructuresPage initialDemo="indexing" />;
  }


  if (route === '/graphs/traversal') {
    return <GraphTraversalVisualizer defaultStartNodeId={settings.lastGraphStartNodeId} />;
  }

  const configuredPage = algorithmRouteRegistry[route as keyof typeof algorithmRouteRegistry];

  if (configuredPage !== undefined) {
    return (
      <AlgorithmPage
        generatorFactory={configuredPage.generatorFactory}
        mode={configuredPage.mode}
        title={configuredPage.title}
      />
    );
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
