import { useEffect, useState, type ChangeEvent } from 'react';
import { bfs, dfs } from '@/algorithms/graphs';
import { PlayerControls } from '@/components/player/PlayerControls';
import { loadGraphPresets, loadSettings, saveGraphPreset, saveSettings } from '@/lib/storage';
import { useAlgorithmPlayerStore } from '@/stores';
import type { AlgorithmFrame, GraphAlgorithmFrame, GraphSnapshot, NodeId } from '@/types';
import { GraphVisualizer } from './GraphVisualizer';

type GraphAlgorithmKey = 'bfs' | 'dfs';

const algorithmLabels: Record<GraphAlgorithmKey, string> = {
  bfs: 'BFS',
  dfs: 'DFS',
};

const baseGraph: GraphSnapshot = {
  nodes: [
    { id: 'A', label: 'A', position: { x: 0, y: 120 }, payload: {} },
    { id: 'B', label: 'B', position: { x: 180, y: 20 }, payload: {} },
    { id: 'C', label: 'C', position: { x: 180, y: 220 }, payload: {} },
    { id: 'D', label: 'D', position: { x: 380, y: 20 }, payload: {} },
    { id: 'E', label: 'E', position: { x: 380, y: 220 }, payload: {} },
    { id: 'F', label: 'F', position: { x: 580, y: 120 }, payload: {} },
  ],
  edges: [
    { id: 'A-B', source: 'A', target: 'B', directed: false, payload: {} },
    { id: 'A-C', source: 'A', target: 'C', directed: false, payload: {} },
    { id: 'B-D', source: 'B', target: 'D', directed: false, payload: {} },
    { id: 'C-E', source: 'C', target: 'E', directed: false, payload: {} },
    { id: 'D-F', source: 'D', target: 'F', directed: false, payload: {} },
    { id: 'E-F', source: 'E', target: 'F', directed: false, payload: {} },
    { id: 'B-E', source: 'B', target: 'E', directed: false, payload: {} },
  ],
};

interface GraphTraversalVisualizerProps {
  readonly defaultStartNodeId?: NodeId;
}

export function GraphTraversalVisualizer({ defaultStartNodeId = 'A' }: GraphTraversalVisualizerProps) {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<GraphAlgorithmKey>('bfs');
  const [startNodeId, setStartNodeId] = useState<NodeId>(defaultStartNodeId);
  const [graph, setGraph] = useState<GraphSnapshot>(baseGraph);
  const [presets, setPresets] = useState(loadGraphPresets());

  const currentFrame = useAlgorithmPlayerStore((state) => state.currentFrame);
  const currentIndex = useAlgorithmPlayerStore((state) => state.currentIndex);
  const frames = useAlgorithmPlayerStore((state) => state.frames);
  const loadAlgorithm = useAlgorithmPlayerStore((state) => state.loadAlgorithm);
  const nextStep = useAlgorithmPlayerStore((state) => state.nextStep);
  const pause = useAlgorithmPlayerStore((state) => state.pause);
  const play = useAlgorithmPlayerStore((state) => state.play);
  const playbackSpeedMs = useAlgorithmPlayerStore((state) => state.playbackSpeedMs);
  const prevStep = useAlgorithmPlayerStore((state) => state.prevStep);
  const setPlaybackSpeed = useAlgorithmPlayerStore((state) => state.setPlaybackSpeed);
  const status = useAlgorithmPlayerStore((state) => state.status);

  const graphFrame = isGraphAlgorithmFrame(currentFrame) ? currentFrame : null;

  useEffect(() => {
    loadGraphAlgorithm(selectedAlgorithm, graph, startNodeId, loadAlgorithm);
    const settings = loadSettings();
    saveSettings({ ...settings, lastGraphStartNodeId: startNodeId, playbackSpeedMs });
  }, [graph, loadAlgorithm, playbackSpeedMs, selectedAlgorithm, startNodeId]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-violet-300">Step 6</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">UI для графов</h1>
          </div>

          <div className="flex flex-wrap gap-2">
            {(['bfs', 'dfs'] as const).map((algorithmKey) => (
              <button
                className={
                  algorithmKey === selectedAlgorithm
                    ? 'control-button control-button-primary'
                    : 'control-button'
                }
                key={algorithmKey}
                onClick={() => setSelectedAlgorithm(algorithmKey)}
                type="button"
              >
                {algorithmLabels[algorithmKey]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center">
          <label className="block max-w-xs text-sm text-slate-300">
            Стартовая вершина
            <select
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition focus:border-violet-400"
              onChange={(event: ChangeEvent<HTMLSelectElement>) => setStartNodeId(event.target.value)}
              value={startNodeId}
            >
              {graph.nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              className="control-button"
              onClick={() => {
                saveGraphPreset(`Graph ${new Date().toLocaleTimeString()}`, graph);
                setPresets(loadGraphPresets());
              }}
              type="button"
            >
              Сохранить пресет
            </button>
          </div>
        </div>

        {presets.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {presets.slice(0, 5).map((preset) => (
              <button className="control-button" key={preset.id} onClick={() => setGraph(preset.graph)} type="button">
                {preset.name}
              </button>
            ))}
          </div>
        )}
      </section>

      <GraphVisualizer frame={graphFrame} graph={graph} />

      <PlayerControls
        canStepBackward={currentIndex > 0}
        canStepForward={status !== 'completed'}
        currentIndex={currentIndex}
        onNextStep={nextStep}
        onPause={pause}
        onPlay={play}
        onPrevStep={prevStep}
        onReset={() => loadGraphAlgorithm(selectedAlgorithm, graph, startNodeId, loadAlgorithm)}
        onSpeedChange={setPlaybackSpeed}
        playbackSpeedMs={playbackSpeedMs}
        status={status}
        totalFrames={frames.length}
      />
    </div>
  );
}

const loadGraphAlgorithm = (
  algorithmKey: GraphAlgorithmKey,
  graph: GraphSnapshot,
  startNodeId: NodeId,
  loadAlgorithm: ReturnType<typeof useAlgorithmPlayerStore.getState>['loadAlgorithm'],
): void => {
  const generator = algorithmKey === 'bfs' ? bfs({ graph, startNodeId }) : dfs({ graph, startNodeId });
  loadAlgorithm(generator);
};

const isGraphAlgorithmFrame = (
  frame: AlgorithmFrame<unknown, Record<string, unknown>> | null,
): frame is GraphAlgorithmFrame =>
  frame?.domain === 'graph' &&
  typeof frame.data === 'object' &&
  frame.data !== null &&
  'nodes' in frame.data &&
  'edges' in frame.data;
