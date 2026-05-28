import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { bfs, dfs } from '@/algorithms/graphs';
import { PlayerControls } from '@/components/player/PlayerControls';
import { loadGraphPresets, loadSettings, removeGraphPreset, renameGraphPreset, saveGraphPreset, saveSettings } from '@/lib/storage';
import { useAlgorithmPlayerStore } from '@/stores';
import type { AlgorithmFrame, GraphAlgorithmFrame, GraphEdge, GraphSnapshot, NodeId } from '@/types';
import { GraphVisualizer } from './GraphVisualizer';

type GraphAlgorithmKey = 'bfs' | 'dfs';

const algorithmLabels: Record<GraphAlgorithmKey, string> = {
  bfs: 'Обход по слоям — поиск в ширину (BFS)',
  dfs: 'Обход вглубь — поиск в глубину (DFS)',
};

const baseGraph: GraphSnapshot = {
  nodes: [
    { id: 'A', label: 'A', position: { x: 80, y: 190 }, payload: {} },
    { id: 'B', label: 'B', position: { x: 260, y: 80 }, payload: {} },
    { id: 'C', label: 'C', position: { x: 260, y: 300 }, payload: {} },
    { id: 'D', label: 'D', position: { x: 500, y: 90 }, payload: {} },
    { id: 'E', label: 'E', position: { x: 500, y: 300 }, payload: {} },
    { id: 'F', label: 'F', position: { x: 700, y: 190 }, payload: {} },
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
  const [graph, setGraph] = useState<GraphSnapshot>(() => normalizeGraph(baseGraph));
  const [presets, setPresets] = useState(loadGraphPresets());
  const [adjacencyInput, setAdjacencyInput] = useState(toAdjacencyListText(baseGraph));
  const [matrixRows, setMatrixRows] = useState<number[][]>(() => toAdjacencyMatrix(baseGraph).matrix);
  const [matrixNodeLabels, setMatrixNodeLabels] = useState(toAdjacencyMatrix(baseGraph).labels.join(','));
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
  const completedStepHistory = useMemo(
    () => frames.filter(isGraphAlgorithmFrame).map((frame) => frame.description ?? frame.message),
    [frames],
  );

  useEffect(() => {
    loadGraphAlgorithm(selectedAlgorithm, graph, startNodeId, loadAlgorithm);
    const settings = loadSettings();
    saveSettings({ ...settings, lastGraphStartNodeId: startNodeId, playbackSpeedMs });
  }, [graph, loadAlgorithm, playbackSpeedMs, selectedAlgorithm, startNodeId]);

  useEffect(() => {
    const matrix = toAdjacencyMatrix(graph);
    setAdjacencyInput(toAdjacencyListText(graph));
    setMatrixNodeLabels(matrix.labels.join(','));
    setMatrixRows(matrix.matrix);
  }, [graph]);

  useEffect(() => {
    if (graph.nodes.some((node) => node.id === startNodeId)) {
      return;
    }

    const fallbackNodeId = graph.nodes[0]?.id;
    if (fallbackNodeId !== undefined) {
      setStartNodeId(fallbackNodeId);
    }
  }, [graph.nodes, startNodeId]);

  const commitGraph = (nextGraph: GraphSnapshot): void => {
    const normalized = normalizeGraph(nextGraph);
    setGraph(normalized);
    setGraphInputError(null);
  };

  const addNode = (): void => {
    const candidate = newNodeLabel.trim();
    const id = candidate.length > 0 ? candidate : createNextNodeId(graph);

    if (/^[A-Za-z0-9_-]+$/.test(id) === false) {
      setGraphInputError('Метка новой вершины содержит недопустимые символы. Разрешены буквы, цифры, _ и -.');
      return;
    }
    if (graph.nodes.some((node) => node.id === id)) {
      setGraphInputError(`Вершина с меткой "${id}" уже существует.`);
      return;
    }

    const targets = newNodeLinks.split(',').map((v) => v.trim()).filter((v) => v.length > 0);
    if (targets.some((target) => graph.nodes.some((node) => node.id === target) === false)) {
      setGraphInputError('В поле связей есть вершины, которых нет в графе. Пример: A,B,C.');
      return;
    }

    const nodes = applyForceLayout([...graph.nodes, { id, label: id, position: { x: 120 + graph.nodes.length * 80, y: 160 }, payload: {} }], graph.edges);
    const existing = new Set(graph.edges.map((edge) => edgeKey(edge.source, edge.target)));
    const extraEdges: GraphEdge[] = targets
      .filter((target) => target !== id)
      .filter((target) => existing.has(edgeKey(id, target)) === false)
      .map((target) => ({ id: `${id}-${target}`, source: id, target, directed: false, payload: {} }));

    setNewNodeLabel('');
    setNewNodeLinks('');
    commitGraph({ nodes, edges: [...graph.edges, ...extraEdges] });
  };


  const addNodeAtPosition = (position: { readonly x: number; readonly y: number }): void => {
    if (graph.nodes.length >= 24) {
      setGraphInputError('Слишком большой граф: максимум 24 вершины.');
      return;
    }

    const id = createNextNodeId(graph);
    const nextNode = { id, label: id, position, payload: {} };
    commitGraph({ nodes: [...graph.nodes, nextNode], edges: graph.edges });
    setStartNodeId(graph.nodes.length === 0 ? id : startNodeId);
  };

  const removeNode = (nodeId: NodeId): void => {
    const nodes = graph.nodes.filter((node) => node.id !== nodeId);
    const edges = graph.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
    commitGraph({ nodes, edges });
  };

  const generateRandomGraph = (): void => {
    const count = Math.max(2, Math.min(24, Number.isFinite(randomNodesCount) ? Math.floor(randomNodesCount) : 8));
    const density = Math.max(0, Math.min(1, Number.isFinite(randomDensity) ? randomDensity : 0.3));
    const labels = Array.from({ length: count }, (_, i) => `V${i + 1}`);
    const edges: GraphEdge[] = [];
    const edgeSet = new Set<string>();

    for (let i = 1; i < count; i += 1) {
      const parent = Math.floor(Math.random() * i);
      const source = labels[parent]!;
      const target = labels[i]!;
      edges.push({ id: `${source}-${target}`, source, target, directed: false, payload: {} });
      edgeSet.add(edgeKey(source, target));
    }

    for (let i = 0; i < count; i += 1) {
      for (let j = i + 1; j < count; j += 1) {
        if (Math.random() > density) continue;
        const a = labels[i]!;
        const b = labels[j]!;
        const key = edgeKey(a, b);
        if (edgeSet.has(key)) continue;
        edgeSet.add(key);
        edges.push({ id: `${a}-${b}`, source: a, target: b, directed: false, payload: {} });
      }
    }

    const nodes = applyForceLayout(labels.map((id) => ({ id, label: id, position: { x: 420, y: 220 }, payload: {} })), edges);
    commitGraph({ nodes, edges });
    setStartNodeId(nodes[0]?.id ?? 'V1');
  };

  const clearGraph = (): void => {
    commitGraph({ nodes: [], edges: [] });
  };

  const applyAdjacencyListInput = (): void => {
    const parsed = parseAdjacencyList(adjacencyInput);
    if (parsed === null) {
      setGraphInputError('Некорректный формат списка смежности. Пример: A:B,C. Пустой граф не запускается.');
      return;
    }
    applyParsedGraph(parsed);
  };

  const applyMatrixInput = (): void => {
    const parsed = graphFromMatrix(matrixNodeLabels, matrixRows, graph);
    if (parsed === null) {
      setGraphInputError('Некорректная матрица смежности: нужны уникальные метки и квадратная таблица из 0/1.');
      return;
    }
    applyParsedGraph(parsed);
  };

  const applyParsedGraph = (parsed: GraphSnapshot, options: { readonly relayout?: boolean } = {}): void => {
    if (parsed.nodes.length > 24) {
      setGraphInputError('Слишком большой граф: максимум 24 вершины, чтобы визуализация оставалась читаемой.');
      return;
    }
    commitGraph({ ...parsed, nodes: options.relayout === false ? parsed.nodes : applyForceLayout(parsed.nodes, parsed.edges) });
    if (parsed.nodes.some((node) => node.id === startNodeId) === false) {
      setStartNodeId(parsed.nodes[0]?.id ?? 'A');
    }
  };

  const updateMatrixCell = (rowIndex: number, columnIndex: number, value: number): void => {
    const labels = parseMatrixLabels(matrixNodeLabels);
    const baseRows = resizeMatrixRows(matrixRows, labels.length);
    const nextRows = baseRows.map((row, r) => row.map((cell, c) => {
      if ((r === rowIndex && c === columnIndex) || (r === columnIndex && c === rowIndex)) {
        return value;
      }
      return cell;
    }));

    setMatrixRows(nextRows);
    const parsed = graphFromMatrix(matrixNodeLabels, nextRows, graph);
    if (parsed === null) {
      setGraphInputError('Матрица пока некорректна: проверьте метки вершин и размер таблицы.');
      return;
    }

    applyParsedGraph(parsed, { relayout: false });
  };

  const resetToBaseGraph = (): void => {
    commitGraph(baseGraph);
    setStartNodeId('A');
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <section className="app-panel shadow-xl shadow-slate-950/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-violet-300">Графы без страха</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-app-primary">Обход графа: пошаговая сеть</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-app-muted">
              Вершины — это объекты, рёбра — связи между ними. Перетащите вершины мышкой, соедините две вершины линией на холсте или измените список/матрицу — все представления синхронизируются автоматически.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(['bfs', 'dfs'] as const).map((algorithmKey) => (
              <button
                className={algorithmKey === selectedAlgorithm ? 'control-button control-button-primary' : 'control-button'}
                key={algorithmKey}
                onClick={() => setSelectedAlgorithm(algorithmKey)}
                type="button"
              >
                {algorithmLabels[algorithmKey]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[300px_1fr]">
          <label className="block text-sm text-app-muted">
            Стартовая вершина обхода
            <select
              className="mt-2 w-full rounded-xl border border-app bg-slate-950 px-3 py-2 text-app-primary outline-none transition focus:border-violet-400"
              disabled={graph.nodes.length === 0}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => setStartNodeId(event.target.value)}
              value={startNodeId}
            >
              {graph.nodes.map((node) => (
                <option key={node.id} value={node.id}>{node.label}</option>
              ))}
            </select>
            <span className="mt-2 block text-xs text-slate-400">BFS использует очередь (первым пришёл — первым обработан), DFS использует стек (последним пришёл — первым обработан).</span>
          </label>

          <div className="rounded-2xl border border-app bg-surface p-3">
            <p className="text-sm font-semibold text-app-primary">Единый блок ввода и генерации</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input className="control-input" onChange={(event) => setNewNodeLabel(event.target.value)} placeholder="Метка новой вершины" value={newNodeLabel} />
              <input className="h-10 w-52 rounded-xl border border-app bg-surface px-3 text-sm text-app-primary" onChange={(event) => setNewNodeLinks(event.target.value)} placeholder="Связи с существующими: A,B" value={newNodeLinks} />
              <button className="control-button" onClick={addNode} type="button">Добавить вершину</button>
              <button className="control-button" onClick={resetToBaseGraph} type="button">Вернуть пример</button>
              <button className="control-button" onClick={clearGraph} type="button">Очистить</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <label className="text-xs text-app-muted">Вершин
                <input className="ml-2 h-10 w-24 rounded-xl border border-app bg-surface px-3 text-sm text-app-primary" type="number" min={2} max={24} value={randomNodesCount} onChange={(event) => setRandomNodesCount(Number(event.target.value))} />
              </label>
              <label className="text-xs text-app-muted">Плотность связей
                <input className="ml-2 h-10 w-28 rounded-xl border border-app bg-surface px-3 text-sm text-app-primary" type="number" min={0} max={1} step={0.05} value={randomDensity} onChange={(event) => setRandomDensity(Number(event.target.value))} />
              </label>
              <button className="control-button" onClick={generateRandomGraph} type="button">Сгенерировать случайный граф</button>
              <input className="control-input" onChange={(event) => setPresetName(event.target.value)} placeholder="Имя пресета" value={presetName} />
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
            </div>
            {graphInputError !== null && <p className="mt-2 text-xs text-rose-300">{graphInputError}</p>}
          </div>
        </div>

        <div className="mt-4 grid gap-3 rounded-2xl border border-app bg-surface p-3 md:grid-cols-4">
          <StatCard label="Вершин" value={graphStats.nodes.toString()} />
          <StatCard label="Рёбер" value={graphStats.edges.toString()} />
          <StatCard label="Плотность" value={graphStats.density} />
          <StatCard label="Компонент связности" value={graphStats.componentsEstimate.toString()} />
        </div>

        {graph.nodes.length > 0 && (
          <div className="mt-3 rounded-2xl border border-app bg-surface p-3">
            <p className="text-sm font-semibold text-app-primary">Удаление вершин</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {graph.nodes.map((node) => (
                <button className="control-button" key={node.id} onClick={() => removeNode(node.id)} type="button">
                  Удалить {node.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {presets.length > 0 && (
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {presets.slice(0, 6).map((preset) => (
              <div className="flex items-center gap-2" key={preset.id}>
                <button className="control-button flex-1" onClick={() => commitGraph(preset.graph)} type="button">{preset.name}</button>
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
      </section>

      <GraphVisualizer editable frame={graphFrame} graph={graph} onAddNodeAt={addNodeAtPosition} onGraphChange={commitGraph} />

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="app-panel">
          <h2 className="text-xl font-semibold text-app-primary">Список смежности</h2>
          <p className="mt-2 text-sm text-app-muted">Каждая строка означает: вершина слева соединена с вершинами справа. Например, <code>A:B,C</code> — у A есть рёбра к B и C.</p>
          <textarea className="mt-3 h-40 w-full rounded-xl border border-app bg-surface p-3 font-mono text-sm text-app-primary" onChange={(event) => setAdjacencyInput(event.target.value)} value={adjacencyInput} />
          <button className="control-button mt-3" onClick={applyAdjacencyListInput} type="button">Применить список смежности</button>
        </div>

        <div className="app-panel">
          <h2 className="text-xl font-semibold text-app-primary">Матрица смежности</h2>
          <p className="mt-2 text-sm text-app-muted">Строка и столбец — вершины. 1 означает связь, 0 — связи нет. Для неориентированного графа таблица зеркальная. Клик по ячейке сразу перестраивает граф.</p>
          <input className="control-input mt-3 w-full" onChange={(event) => setMatrixNodeLabels(event.target.value)} placeholder="Метки вершин: A,B,C,D" value={matrixNodeLabels} />
          <AdjacencyMatrixEditor labelsSource={matrixNodeLabels} rows={matrixRows} onCellChange={updateMatrixCell} />
          <button className="control-button mt-3" onClick={applyMatrixInput} type="button">Применить матрицу</button>
        </div>
      </section>

      <section className="app-panel">
        <h3 className="text-lg font-semibold text-app-primary">Глубокая теория обходов</h3>
        <div className="mt-3 space-y-3 text-sm leading-6 text-app-muted">
          <p><strong className="text-app-primary">BFS (Breadth-First Search, поиск в ширину)</strong> обходит граф слоями: сначала стартовую вершину, затем всех её соседей на расстоянии 1, потом вершины на расстоянии 2 и так далее. Поэтому в невзвешенном графе BFS естественно находит кратчайшее число рёбер до цели.</p>
          <p><strong className="text-app-primary">DFS (Depth-First Search, поиск в глубину)</strong> идёт по одной ветке как можно дальше, а затем откатывается назад. Это удобно для поиска компонент связности, циклов, топологической сортировки и анализа зависимостей.</p>
          <p><strong className="text-app-primary">Frontier</strong> — «граница обхода»: вершины, которые уже найдены, но ещё не полностью обработаны. В BFS frontier хранится в очереди, в DFS — в стеке.</p>
          <p>Сложность обоих обходов — <strong>O(V + E)</strong>, где V — количество вершин, E — количество рёбер: каждая вершина и каждое ребро рассматриваются ограниченное число раз.</p>
        </div>
      </section>

      {status === 'completed' && completedStepHistory.length > 0 && (
        <section className="app-panel">
          <h3 className="text-xl font-semibold text-app-primary">История шагов обхода</h3>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-app-muted">
            {completedStepHistory.map((entry, index) => <li key={`${index}-${entry}`}>{entry}</li>)}
          </ol>
        </section>
      )}

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
  const lines = source.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);

  if (lines.length === 0) {
    return null;
  }

  const nodeSet = new Set<string>();
  const edgeKeySet = new Set<string>();
  const edges: GraphEdge[] = [];

  for (const line of lines) {
    const [rawNode, ...rest] = line.split(':');
    const rawTargets = rest.join(':');
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

      const key = edgeKey(node, target);
      if (edgeKeySet.has(key)) {
        continue;
      }

      edgeKeySet.add(key);
      edges.push({ id: `${node}-${target}`, source: node, target, directed: false, payload: {} });
    }
  }

  const nodes = [...nodeSet].map((id) => ({ id, label: id, position: { x: 420, y: 220 }, payload: {} }));
  return { nodes: applyForceLayout(nodes, edges), edges };
};

const graphFromMatrix = (labelsSource: string, matrix: readonly (readonly number[])[], previousGraph?: GraphSnapshot): GraphSnapshot | null => {
  const labels = parseMatrixLabels(labelsSource);
  const sizedMatrix = resizeMatrixRows(matrix, labels.length);
  if (labels.length < 2 || labels.length > 24 || new Set(labels).size !== labels.length) {
    return null;
  }

  if (labels.some((label) => /^[A-Za-z0-9_-]+$/.test(label) === false)) {
    return null;
  }

  if (sizedMatrix.length !== labels.length || sizedMatrix.some((row) => row.length !== labels.length)) {
    return null;
  }

  const edges: GraphEdge[] = [];
  const edgeKeySet = new Set<string>();

  for (let i = 0; i < labels.length; i += 1) {
    for (let j = 0; j < labels.length; j += 1) {
      const value = sizedMatrix[i]?.[j];
      if (value !== 0 && value !== 1) {
        return null;
      }
      if (value === 0 || i === j) {
        continue;
      }

      const source = labels[i]!;
      const target = labels[j]!;
      const key = edgeKey(source, target);
      if (edgeKeySet.has(key)) {
        continue;
      }

      edgeKeySet.add(key);
      edges.push({ id: `${source}-${target}`, source, target, directed: false, payload: {} });
    }
  }

  const previousPositions = new Map(previousGraph?.nodes.map((node) => [node.id, node.position]) ?? []);
  const nodes = labels.map((label) => ({ id: label, label, position: previousPositions.get(label) ?? { x: 420, y: 220 }, payload: {} }));
  return { nodes: previousGraph === undefined ? applyForceLayout(nodes, edges) : nodes, edges };
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

  return `Node-${Date.now()}`;
};

const getGraphStats = (graph: GraphSnapshot) => {
  const nodes = graph.nodes.length;
  const edges = graph.edges.length;
  const maxUndirectedEdges = nodes <= 1 ? 1 : (nodes * (nodes - 1)) / 2;
  const densityValue = edges / maxUndirectedEdges;
  const density = Number.isFinite(densityValue) ? densityValue.toFixed(2) : '0.00';

  return {
    nodes,
    edges,
    density,
    componentsEstimate: estimateComponents(graph),
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
    if (!edge.directed) {
      adjacency.get(edge.target)?.push(edge.source);
    }
  }

  const visited = new Set<NodeId>();
  let count = 0;

  for (const node of graph.nodes) {
    if (visited.has(node.id)) continue;

    count += 1;
    const stack: NodeId[] = [node.id];
    visited.add(node.id);

    while (stack.length > 0) {
      const current = stack.pop();
      if (current === undefined) continue;

      for (const neighbor of adjacency.get(current) ?? []) {
        if (visited.has(neighbor)) continue;
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

interface AdjacencyMatrixEditorProps {
  readonly labelsSource: string;
  readonly rows: readonly (readonly number[])[];
  readonly onCellChange: (rowIndex: number, columnIndex: number, value: number) => void;
}

function AdjacencyMatrixEditor({ labelsSource, rows, onCellChange }: AdjacencyMatrixEditorProps) {
  const labels = parseMatrixLabels(labelsSource);
  const sizedRows = resizeMatrixRows(rows, labels.length);

  if (labels.length === 0) {
    return <p className="mt-3 text-sm text-rose-300">Введите метки вершин через запятую.</p>;
  }

  return (
    <div className="mt-3 overflow-auto rounded-2xl border border-app">
      <table className="min-w-full border-collapse text-center text-sm">
        <thead>
          <tr className="bg-slate-950/70">
            <th className="border border-slate-800 p-2 text-slate-400">из \\ в</th>
            {labels.map((label) => <th className="border border-slate-800 p-2 text-app-primary" key={label}>{label}</th>)}
          </tr>
        </thead>
        <tbody>
          {labels.map((rowLabel, rowIndex) => (
            <tr key={rowLabel}>
              <th className="border border-slate-800 bg-slate-950/70 p-2 text-app-primary">{rowLabel}</th>
              {labels.map((columnLabel, columnIndex) => {
                const value = sizedRows[rowIndex]?.[columnIndex] ?? 0;
                return (
                  <td className="border border-slate-800 p-1" key={`${rowLabel}-${columnLabel}`}>
                    <button
                      className={value === 1 ? 'h-9 w-9 rounded-lg bg-emerald-500/25 font-bold text-emerald-200' : 'h-9 w-9 rounded-lg bg-slate-950 text-slate-400'}
                      disabled={rowIndex === columnIndex}
                      onClick={() => onCellChange(rowIndex, columnIndex, value === 1 ? 0 : 1)}
                      type="button"
                    >
                      {rowIndex === columnIndex ? '—' : value}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


const parseMatrixLabels = (labelsSource: string): string[] =>
  labelsSource.split(',').map((label) => label.trim()).filter((label) => label.length > 0);

const resizeMatrixRows = (rows: readonly (readonly number[])[], size: number): number[][] =>
  Array.from({ length: size }, (_, rowIndex) =>
    Array.from({ length: size }, (_, columnIndex) => rowIndex === columnIndex ? 0 : rows[rowIndex]?.[columnIndex] === 1 ? 1 : 0),
  );

const applyForceLayout = (nodes: GraphSnapshot['nodes'], edges: readonly GraphEdge[] = []): GraphSnapshot['nodes'] => {
  if (nodes.length === 0) {
    return [];
  }

  const width = 820;
  const height = 440;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(300, Math.max(130, nodes.length * 22));
  const points = nodes.map((node, index) => {
    const angle = (2 * Math.PI * index) / nodes.length - Math.PI / 2;
    return {
      ...node,
      position: {
        x: Number.isFinite(node.position.x) && node.position.x !== 420 ? node.position.x : centerX + Math.cos(angle) * radius,
        y: Number.isFinite(node.position.y) && node.position.y !== 220 ? node.position.y : centerY + Math.sin(angle) * radius,
      },
    };
  });
  const indexById = new Map(points.map((node, index) => [node.id, index]));

  for (let iter = 0; iter < 160; iter += 1) {
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const a = points[i]!;
        const b = points[j]!;
        const dx = b.position.x - a.position.x;
        const dy = b.position.y - a.position.y;
        const dist = Math.max(24, Math.hypot(dx, dy));
        const force = 9000 / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.position.x -= fx;
        a.position.y -= fy;
        b.position.x += fx;
        b.position.y += fy;
      }
    }

    for (const edge of edges) {
      const sourceIndex = indexById.get(edge.source);
      const targetIndex = indexById.get(edge.target);
      if (sourceIndex === undefined || targetIndex === undefined) continue;
      const source = points[sourceIndex]!;
      const target = points[targetIndex]!;
      const dx = target.position.x - source.position.x;
      const dy = target.position.y - source.position.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const desired = 150;
      const force = (dist - desired) * 0.018;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      source.position.x += fx;
      source.position.y += fy;
      target.position.x -= fx;
      target.position.y -= fy;
    }

    for (const node of points) {
      node.position.x += (centerX - node.position.x) * 0.004;
      node.position.y += (centerY - node.position.y) * 0.004;
      node.position.x = Math.min(width - 30, Math.max(30, node.position.x));
      node.position.y = Math.min(height - 30, Math.max(30, node.position.y));
    }
  }

  return points;
};

const normalizeGraph = (graph: GraphSnapshot): GraphSnapshot => {
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const seenEdges = new Set<string>();
  const edges = graph.edges
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target) && edge.source !== edge.target)
    .filter((edge) => {
      const key = edge.directed ? `${edge.source}->${edge.target}` : edgeKey(edge.source, edge.target);
      if (seenEdges.has(key)) return false;
      seenEdges.add(key);
      return true;
    })
    .map((edge) => ({ ...edge, id: edge.id || `${edge.source}-${edge.target}`, payload: { ...edge.payload } }));

  return {
    nodes: graph.nodes.map((node) => ({ ...node, label: node.label || node.id, position: { ...node.position }, payload: { ...node.payload } })),
    edges,
  };
};

const toAdjacencyListText = (graph: GraphSnapshot): string => {
  const adjacency = new Map<string, string[]>();
  for (const node of graph.nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of graph.edges) {
    adjacency.get(edge.source)?.push(edge.target);
    if (!edge.directed) {
      adjacency.get(edge.target)?.push(edge.source);
    }
  }

  return graph.nodes
    .map((node) => `${node.id}:${(adjacency.get(node.id) ?? []).sort((a, b) => a.localeCompare(b, 'ru')).join(',')}`)
    .join('\n');
};

const toAdjacencyMatrix = (graph: GraphSnapshot): { labels: string[]; matrix: number[][] } => {
  const labels = graph.nodes.map((node) => node.id);
  const indexById = new Map(labels.map((label, index) => [label, index]));
  const matrix = labels.map(() => labels.map(() => 0));

  for (const edge of graph.edges) {
    const sourceIndex = indexById.get(edge.source);
    const targetIndex = indexById.get(edge.target);
    if (sourceIndex === undefined || targetIndex === undefined) continue;
    matrix[sourceIndex]![targetIndex] = 1;
    if (!edge.directed) {
      matrix[targetIndex]![sourceIndex] = 1;
    }
  }

  return { labels, matrix };
};

const edgeKey = (source: string, target: string): string => [source, target].sort((a, b) => a.localeCompare(b, 'ru')).join('--');
