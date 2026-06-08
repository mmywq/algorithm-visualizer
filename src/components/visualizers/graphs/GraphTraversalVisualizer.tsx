import { useEffect, useState, type ChangeEvent } from 'react';
import { bfs, dfs } from '@/algorithms/graphs';
import { PlayerControls } from '@/components/player/PlayerControls';
import { loadGraphPresets, loadSettings, removeGraphPreset, renameGraphPreset, saveGraphPreset, saveSettings } from '@/lib/storage';
import { useAlgorithmPlayerStore } from '@/stores';
import type { AlgorithmFrame, GraphAlgorithmFrame, GraphEdge, GraphSnapshot, NodeId } from '@/types';
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
  const [inputMode, setInputMode] = useState<'list' | 'matrix'>('list');
  const [matrixNodeLabels, setMatrixNodeLabels] = useState('A,B,C,D,E,F');
  const [graphInputError, setGraphInputError] = useState<string | null>(null);
  const [presetName, setPresetName] = useState('');
  const [renamePresetState, setRenamePresetState] = useState<{ id: string; name: string } | null>(null);
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [newNodeLinks, setNewNodeLinks] = useState('');
  const [randomNodesCount, setRandomNodesCount] = useState(8);
  const [randomDensity, setRandomDensity] = useState(0.3);

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
  const graphStats = getGraphStats(graph);

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
    const candidate = newNodeLabel.trim();
    const id = candidate.length > 0 ? candidate : createNextNodeId(graph);

    if (/^[A-Za-z0-9_-]+$/.test(id) === false) {
      setGraphInputError('Метка новой вершины содержит недопустимые символы.');
      return;
    }
    if (graph.nodes.some((node) => node.id === id)) {
      setGraphInputError(`Вершина с меткой "${id}" уже существует.`);
      return;
    }

    const targets = newNodeLinks.split(',').map((v) => v.trim()).filter((v) => v.length > 0);
    if (targets.some((target) => graph.nodes.some((node) => node.id === target) === false)) {
      setGraphInputError('В поле связей есть вершины, которых нет в графе.');
      return;
    }

    const nodes = applyForceLayout([...graph.nodes, { id, label: id, position: { x: 120 + graph.nodes.length * 80, y: 160 }, payload: {} }]);
    const existing = new Set(graph.edges.map((edge) => [edge.source, edge.target].sort().join('--')));
    const extraEdges = targets
      .filter((target) => target !== id)
      .filter((target) => existing.has([id, target].sort().join('--')) === false)
      .map((target) => ({ id: `${id}-${target}`, source: id, target, directed: false, payload: {} }));

    setGraphInputError(null);
    setNewNodeLabel('');
    setNewNodeLinks('');
    setGraph({ nodes, edges: [...graph.edges, ...extraEdges] });
  };

  const removeNode = (nodeId: NodeId): void => {
    const nodes = graph.nodes.filter((node) => node.id !== nodeId);
    const edges = graph.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
    setGraph({ nodes, edges });
  };


  const generateRandomGraph = (): void => {
    const count = Math.max(2, Math.min(24, Math.floor(randomNodesCount)));
    const density = Math.max(0, Math.min(1, randomDensity));
    const labels = Array.from({ length: count }, (_, i) => `V${i + 1}`);
    const edges: GraphEdge[] = [];
    const edgeSet = new Set<string>();

    for (let i = 1; i < count; i += 1) {
      const parent = Math.floor(Math.random() * i);
      const source = labels[parent]!;
      const target = labels[i]!;
      edges.push({ id: `${source}-${target}`, source, target, directed: false, payload: {} });
      edgeSet.add([source, target].sort().join('--'));
    }

    for (let i = 0; i < count; i += 1) {
      for (let j = i + 1; j < count; j += 1) {
        if (Math.random() > density) continue;
        const a = labels[i]!; const b = labels[j]!;
        const key = [a,b].sort().join('--');
        if (edgeSet.has(key)) continue;
        edgeSet.add(key);
        edges.push({ id: `${a}-${b}`, source: a, target: b, directed: false, payload: {} });
      }
    }

    const nodes = applyForceLayout(labels.map((id, index) => ({ id, label: id, position: { x: 120 + index * 10, y: 120 + index * 10 }, payload: {} })));
    const nextGraph = { nodes, edges };
    setGraph(nextGraph);
    setStartNodeId(nodes[0]?.id ?? 'V1');
  };

  const clearGraph = (): void => {
    setGraph({ nodes: [], edges: [] });
  };

  const applyAdjacencyInput = (): void => {
    const parsed = inputMode === 'list'
      ? parseAdjacencyList(adjacencyInput)
      : parseAdjacencyMatrix(adjacencyInput, matrixNodeLabels);
    if (parsed === null) {
      setGraphInputError(inputMode === 'list'
        ? 'Некорректный формат списка смежности. Пример: A:B,C'
        : 'Некорректная матрица смежности. Проверьте размер и значения 0/1.');
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
      <section className="app-panel shadow-xl shadow-slate-950/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-violet-300">Раздел графов</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-app-primary">UI для графов</h1>
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
          <label className="block max-w-xs text-sm text-app-muted">
            Стартовая вершина
            <select
              className="mt-2 w-full rounded-xl border border-app bg-slate-950 px-3 py-2 text-app-primary outline-none transition focus:border-violet-400"
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
            <input className="control-input" onChange={(event) => setNewNodeLabel(event.target.value)} placeholder="Метка новой вершины" value={newNodeLabel} />
            <input className="h-10 w-52 rounded-xl border border-app bg-surface px-3 text-sm text-app-primary" onChange={(event) => setNewNodeLinks(event.target.value)} placeholder="Связи: A,B,C" value={newNodeLinks} />
            <button className="control-button" onClick={addNode} type="button">Добавить узел</button>
            <button className="control-button" onClick={clearGraph} type="button">Очистить граф</button>
            <input className="h-10 w-24 rounded-xl border border-app bg-surface px-3 text-sm text-app-primary" type="number" min={2} max={24} value={randomNodesCount} onChange={(event) => setRandomNodesCount(Number(event.target.value))} placeholder="Вершин" />
            <input className="h-10 w-28 rounded-xl border border-app bg-surface px-3 text-sm text-app-primary" type="number" min={0} max={1} step={0.05} value={randomDensity} onChange={(event) => setRandomDensity(Number(event.target.value))} placeholder="Плотность" />
            <button className="control-button" onClick={generateRandomGraph} type="button">Сгенерировать случайный граф</button>
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
            <input className="control-input" onChange={(event) => setPresetName(event.target.value)} placeholder="Имя пресета" value={presetName} />
          </div>
        </div>

        <div className="mt-4 grid gap-3 rounded-2xl border border-app bg-surface p-3 md:grid-cols-4">
          <StatCard label="Вершин" value={graphStats.nodes.toString()} />
          <StatCard label="Рёбер" value={graphStats.edges.toString()} />
          <StatCard label="Плотность" value={graphStats.density} />
          <StatCard label="Компонент (оценка)" value={graphStats.componentsEstimate.toString()} />
        </div>

        {presets.length > 0 && (
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {presets.slice(0, 5).map((preset) => (
              <div className="flex items-center gap-2" key={preset.id}>
                <button className="control-button flex-1" onClick={() => setGraph(preset.graph)} type="button">
                  {preset.name}
                </button>
                <button className="control-button" onClick={() => setRenamePresetState({ id: preset.id, name: preset.name })} type="button">Переим.</button>
                <button className="control-button" onClick={() => { removeGraphPreset(preset.id); setPresets(loadGraphPresets()); }} type="button">Удалить</button>
              </div>
            ))}
          </div>
        )}

        {renamePresetState !== null && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-app bg-surface p-3">
            <p className="text-sm text-app-muted">Переименование пресета</p>
            <input className="control-input" onChange={(event) => setRenamePresetState({ ...renamePresetState, name: event.target.value })} value={renamePresetState.name} />
            <button className="control-button" onClick={() => { renameGraphPreset(renamePresetState.id, renamePresetState.name); setRenamePresetState(null); setPresets(loadGraphPresets()); }} type="button">Сохранить</button>
            <button className="control-button" onClick={() => setRenamePresetState(null)} type="button">Отмена</button>
          </div>
        )}

        {graph.nodes.length > 0 && (
          <div className="mt-3 rounded-2xl border border-app bg-surface p-3">
            <p className="text-sm text-app-muted">Удаление вершин</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {graph.nodes.map((node) => (
                <button className="control-button" key={node.id} onClick={() => removeNode(node.id)} type="button">
                  Удалить {node.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-app bg-surface p-3">
          <p className="text-sm text-app-muted">Пользовательский ввод графа</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button className={inputMode === 'list' ? 'control-button control-button-primary' : 'control-button'} onClick={() => setInputMode('list')} type="button">Список смежности</button>
            <button className={inputMode === 'matrix' ? 'control-button control-button-primary' : 'control-button'} onClick={() => setInputMode('matrix')} type="button">Матрица смежности</button>
          </div>

          {inputMode === 'matrix' && (
            <input
              className="control-input mt-2 w-full"
              onChange={(event) => setMatrixNodeLabels(event.target.value)}
              placeholder="Метки вершин (например: A,B,C,D)"
              value={matrixNodeLabels}
            />
          )}

          <p className="mt-2 text-xs text-slate-400">
            {inputMode === 'list' ? 'Формат: A:B,C' : 'Формат: строки матрицы 0/1 через пробелы, по одной строке на вершину.'}
          </p>
          <textarea className="mt-2 h-24 w-full rounded-xl border border-app bg-surface p-2 text-sm text-app-primary" onChange={(event) => setAdjacencyInput(event.target.value)} value={adjacencyInput} />
          <div className="mt-2 flex items-center gap-2">
            <button className="control-button" onClick={applyAdjacencyInput} type="button">Применить граф</button>
            {graphInputError !== null && <span className="text-xs text-rose-300">{graphInputError}</span>}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-app bg-surface p-3 text-sm text-app-muted">
          <p className="font-semibold text-app-primary">Псевдокод {selectedAlgorithm.toUpperCase()}</p>
          {(selectedAlgorithm === 'bfs'
            ? ['инициализировать очередь и множество посещённых', 'поместить стартовую вершину в очередь', 'извлечь вершину u из очереди и обработать', 'для каждого соседа v вершины u', 'если v не посещена: отметить и добавить в очередь', 'если очередь пуста — обход завершён']
            : ['инициализировать стек и множество посещённых', 'поместить стартовую вершину в стек', 'снять вершину u со стека и обработать', 'для каждого соседа v вершины u', 'если v не посещена: отметить и поместить в стек', 'если стек пуст — обход завершён'])
            .map((line, index) => (
              <p key={line} className={graphFrame?.pseudocode.line === index + 1 ? 'text-violet-200 font-semibold' : ''}>{index + 1}. {line}</p>
            ))}
        </div>
      </section>

      <GraphVisualizer editable frame={graphFrame} graph={graph} onGraphChange={setGraph} />

      <section className="app-panel">
        <h3 className="text-lg font-semibold text-app-primary">Краткая теория обходов</h3>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-app-muted">
          <li><strong>BFS</strong> находит кратчайший путь в невзвешенном графе.</li>
          <li><strong>DFS</strong> удобен для поиска компонент, циклов и топологического анализа.</li>
          <li>Сложность обеих стратегий: <strong>O(V + E)</strong>, где V — вершины, E — рёбра.</li>
        </ul>
      </section>

      <PlayerControls
        canStepBackward={currentIndex > 0}
        canStepForward={status !== 'completed' && graph.nodes.length > 0}
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
  const first = generator.next();
  if (first.done) {
    loadAlgorithm(generator);
  } else {
    loadAlgorithm(generator, { initialFrame: first.value });
  }
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

const parseAdjacencyMatrix = (source: string, labelsSource: string): GraphSnapshot | null => {
  const labels = labelsSource.split(',').map((label) => label.trim()).filter((label) => label.length > 0);
  if (labels.length < 2 || labels.length > 24) {
    return null;
  }

  if (labels.some((label) => /^[A-Za-z0-9_-]+$/.test(label) === false)) {
    return null;
  }

  const rows = source.split('\n').map((row) => row.trim()).filter((row) => row.length > 0);
  if (rows.length !== labels.length) {
    return null;
  }

  const matrix = rows.map((row) => row.split(/\s+/));
  if (matrix.some((row) => row.length !== labels.length)) {
    return null;
  }

  const edgeKeySet = new Set<string>();
  const edges: Array<GraphSnapshot['edges'][number]> = [];

  for (let i = 0; i < labels.length; i += 1) {
    for (let j = 0; j < labels.length; j += 1) {
      const value = matrix[i]?.[j];
      if (value !== '0' && value !== '1') {
        return null;
      }
      if (value === '0' || i === j) {
        continue;
      }

      const sourceNode = labels[i]!;
      const targetNode = labels[j]!;
      const edgeKey = [sourceNode, targetNode].sort().join('--');
      if (edgeKeySet.has(edgeKey)) {
        continue;
      }

      edgeKeySet.add(edgeKey);
      edges.push({ id: `${sourceNode}-${targetNode}`, source: sourceNode, target: targetNode, directed: false, payload: {} });
    }
  }

  const nodes = labels.map((label, index) => ({
    id: label,
    label,
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

const getGraphStats = (graph: GraphSnapshot) => {
  const nodes = graph.nodes.length;
  const edges = graph.edges.length;
  const maxUndirectedEdges = nodes <= 1 ? 1 : (nodes * (nodes - 1)) / 2;
  const densityValue = edges / maxUndirectedEdges;
  const density = Number.isFinite(densityValue) ? densityValue.toFixed(2) : '0.00';

  const componentsEstimate = estimateComponents(graph);

  return {
    nodes,
    edges,
    density,
    componentsEstimate,
  };
};

const estimateComponents = (graph: GraphSnapshot): number => {
  if (graph.nodes.length === 0) {
    return 0;
  }

  const adjacency = new Map<NodeId, NodeId[]>();
  for (const node of graph.nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of graph.edges) {
    adjacency.get(edge.source)?.push(edge.target);
    adjacency.get(edge.target)?.push(edge.source);
  }

  const visited = new Set<NodeId>();
  let count = 0;

  for (const node of graph.nodes) {
    if (visited.has(node.id)) {
      continue;
    }

    count += 1;
    const stack: NodeId[] = [node.id];
    visited.add(node.id);

    while (stack.length > 0) {
      const current = stack.pop();
      if (current === undefined) {
        continue;
      }

      for (const neighbor of adjacency.get(current) ?? []) {
        if (visited.has(neighbor)) {
          continue;
        }
        visited.add(neighbor);
        stack.push(neighbor);
      }
    }
  }

  return count;
};

interface StatCardProps {
  readonly label: string;
  readonly value: string;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-xl border border-app bg-surface/70 px-3 py-2">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-app-primary">{value}</p>
    </div>
  );
}


const applyForceLayout = (nodes: GraphSnapshot['nodes']): GraphSnapshot['nodes'] => {
  const width = 820;
  const height = 420;
  const points = nodes.map((node, index) => ({ ...node, position: { x: 120 + (index % 8) * 80, y: 80 + Math.floor(index / 8) * 90 } }));

  for (let iter = 0; iter < 90; iter += 1) {
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const a = points[i]!; const b = points[j]!;
        const dx = b.position.x - a.position.x; const dy = b.position.y - a.position.y;
        const dist = Math.max(20, Math.hypot(dx, dy));
        const force = 2600 / (dist * dist);
        const fx = (dx / dist) * force; const fy = (dy / dist) * force;
        a.position.x -= fx; a.position.y -= fy; b.position.x += fx; b.position.y += fy;
      }
    }
    for (const node of points) {
      node.position.x = Math.min(width, Math.max(20, node.position.x));
      node.position.y = Math.min(height, Math.max(20, node.position.y));
    }
  }
  return points;
};
