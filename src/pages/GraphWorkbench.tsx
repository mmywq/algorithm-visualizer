import { useEffect, useMemo, useState } from 'react';
import { bfs, connectedComponents, defaultComponentsGraph, defaultWeightedGraph, dfs, dijkstra, mstKruskal } from '@/algorithms/graphs';
import { ColorLegend, type LegendItem } from '@/components/common/ColorLegend';
import { ResultPanel } from '@/components/common/ResultPanel';
import { StepExplainPanel } from '@/components/common/StepExplainPanel';
import { TheoryPanel } from '@/components/common/TheoryPanel';
import { PlayerControls } from '@/components/player/PlayerControls';
import { GraphCanvas, createNextNodeId } from '@/components/visualizers/graphs/GraphCanvas';
import {
  generateRandomGraph,
  getGraphStructureKey,
  graphToMatrix,
  isValidNodeLabel,
  MAX_GRAPH_NODES,
  normalizeGraph,
  parseAdjacencyList,
  serializeAdjacencyList,
  setMatrixCell,
} from '@/lib/graphEditing';
import { GRAPH_CANVAS_HEIGHT, GRAPH_CANVAS_WIDTH, layoutGraph } from '@/lib/graphLayout';
import { loadGraphPresets, removeGraphPreset, renameGraphPreset, saveGraphPreset } from '@/lib/storage';
import { useAlgorithmPlayerStore } from '@/stores';
import type { AlgorithmFrame, GraphAlgorithmFrame, GraphSnapshot, NodeId, PseudocodeLine } from '@/types';
import { algorithmTheoryByRoute, fallbackTheory } from './theoryContent';

export interface GraphAlgorithmOption {
  readonly key: string;
  readonly label: string;
  readonly frontierName?: string;
  readonly pseudocode: readonly PseudocodeLine[];
  readonly run: (graph: GraphSnapshot, startNodeId: NodeId) => Generator<GraphAlgorithmFrame, void, unknown>;
}

export interface GraphWorkbenchConfig {
  readonly route: string;
  readonly title: string;
  readonly weighted: boolean;
  readonly needsStart: boolean;
  readonly defaultGraph: GraphSnapshot;
  readonly algorithms: readonly GraphAlgorithmOption[];
  readonly legend: readonly LegendItem[];
}

interface GraphWorkbenchProps {
  readonly config: GraphWorkbenchConfig;
}

export function GraphWorkbench({ config }: GraphWorkbenchProps) {
  const [graph, setGraph] = useState<GraphSnapshot>(() => normalizeGraph({
    nodes: layoutGraph(config.defaultGraph.nodes, config.defaultGraph.edges),
    edges: config.defaultGraph.edges,
  }));
  const [algorithmKey, setAlgorithmKey] = useState(config.algorithms[0]!.key);
  const [startNodeId, setStartNodeId] = useState<NodeId>(config.defaultGraph.nodes[0]?.id ?? 'A');
  const [adjacencyDraft, setAdjacencyDraft] = useState(() => serializeAdjacencyList(config.defaultGraph, config.weighted));
  const [adjacencyError, setAdjacencyError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [presets, setPresets] = useState(loadGraphPresets());
  const [presetName, setPresetName] = useState('');
  const [renameState, setRenameState] = useState<{ id: string; name: string } | null>(null);
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [removeNodeId, setRemoveNodeId] = useState('');
  const [randomCount, setRandomCount] = useState(7);
  const [randomDensity, setRandomDensity] = useState(0.35);
  const [newEdgeWeight, setNewEdgeWeight] = useState(1);

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

  const algorithm = config.algorithms.find((option) => option.key === algorithmKey) ?? config.algorithms[0]!;
  const theory = algorithmTheoryByRoute[config.route] ?? fallbackTheory('graph');
  const frame = isGraphFrame(currentFrame) ? currentFrame : null;
  const structureKey = useMemo(() => getGraphStructureKey(graph), [graph]);
  const matrix = useMemo(() => graphToMatrix(graph), [graph]);
  const stepsHistory = useMemo(() => frames.map((item) => item.description ?? item.message), [frames]);
  const isCompleted = status === 'completed';
  const editable = status !== 'running';

  useEffect(() => {
    const generator = algorithm.run(graph, startNodeId);
    const first = generator.next();
    if (first.done) {
      loadAlgorithm(generator);
    } else {
      loadAlgorithm(generator, { initialFrame: first.value });
    }
    // структурные изменения графа, смена алгоритма или старта перезапускают демонстрацию
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structureKey, algorithm, startNodeId, loadAlgorithm]);

  useEffect(() => {
    setAdjacencyDraft(serializeAdjacencyList(graph, config.weighted));
    setAdjacencyError(null);
  }, [graph, config.weighted]);

  useEffect(() => {
    if (graph.nodes.length === 0) return;
    if (graph.nodes.some((node) => node.id === startNodeId)) return;
    setStartNodeId(graph.nodes[0]!.id);
  }, [graph, startNodeId]);

  const commitGraph = (next: GraphSnapshot): void => {
    setEditError(null);
    setGraph(normalizeGraph(next));
  };

  const applyAdjacencyDraft = (): void => {
    const parsed = parseAdjacencyList(adjacencyDraft, config.weighted);
    if (!parsed.ok || parsed.graph === undefined) {
      setAdjacencyError(parsed.error ?? 'Не удалось разобрать список смежности.');
      return;
    }
    setAdjacencyError(null);
    // сохраняем позиции существующих вершин, чтобы граф не «прыгал»
    const oldPositions = new Map(graph.nodes.map((node) => [node.id, node.position]));
    const keptCount = parsed.graph.nodes.filter((node) => oldPositions.has(node.id)).length;
    const nodes = keptCount === parsed.graph.nodes.length
      ? parsed.graph.nodes.map((node) => ({ ...node, position: oldPositions.get(node.id) ?? node.position }))
      : parsed.graph.nodes;
    commitGraph({ nodes, edges: parsed.graph.edges });
  };

  const addNode = (): void => {
    const label = newNodeLabel.trim() || createNextNodeId(graph);
    if (!isValidNodeLabel(label)) {
      setEditError(`Недопустимая метка «${label}». Используйте до 6 символов: буквы, цифры, _ и -.`);
      return;
    }
    if (graph.nodes.some((node) => node.id === label)) {
      setEditError(`Вершина «${label}» уже существует.`);
      return;
    }
    if (graph.nodes.length >= MAX_GRAPH_NODES) {
      setEditError(`Достигнут предел в ${MAX_GRAPH_NODES} вершин.`);
      return;
    }
    const angle = Math.random() * Math.PI * 2;
    const position = {
      x: GRAPH_CANVAS_WIDTH / 2 + Math.cos(angle) * 120,
      y: GRAPH_CANVAS_HEIGHT / 2 + Math.sin(angle) * 100,
    };
    setNewNodeLabel('');
    commitGraph({ nodes: [...graph.nodes, { id: label, label, position, payload: {} }], edges: graph.edges });
  };

  const removeNode = (): void => {
    if (removeNodeId.length === 0) return;
    commitGraph({
      nodes: graph.nodes.filter((node) => node.id !== removeNodeId),
      edges: graph.edges.filter((edge) => edge.source !== removeNodeId && edge.target !== removeNodeId),
    });
    setRemoveNodeId('');
  };

  const savePreset = (): void => {
    const name = presetName.trim() || `Граф от ${new Date().toLocaleTimeString()}`;
    saveGraphPreset(name, graph);
    setPresetName('');
    setPresets(loadGraphPresets());
  };

  const loadPreset = (preset: GraphSnapshot): void => {
    const normalized = normalizeGraph(preset);
    // пресет другой страницы может не иметь весов — добавим вес 1 на взвешенных страницах
    const edges = config.weighted
      ? normalized.edges.map((edge) => (edge.weight === undefined ? { ...edge, weight: 1 } : edge))
      : normalized.edges;
    commitGraph({ nodes: normalized.nodes, edges });
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <section className="app-panel">
        <h1 className="text-3xl font-bold text-app-primary">{config.title}</h1>
        {theory.intro.length > 0 && <p className="mt-3 max-w-4xl text-sm leading-6 text-app-muted">{theory.intro[0]}</p>}
      </section>

      <TheoryPanel theory={theory} />

      <section className="app-panel">
        <h2 className="text-xl font-semibold text-app-primary">Входные данные: граф</h2>
        <p className="mt-2 text-sm leading-6 text-app-muted">
          Граф можно собрать любым удобным способом — все представления связаны и обновляются одновременно: холст, список смежности и матрица показывают один и тот же граф.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-2">
          {config.algorithms.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {config.algorithms.map((option) => (
                <button
                  className={option.key === algorithm.key ? 'control-button control-button-primary' : 'control-button'}
                  key={option.key}
                  onClick={() => setAlgorithmKey(option.key)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {config.needsStart && (
            <label className="block text-sm text-app-muted">
              Стартовая вершина
              <select
                className="control-input mt-1 block w-36"
                disabled={graph.nodes.length === 0}
                onChange={(event) => setStartNodeId(event.target.value)}
                value={startNodeId}
              >
                {graph.nodes.map((node) => (
                  <option key={node.id} value={node.id}>{node.label}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="mt-4 grid gap-3 rounded-2xl border border-app bg-surface p-4">
          <p className="text-sm font-semibold text-app-primary">Быстрые действия</p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block text-xs text-app-muted">
              Вершин
              <input
                className="control-input mt-1 block w-20"
                max={MAX_GRAPH_NODES}
                min={2}
                onChange={(event) => setRandomCount(Number(event.target.value))}
                type="number"
                value={randomCount}
              />
            </label>
            <label className="block text-xs text-app-muted">
              Плотность связей (0–1)
              <input
                className="control-input mt-1 block w-24"
                max={1}
                min={0}
                onChange={(event) => setRandomDensity(Number(event.target.value))}
                step={0.05}
                type="number"
                value={randomDensity}
              />
            </label>
            <button
              className="control-button"
              onClick={() => commitGraph(generateRandomGraph(randomCount, randomDensity, config.weighted))}
              type="button"
            >
              Случайный граф
            </button>
            <button className="control-button" onClick={() => commitGraph({ nodes: layoutGraph(config.defaultGraph.nodes, config.defaultGraph.edges), edges: config.defaultGraph.edges })} type="button">Демонстрационный граф</button>
            <button className="control-button" onClick={() => commitGraph({ nodes: layoutGraph(graph.nodes, graph.edges), edges: graph.edges })} type="button">Разложить вершины</button>
            <button className="control-button" onClick={() => commitGraph({ nodes: [], edges: [] })} type="button">Очистить</button>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <label className="block text-xs text-app-muted">
              Метка новой вершины
              <input
                className="control-input mt-1 block w-36"
                onChange={(event) => setNewNodeLabel(event.target.value)}
                placeholder="Например: G"
                value={newNodeLabel}
              />
            </label>
            <button className="control-button" onClick={addNode} type="button">Добавить вершину</button>
            <label className="block text-xs text-app-muted">
              Удалить вершину
              <select
                className="control-input mt-1 block w-36"
                disabled={graph.nodes.length === 0}
                onChange={(event) => setRemoveNodeId(event.target.value)}
                value={removeNodeId}
              >
                <option value="">— выберите —</option>
                {graph.nodes.map((node) => (
                  <option key={node.id} value={node.id}>{node.label}</option>
                ))}
              </select>
            </label>
            <button className="control-button" disabled={removeNodeId.length === 0} onClick={removeNode} type="button">Удалить</button>
            {config.weighted && (
              <label className="block text-xs text-app-muted">
                Вес нового ребра
                <input
                  className="control-input mt-1 block w-20"
                  max={99}
                  min={1}
                  onChange={(event) => setNewEdgeWeight(Number(event.target.value))}
                  type="number"
                  value={newEdgeWeight}
                />
              </label>
            )}
          </div>

          {editError !== null && <p className="text-sm text-rose-300">{editError}</p>}
        </div>

        <div className="mt-3 rounded-2xl border border-app bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-app-primary">Пресеты</p>
            <input className="control-input" onChange={(event) => setPresetName(event.target.value)} placeholder="Имя пресета" value={presetName} />
            <button className="control-button" onClick={savePreset} type="button">Сохранить текущий граф</button>
          </div>
          {presets.length === 0 ? (
            <p className="mt-3 text-xs text-app-muted">Сохранённых графов пока нет.</p>
          ) : (
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {presets.slice(0, 9).map((preset) => (
                <div className="flex items-center gap-2" key={preset.id}>
                  <button className="control-button min-w-0 flex-1" onClick={() => loadPreset(preset.graph)} type="button">
                    <span className="truncate">{preset.name}</span>
                  </button>
                  <button className="control-button" onClick={() => setRenameState({ id: preset.id, name: preset.name })} type="button">Переим.</button>
                  <button className="control-button" onClick={() => { removeGraphPreset(preset.id); setPresets(loadGraphPresets()); }} type="button">Удалить</button>
                </div>
              ))}
            </div>
          )}
          {renameState !== null && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-app bg-surface p-3">
              <p className="text-sm text-app-muted">Новое имя</p>
              <input className="control-input" onChange={(event) => setRenameState({ ...renameState, name: event.target.value })} value={renameState.name} />
              <button className="control-button" onClick={() => { renameGraphPreset(renameState.id, renameState.name); setRenameState(null); setPresets(loadGraphPresets()); }} type="button">Сохранить</button>
              <button className="control-button" onClick={() => setRenameState(null)} type="button">Отмена</button>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="flex flex-col gap-4">
          <div className="app-panel">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <h2 className="text-xl font-semibold text-app-primary">Визуализация</h2>
              <p className="text-xs text-app-muted">
                {editable
                  ? 'Вершины можно перетаскивать. Клик по двум вершинам добавит или удалит ребро между ними. Двойной клик по пустому месту — новая вершина.'
                  : 'Идёт демонстрация: редактирование графа возобновится после паузы или завершения.'}
              </p>
            </div>
            <div className="mt-3">
              <GraphCanvas
                defaultEdgeWeight={newEdgeWeight}
                editable={editable}
                frame={frame}
                graph={graph}
                onGraphChange={commitGraph}
                startNodeId={config.needsStart ? startNodeId : undefined}
                weighted={config.weighted}
              />
            </div>
            <div className="mt-3">
              <ColorLegend items={config.legend} />
            </div>
          </div>

          {isCompleted && (
            <ResultPanel
              inputSummary={`Граф: ${graph.nodes.length} вершин (${graph.nodes.map((node) => node.label).join(', ')}), ${graph.edges.length} рёбер${config.needsStart ? `; стартовая вершина — ${startNodeId}` : ''}`}
              steps={stepsHistory}
              summary={frame?.description ?? frame?.message ?? null}
            />
          )}
        </div>

        <div className="flex flex-col gap-4">
          <StepExplainPanel frame={frame} pseudocode={algorithm.pseudocode} />
          <GraphStatePanel algorithm={algorithm} config={config} frame={frame} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="app-panel">
          <h2 className="text-xl font-semibold text-app-primary">Список смежности</h2>
          <p className="mt-2 text-sm leading-6 text-app-muted">
            Каждая строка — вершина и её соседи через запятую{config.weighted ? '; в скобках указан вес ребра, например B(4)' : ''}. Список обновляется автоматически при любой правке графа; его можно отредактировать вручную и нажать «Применить».
          </p>
          <textarea
            className="mt-3 h-44 w-full rounded-xl border border-app bg-surface p-3 font-mono text-sm text-app-primary"
            onChange={(event) => setAdjacencyDraft(event.target.value)}
            spellCheck={false}
            value={adjacencyDraft}
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button className="control-button" onClick={applyAdjacencyDraft} type="button">Применить список</button>
            {adjacencyError !== null && <p className="text-sm text-rose-300">{adjacencyError}</p>}
          </div>
        </div>

        <div className="app-panel">
          <h2 className="text-xl font-semibold text-app-primary">{config.weighted ? 'Матрица весов' : 'Матрица смежности'}</h2>
          <p className="mt-2 text-sm leading-6 text-app-muted">
            {config.weighted
              ? 'В ячейке на пересечении строки и столбца стоит вес ребра между вершинами; 0 означает, что ребра нет. Измените число — граф обновится сразу.'
              : 'Единица на пересечении строки и столбца означает, что вершины соединены ребром, ноль — что ребра нет. Нажмите на ячейку, чтобы добавить или убрать ребро.'}
          </p>
          {matrix.labels.length === 0 ? (
            <p className="mt-3 text-sm text-app-muted">Граф пуст — матрица появится после добавления вершин.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="border-collapse text-center text-xs">
                <thead>
                  <tr>
                    <th className="h-9 w-9 border border-app bg-surface" />
                    {matrix.labels.map((label) => (
                      <th className="h-9 w-9 border border-app bg-surface font-bold text-app-primary" key={label}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.cells.map((row, rowIndex) => (
                    <tr key={matrix.labels[rowIndex]}>
                      <th className="h-9 w-9 border border-app bg-surface font-bold text-app-primary">{matrix.labels[rowIndex]}</th>
                      {row.map((cell, columnIndex) => {
                        const rowLabel = matrix.labels[rowIndex]!;
                        const columnLabel = matrix.labels[columnIndex]!;
                        if (rowIndex === columnIndex) {
                          return <td className="h-9 w-9 border border-app bg-surface text-app-muted/50" key={columnLabel}>—</td>;
                        }
                        if (config.weighted) {
                          return (
                            <td className="border border-app p-0" key={columnLabel}>
                              <input
                                aria-label={`Вес ребра ${rowLabel}—${columnLabel}`}
                                className={`h-9 w-9 border-0 bg-transparent text-center text-xs outline-none ${cell > 0 ? 'font-bold text-app-primary' : 'text-app-muted/60'}`}
                                disabled={!editable}
                                max={99}
                                min={0}
                                onChange={(event) => commitGraph(setMatrixCell(graph, rowLabel, columnLabel, Number(event.target.value), true))}
                                type="number"
                                value={cell}
                              />
                            </td>
                          );
                        }
                        return (
                          <td className="border border-app p-0" key={columnLabel}>
                            <button
                              aria-label={`Ребро ${rowLabel}—${columnLabel}: ${cell === 1 ? 'есть' : 'нет'}`}
                              className={`h-9 w-9 text-xs font-bold transition ${cell === 1 ? 'bg-accent/30 text-app-primary' : 'text-app-muted/60 hover:bg-accent/10'}`}
                              disabled={!editable}
                              onClick={() => commitGraph(setMatrixCell(graph, rowLabel, columnLabel, cell === 1 ? 0 : 1, false))}
                              type="button"
                            >
                              {cell}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <PlayerControls
        canStepBackward={currentIndex > 0}
        canStepForward={status !== 'completed' && graph.nodes.length > 0}
        currentIndex={currentIndex}
        onNextStep={nextStep}
        onPause={pause}
        onPlay={play}
        onPrevStep={prevStep}
        onReset={() => {
          const generator = algorithm.run(graph, startNodeId);
          const first = generator.next();
          if (first.done) {
            loadAlgorithm(generator);
          } else {
            loadAlgorithm(generator, { initialFrame: first.value });
          }
        }}
        onSpeedChange={setPlaybackSpeed}
        playbackSpeedMs={playbackSpeedMs}
        status={status}
        totalFrames={frames.length}
      />

    </div>
  );
}

interface GraphStatePanelProps {
  readonly config: GraphWorkbenchConfig;
  readonly algorithm: GraphAlgorithmOption;
  readonly frame: GraphAlgorithmFrame | null;
}

function GraphStatePanel({ config, algorithm, frame }: GraphStatePanelProps) {
  if (frame === null) {
    return (
      <aside className="app-panel">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Состояние алгоритма</h3>
        <p className="mt-2 text-sm text-app-muted">Запустите демонстрацию — здесь появятся текущие данные алгоритма с конкретными числами.</p>
      </aside>
    );
  }

  const meta = frame.meta;
  const distanceRows = Array.isArray(meta.distanceRows)
    ? meta.distanceRows as readonly { nodeId: string; distance: string; path: string; isFinal: boolean }[]
    : null;
  const components = Array.isArray(meta.components) ? meta.components as readonly (readonly string[])[] : null;
  const totalWeight = typeof meta.totalWeight === 'number' ? meta.totalWeight : null;
  const mstEdgeIds = Array.isArray(meta.mstEdgeIds) ? meta.mstEdgeIds as readonly string[] : null;

  return (
    <aside className="app-panel">
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Состояние алгоритма</h3>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        {config.needsStart && (
          <>
            <dt className="text-app-muted">Старт</dt>
            <dd className="font-mono text-app-primary">{meta.startNodeId}</dd>
          </>
        )}
        <dt className="text-app-muted">Текущая вершина</dt>
        <dd className="font-mono text-app-primary">{meta.currentNodeId ?? '—'}</dd>
        {algorithm.frontierName !== undefined && (
          <>
            <dt className="text-app-muted">{algorithm.frontierName}</dt>
            <dd className="font-mono text-app-primary">[{meta.frontierNodeIds.join(', ')}]</dd>
          </>
        )}
        {distanceRows === null && components === null && (
          <>
            <dt className="text-app-muted">Посещены</dt>
            <dd className="font-mono text-app-primary">[{meta.visitedNodeIds.join(', ')}]</dd>
          </>
        )}
      </dl>

      {distanceRows !== null && (
        <div className="mt-3 overflow-x-auto rounded-xl border border-app">
          <table className="w-full border-collapse text-center text-xs">
            <thead>
              <tr className="bg-surface text-app-muted">
                <th className="px-2 py-1.5 font-semibold">Вершина</th>
                <th className="px-2 py-1.5 font-semibold">Расстояние</th>
                <th className="px-2 py-1.5 font-semibold">Путь от старта</th>
                <th className="px-2 py-1.5 font-semibold">Зафиксировано</th>
              </tr>
            </thead>
            <tbody>
              {distanceRows.map((row) => (
                <tr className={`border-t border-app ${row.isFinal ? 'text-emerald-300' : 'text-app-muted'}`} key={row.nodeId}>
                  <td className="px-2 py-1 font-mono font-bold">{row.nodeId}</td>
                  <td className="px-2 py-1 font-mono">{row.distance}</td>
                  <td className="px-2 py-1 font-mono text-[11px]">{row.path}</td>
                  <td className="px-2 py-1">{row.isFinal ? 'да' : 'нет'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {components !== null && (
        <div className="mt-3 grid gap-1.5">
          {components.length === 0 ? (
            <p className="text-xs text-app-muted">Компоненты ещё не найдены.</p>
          ) : (
            components.map((members, index) => (
              <p className="rounded-lg border border-app bg-surface px-3 py-1.5 text-xs text-app-muted" key={`component-${index}`}>
                Компонента №{index + 1}: <span className="font-mono text-app-primary">[{members.join(', ')}]</span>
              </p>
            ))
          )}
        </div>
      )}

      {totalWeight !== null && mstEdgeIds !== null && (
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-app-muted">Рёбра остова</dt>
          <dd className="font-mono text-app-primary">{mstEdgeIds.length === 0 ? '—' : mstEdgeIds.join(', ')}</dd>
          <dt className="text-app-muted">Суммарный вес</dt>
          <dd className="font-mono text-app-primary">{totalWeight}</dd>
        </dl>
      )}
    </aside>
  );
}

const isGraphFrame = (frame: AlgorithmFrame<unknown, Record<string, unknown>> | null): frame is GraphAlgorithmFrame =>
  frame?.domain === 'graph' && typeof frame.data === 'object' && frame.data !== null && 'nodes' in frame.data;

const traversalLegend: readonly LegendItem[] = [
  { color: '#7c3aed', label: 'текущая вершина' },
  { color: '#0891b2', label: 'найдена, ждёт обработки' },
  { color: '#059669', label: 'посещена' },
  { color: '#475569', label: 'ещё не найдена' },
  { color: '#facc15', label: 'стартовая вершина (кольцо)' },
  { color: '#a78bfa', label: 'просматриваемое ребро' },
  { color: '#10b981', label: 'ребро дерева обхода' },
];

const bfsPseudocode: readonly PseudocodeLine[] = [
  { code: 'поместить стартовую вершину в очередь и отметить её найденной', note: 'Очередь работает по принципу FIFO: первым пришёл — первым обработан.' },
  { code: 'извлечь вершину из начала очереди', note: 'Из начала — поэтому раньше обрабатываются вершины, найденные раньше.' },
  { code: 'обработать извлечённую вершину', note: 'Здесь вершина окончательно посещается.' },
  { code: 'просмотреть всех соседей текущей вершины', note: 'Соседи — вершины, соединённые с текущей ребром.' },
  { code: 'непосещённого соседа отметить и добавить в конец очереди', note: 'Так формируется следующий «слой» обхода.' },
  { code: 'если очередь пуста — обход завершён', note: 'Все достижимые из старта вершины посещены.' },
];

const dfsPseudocode: readonly PseudocodeLine[] = [
  { code: 'поместить стартовую вершину в стек и отметить её найденной', note: 'Стек работает по принципу LIFO: последним пришёл — первым обработан.' },
  { code: 'снять вершину с вершины стека', note: 'Снимается вершина, добавленная последней, — алгоритм идёт вглубь.' },
  { code: 'обработать снятую вершину', note: 'Здесь вершина окончательно посещается.' },
  { code: 'просмотреть всех соседей текущей вершины', note: 'Соседи — вершины, соединённые с текущей ребром.' },
  { code: 'непосещённого соседа отметить и положить в стек', note: 'Новые вершины лягут поверх старых и обработаются раньше.' },
  { code: 'если стек пуст — обход завершён', note: 'Все достижимые из старта вершины посещены.' },
];

export const graphWorkbenchRoutes: Record<string, GraphWorkbenchConfig> = {
  '/graphs/traversal': {
    route: '/graphs/traversal',
    title: 'Обход графа: поиск в ширину и в глубину',
    weighted: false,
    needsStart: true,
    defaultGraph: {
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
    },
    algorithms: [
      {
        key: 'bfs',
        label: 'Поиск в ширину (BFS)',
        frontierName: 'Очередь',
        pseudocode: bfsPseudocode,
        run: (graph, startNodeId) => bfs({ graph, startNodeId }),
      },
      {
        key: 'dfs',
        label: 'Поиск в глубину (DFS)',
        frontierName: 'Стек',
        pseudocode: dfsPseudocode,
        run: (graph, startNodeId) => dfs({ graph, startNodeId }),
      },
    ],
    legend: traversalLegend,
  },

  '/graphs/components': {
    route: '/graphs/components',
    title: 'Компоненты связности',
    weighted: false,
    needsStart: false,
    defaultGraph: defaultComponentsGraph,
    algorithms: [
      {
        key: 'components',
        label: 'Поиск компонент связности',
        frontierName: 'Стек',
        pseudocode: [
          { code: 'выбрать непосещённую вершину — это начало новой компоненты', note: 'Каждый такой выбор означает, что найдена ещё одна изолированная часть графа.' },
          { code: 'извлечь вершину из стека и добавить её в текущую компоненту', note: 'Обход в глубину собирает все вершины, достижимые из начальной.' },
          { code: 'просмотреть соседей: непосещённых положить в стек', note: 'Так компонента «разрастается» по рёбрам.' },
          { code: 'когда непосещённых вершин не осталось — вывести список компонент', note: 'Количество запусков обхода равно количеству компонент.' },
        ],
        run: (graph) => connectedComponents(graph),
      },
    ],
    legend: [
      { color: '#7c3aed', label: 'текущая вершина' },
      { color: '#0891b2', label: 'в стеке обхода' },
      { color: '#059669', label: 'отнесена к компоненте' },
      { color: '#475569', label: 'ещё не обработана' },
      { color: '#10b981', label: 'ребро внутри компоненты' },
      { color: '#a78bfa', label: 'просматриваемое ребро' },
    ],
  },

  '/graphs/dijkstra': {
    route: '/graphs/dijkstra',
    title: 'Алгоритм Дейкстры: кратчайшие пути',
    weighted: true,
    needsStart: true,
    defaultGraph: defaultWeightedGraph,
    algorithms: [
      {
        key: 'dijkstra',
        label: 'Алгоритм Дейкстры',
        pseudocode: [
          { code: 'расстояние до старта = 0, до остальных вершин = ∞', note: '∞ означает «путь пока не найден»; любое настоящее расстояние меньше.' },
          { code: 'выбрать необработанную вершину с минимальной оценкой и зафиксировать её', note: 'Её расстояние уже не может уменьшиться — другие пути шли бы через более далёкие вершины.' },
          { code: 'для каждого соседа посчитать путь через текущую вершину', note: 'Это называется релаксацией ребра: расстояние до вершины + вес ребра.' },
          { code: 'если новый путь короче — обновить оценку соседа', note: 'Запоминается и ребро, по которому пришёл лучший путь.' },
          { code: 'повторять, пока все вершины не зафиксированы', note: 'В конце все оценки — точные кратчайшие расстояния от старта.' },
        ],
        run: (graph, startNodeId) => dijkstra(graph, startNodeId),
      },
    ],
    legend: [
      { color: '#7c3aed', label: 'текущая вершина' },
      { color: '#0891b2', label: 'есть оценка, не зафиксирована' },
      { color: '#059669', label: 'расстояние зафиксировано' },
      { color: '#475569', label: 'оценка ∞' },
      { color: '#facc15', label: 'стартовая вершина (кольцо)' },
      { color: '#a78bfa', label: 'релаксируемое ребро' },
      { color: '#10b981', label: 'ребро лучшего пути' },
    ],
  },

  '/graphs/mst': {
    route: '/graphs/mst',
    title: 'Минимальное остовное дерево (алгоритм Краскала)',
    weighted: true,
    needsStart: false,
    defaultGraph: defaultWeightedGraph,
    algorithms: [
      {
        key: 'mst',
        label: 'Алгоритм Краскала',
        pseudocode: [
          { code: 'отсортировать все рёбра по возрастанию веса', note: 'Жадная стратегия: сначала рассматриваются самые дешёвые рёбра.' },
          { code: 'взять очередное ребро и проверить, не создаст ли оно цикл', note: 'Цикл возникает, если обе вершины ребра уже соединены через выбранные рёбра.' },
          { code: 'если цикла нет — добавить ребро в остов', note: 'Две группы вершин объединяются в одну.' },
          { code: 'остановиться, когда выбрано (V − 1) рёбер', note: 'V — число вершин: дерево из V вершин всегда содержит ровно V − 1 ребро.' },
        ],
        run: (graph) => mstKruskal(graph),
      },
    ],
    legend: [
      { color: '#a78bfa', label: 'проверяемое ребро' },
      { color: '#10b981', label: 'ребро в остове' },
      { color: '#059669', label: 'вершина соединена с остовом' },
      { color: '#475569', label: 'вершина вне остова' },
    ],
  },
};
