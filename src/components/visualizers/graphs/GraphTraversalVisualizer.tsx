import { useEffect, useState, type ChangeEvent } from 'react';
import { bfs, dfs } from '@/algorithms/graphs';
import { PlayerControls } from '@/components/player/PlayerControls';
import { loadGraphPresets, loadSettings, removeGraphPreset, saveGraphPreset, saveSettings } from '@/lib/storage';
import { useAlgorithmPlayerStore } from '@/stores';
import type { AlgorithmFrame, GraphAlgorithmFrame, GraphSnapshot, NodeId } from '@/types';
import { GraphVisualizer } from './GraphVisualizer';

type GraphAlgorithmKey = 'bfs' | 'dfs';

const algorithmLabels: Record<GraphAlgorithmKey, string> = {
  bfs: 'Поиск в ширину (BFS)',
  dfs: 'Поиск в глубину (DFS)',
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
  const [adjacencyInput, setAdjacencyInput] = useState('A:B,C\nB:D,E\nC:E\nD:F\nE:F');
  const [graphInputError, setGraphInputError] = useState<string | null>(null);
  const [presetName, setPresetName] = useState('');

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

  useEffect(() => {
    if (graph.nodes.some((node) => node.id === startNodeId)) {
      return;
    }

    const fallbackNodeId = graph.nodes[0]?.id;
    if (fallbackNodeId !== undefined) {
      setStartNodeId(fallbackNodeId);
    }
  }, [graph.nodes, startNodeId]);

  const addNode = (): void => {
    const id = createNextNodeId(graph);
    setGraph({
      ...graph,
      nodes: [...graph.nodes, { id, label: id, position: { x: 120 + graph.nodes.length * 80, y: 160 }, payload: {} }],
    });
  };

  const applyAdjacencyInput = (): void => {
    const parsed = parseAdjacencyList(adjacencyInput);
    if (parsed === null) {
      setGraphInputError('Некорректный формат. Пример: A:B,C');
      return;
    }
    if (parsed.nodes.length > 24) {
      setGraphInputError('Слишком большой граф: максимум 24 вершины.');
      return;
    }
    setGraphInputError(null);
    setGraph(parsed);
    if (parsed.nodes.some((node) => node.id === startNodeId) === false) {
      setStartNodeId(parsed.nodes[0]?.id ?? 'A');
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-violet-300">Раздел графов</p>
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
            <button className="control-button" onClick={addNode} type="button">Добавить узел</button>
            <button
              className="control-button"
              onClick={() => {
                const name = presetName.trim() || `Граф ${new Date().toLocaleTimeString()}`;
                saveGraphPreset(name, graph);
                setPresetName('');
                setPresets(loadGraphPresets());
              }}
              type="button"
            >
              Сохранить пресет
            </button>
            <input className="h-10 rounded-xl border border-app bg-surface px-3 text-sm text-app-primary" onChange={(event) => setPresetName(event.target.value)} placeholder="Имя пресета" value={presetName} />
          </div>
        </div>

        {presets.length > 0 && (
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {presets.slice(0, 5).map((preset) => (
              <div className="flex items-center gap-2" key={preset.id}>
                <button className="control-button flex-1" onClick={() => setGraph(preset.graph)} type="button">
                  {preset.name}
                </button>
                <button className="control-button" onClick={() => { removeGraphPreset(preset.id); setPresets(loadGraphPresets()); }} type="button">Удалить</button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
          <p className="text-sm text-slate-300">Матрица/список смежности (формат: A:B,C)</p>
          <textarea className="mt-2 h-24 w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100" onChange={(event) => setAdjacencyInput(event.target.value)} value={adjacencyInput} />
          <div className="mt-2 flex items-center gap-2">
            <button className="control-button" onClick={applyAdjacencyInput} type="button">Применить граф</button>
            {graphInputError !== null && <span className="text-xs text-rose-300">{graphInputError}</span>}
          </div>
        </div>
      </section>

      <GraphVisualizer editable frame={graphFrame} graph={graph} onGraphChange={setGraph} />

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

const parseAdjacencyList = (source: string): GraphSnapshot | null => {
  const lines = source
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return null;
  }

  const nodeSet = new Set<string>();
  const edgeKeySet = new Set<string>();
  const edges: Array<GraphSnapshot['edges'][number]> = [];

  for (const line of lines) {
    const [rawNode, rawTargets = ''] = line.split(':');
    const node = rawNode?.trim();
    if (node === undefined || /^[A-Za-z0-9_-]+$/.test(node) === false) {
      return null;
    }
    nodeSet.add(node);

    const targets = rawTargets.split(',').map((target) => target.trim()).filter((target) => target.length > 0);
    for (const target of targets) {
      if (/^[A-Za-z0-9_-]+$/.test(target) === false) {
        return null;
      }
      nodeSet.add(target);

      const edgeKey = [node, target].sort().join('--');
      if (edgeKeySet.has(edgeKey)) {
        continue;
      }

      edgeKeySet.add(edgeKey);
      edges.push({ id: `${node}-${target}`, source: node, target, directed: false, payload: {} });
    }
  }

  const nodes = [...nodeSet].map((id, index) => ({
    id,
    label: id,
    position: { x: 90 + (index % 6) * 120, y: 80 + Math.floor(index / 6) * 120 },
    payload: {},
  }));

  return { nodes, edges };
};

const createNextNodeId = (graph: GraphSnapshot): string => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const existingIds = new Set(graph.nodes.map((node) => node.id));

  for (let size = 1; size <= 3; size += 1) {
    const combinations = Math.pow(alphabet.length, size);

    for (let index = 0; index < combinations; index += 1) {
      let value = '';
      let cursor = index;

      for (let position = 0; position < size; position += 1) {
        value = alphabet[cursor % alphabet.length] + value;
        cursor = Math.floor(cursor / alphabet.length);
      }

      if (existingIds.has(value) === false) {
        return value;
      }
    }
  }

  return `Узел-${Date.now()}`;
};
