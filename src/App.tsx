import { useState } from 'react';
import { SortingVisualizer } from '@/components/visualizers/arrays/SortingVisualizer';
import { GraphTraversalVisualizer } from '@/components/visualizers/graphs/GraphTraversalVisualizer';

type VisualizerMode = 'arrays' | 'graphs';

function App() {
  const [mode, setMode] = useState<VisualizerMode>('arrays');

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto mb-6 flex max-w-6xl flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-2">
        <button
          className={mode === 'arrays' ? 'control-button control-button-primary' : 'control-button'}
          onClick={() => setMode('arrays')}
          type="button"
        >
          Сортировки
        </button>
        <button
          className={mode === 'graphs' ? 'control-button control-button-primary' : 'control-button'}
          onClick={() => setMode('graphs')}
          type="button"
        >
          Графы
        </button>
      </div>

      {mode === 'arrays' ? <SortingVisualizer /> : <GraphTraversalVisualizer />}
    </main>
  );
}

export default App;
