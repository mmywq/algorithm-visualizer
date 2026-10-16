import { Bookmark, Dices, Eraser, LayoutDashboard, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createNextNodeId, GraphCanvas } from '@/components/visualizers/graphs/GraphCanvas';
import { toast } from '@/components/ui/Toaster';
import { Tabs } from '@/components/ui/Tabs';
import { useOptionalAlgorithm } from '@/features/algorithm/AlgorithmContext';
import { DemoLayout } from '@/features/demo/DemoLayout';
import type { LegendItem } from '@/features/demo/Legend';
import { useDemoPlayer } from '@/features/player/useDemoPlayer';
import { useFrames } from '@/features/player/usePlayer';
import {
  decodeGraphParam,
  encodeGraphParam,
  generateRandomGraph,
  getGraphStructureKey,
  graphToMatrix,
  isValidNodeLabel,
  MAX_GRAPH_NODES,
  normalizeGraph,
  parseAdjacencyList,
  serializeAdjacencyList,
  setMatrixCell,
  type GraphKind,
} from '@/lib/graphEditing';
import { GRAPH_CANVAS_HEIGHT, GRAPH_CANVAS_WIDTH, layoutGraph } from '@/lib/graphLayout';
import { pluralize } from '@/lib/progress';
import { useUserStore } from '@/stores/userStore';
import type { GraphAlgorithmFrame, GraphSnapshot, NodeId, PseudocodeLine } from '@/types';
import { countOf } from '@/lib/plural';

export interface GraphAlgorithmOption {
  readonly key: string;
  readonly label: string;
  readonly frontierName?: string;
  readonly pseudocode: readonly PseudocodeLine[];
  readonly run: (graph: GraphSnapshot, startNodeId: NodeId, targetNodeId: NodeId) => Generator<GraphAlgorithmFrame, unknown, unknown>;
}

export interface GraphDemoConfig {
  readonly kind: GraphKind & { readonly acyclic?: boolean };
  readonly needsStart: boolean;
  readonly needsTarget?: boolean;
  readonly defaultGraph: GraphSnapshot;
  readonly algorithms: readonly GraphAlgorithmOption[];
  readonly legend: readonly LegendItem[];
  readonly statePanel?: (frame: GraphAlgorithmFrame | null, algorithm: GraphAlgorithmOption) => ReactNode;
  readonly hint?: string;
}

const prepareDefault = (graph: GraphSnapshot, directed: boolean): GraphSnapshot =>
  normalizeGraph({ nodes: layoutGraph(graph.nodes, graph.edges), edges: graph.edges }, directed);

export function GraphDemo({ config }: { readonly config: GraphDemoConfig }) {
  const { kind } = config;
  const algorithmContext = useOptionalAlgorithm();
  const markCustomInput = useUserStore((state) => state.markCustomInput);
  const [params, setParams] = useSearchParams();
  const [graph, setGraph] = useState<GraphSnapshot>(() => {
    const raw = params.get('g');
    const decoded = raw === null ? null : decodeGraphParam(raw, kind);
    return decoded ?? prepareDefault(config.defaultGraph, kind.directed);
  });
  const [algorithmKey, setAlgorithmKey] = useState(() => params.get('alg') ?? config.algorithms[0]!.key);
  const [startNodeId, setStartNodeId] = useState<NodeId>(() => params.get('st') ?? graph.nodes[0]?.id ?? 'A');
  const [targetNodeId, setTargetNodeId] = useState<NodeId>(() => params.get('to') ?? graph.nodes[graph.nodes.length - 1]?.id ?? 'A');

  const algorithm = config.algorithms.find((option) => option.key === algorithmKey) ?? config.algorithms[0]!;
  const structureKey = useMemo(() => getGraphStructureKey(graph), [graph]);

  // кадры зависят только от структуры графа: перетаскивание вершин не перезапускает демонстрацию
  const graphRef = useRef(graph);
  graphRef.current = graph;
  const frameSet = useFrames<GraphAlgorithmFrame>(
    () => algorithm.run(graphRef.current, startNodeId, targetNodeId),
    [structureKey, algorithm, startNodeId, targetNodeId],
  );
  const player = useDemoPlayer(frameSet);
  const editable = !player.isPlaying;

  useEffect(() => {
    if (graph.nodes.length === 0) return;
    if (!graph.nodes.some((node) => node.id === startNodeId)) setStartNodeId(graph.nodes[0]!.id);
    if (!graph.nodes.some((node) => node.id === targetNodeId)) setTargetNodeId(graph.nodes[graph.nodes.length - 1]!.id);
  }, [graph, startNodeId, targetNodeId]);

  // граф, алгоритм и стартовая вершина попадают в ссылку (с небольшой задержкой);
  // пока всё как в примере, адрес остаётся коротким
  const defaultEncoded = useMemo(() => encodeGraphParam(prepareDefault(config.defaultGraph, kind.directed), kind), [config.defaultGraph, kind]);
  const defaultStart = config.defaultGraph.nodes[0]?.id;
  const defaultTarget = config.defaultGraph.nodes[config.defaultGraph.nodes.length - 1]?.id;
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const encoded = encodeGraphParam(graphRef.current, kind);
      const write = (next: URLSearchParams, key: string, value: string, fallback: string | undefined): void => {
        if (value === fallback) next.delete(key);
        else next.set(key, value);
      };
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          write(next, 'g', encoded, defaultEncoded);
          if (config.needsStart) write(next, 'st', startNodeId, defaultStart);
          if (config.needsTarget === true) write(next, 'to', targetNodeId, defaultTarget);
          if (config.algorithms.length > 1) write(next, 'alg', algorithm.key, config.algorithms[0]!.key);
          if (next.toString() === previous.toString()) return previous;
          next.delete('s');
          return next;
        },
        { replace: true },
      );
    }, 400);
    return () => window.clearTimeout(timer);
  }, [
    structureKey,
    startNodeId,
    targetNodeId,
    algorithm.key,
    kind,
    config.needsStart,
    config.needsTarget,
    config.algorithms,
    defaultEncoded,
    defaultStart,
    defaultTarget,
    setParams,
  ]);

  const commitGraph = (next: GraphSnapshot, custom = true): void => {
    setGraph(normalizeGraph(next, kind.directed));
    if (custom && algorithmContext !== null) markCustomInput(algorithmContext.entry.id);
  };

  const nodeSelect = (value: NodeId, onChange: (id: NodeId) => void, label: string) => (
    <label className="flex items-center gap-2 text-sm font-extrabold text-ink-2">
      {label}
      <select
        className="input input-sm w-auto pr-8 font-mono"
        disabled={graph.nodes.length === 0}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {graph.nodes.map((node) => (
          <option key={node.id} value={node.id}>
            {node.label}
          </option>
        ))}
      </select>
    </label>
  );

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2.5">
      {config.algorithms.length > 1 && (
        <Tabs
          ariaLabel="Алгоритм"
          items={config.algorithms.map((option) => ({ value: option.key, label: option.label }))}
          onChange={setAlgorithmKey}
          size="sm"
          value={algorithm.key}
        />
      )}
      {config.needsStart && nodeSelect(startNodeId, setStartNodeId, 'Старт')}
      {config.needsTarget === true && nodeSelect(targetNodeId, setTargetNodeId, 'Цель')}
    </div>
  );

  return (
    <DemoLayout
      aside={config.statePanel?.(player.frame, algorithm) ?? <GraphStatePanel algorithm={algorithm} frame={player.frame} needsStart={config.needsStart} />}
      below={<GraphTextEditors graph={graph} kind={kind} onChange={(next) => commitGraph(next)} editable={editable} />}
      data={{
        title: 'Граф',
        summary: `${graph.nodes.length} ${pluralize(graph.nodes.length, 'вершина', 'вершины', 'вершин')}, ${graph.edges.length} ${pluralize(graph.edges.length, 'ребро', 'ребра', 'рёбер')}`,
        editor: <GraphEditorPanel config={config} graph={graph} onChange={commitGraph} />,
      }}
      legend={config.legend}
      player={player}
      pseudocode={algorithm.pseudocode}
      resultInput={`граф из ${countOf(graph.nodes.length, 'вершины', 'вершин', 'вершин')} и ${countOf(graph.edges.length, 'ребра', 'рёбер', 'рёбер')}${config.needsStart ? `, старт ${startNodeId}` : ''}${config.needsTarget === true ? `, цель ${targetNodeId}` : ''}`}
      stage={
        <div>
          <GraphCanvas
            editable={editable}
            frame={player.frame}
            graph={graph}
            kind={kind}
            onGraphChange={(next) => commitGraph(next)}
            startNodeId={config.needsStart ? startNodeId : undefined}
            targetNodeId={config.needsTarget === true ? targetNodeId : undefined}
          />
          <p className="mt-2 px-1 text-[13px] font-bold text-ink-3">
            {editable
              ? `Вершины можно перетаскивать. Коснитесь двух вершин, чтобы ${kind.directed ? 'провести ребро от первой ко второй' : 'соединить их'}; двойной щелчок по полю добавит вершину.`
              : 'Идёт демонстрация — редактирование доступно на паузе.'}
          </p>
        </div>
      }
      toolbar={toolbar}
    />
  );
}

function GraphEditorPanel({
  config,
  graph,
  onChange,
}: {
  readonly config: GraphDemoConfig;
  readonly graph: GraphSnapshot;
  readonly onChange: (graph: GraphSnapshot, custom?: boolean) => void;
}) {
  const { kind } = config;
  const presets = useUserStore((state) => state.data.presets);
  const savePreset = useUserStore((state) => state.savePreset);
  const removePreset = useUserStore((state) => state.removePreset);
  const [count, setCount] = useState(7);
  const [density, setDensity] = useState(0.3);
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const graphPresets = presets.filter((preset) => preset.kind === 'graph').slice(0, 8);

  const addNode = (): void => {
    const id = label.trim() || createNextNodeId(graph);
    if (!isValidNodeLabel(id)) return setError(`Метка «${id}» не подходит: до 6 латинских букв, цифр, _ или -.`);
    if (graph.nodes.some((node) => node.id === id)) return setError(`Вершина «${id}» уже есть.`);
    if (graph.nodes.length >= MAX_GRAPH_NODES) return setError(`Достигнут предел — ${countOf(MAX_GRAPH_NODES, 'вершина', 'вершины', 'вершин')}.`);
    const angle = Math.random() * Math.PI * 2;
    setError(null);
    setLabel('');
    onChange({
      nodes: [
        ...graph.nodes,
        { id, label: id, position: { x: GRAPH_CANVAS_WIDTH / 2 + Math.cos(angle) * 140, y: GRAPH_CANVAS_HEIGHT / 2 + Math.sin(angle) * 110 }, payload: {} },
      ],
      edges: graph.edges,
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="label">Быстрые действия</p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm font-bold text-ink-2">
            Вершин
            <input
              className="input input-sm mt-1 block w-20"
              max={MAX_GRAPH_NODES}
              min={2}
              onChange={(event) => setCount(Number(event.target.value))}
              type="number"
              value={count}
            />
          </label>
          <label className="text-sm font-bold text-ink-2">
            Плотность
            <input
              className="mt-1 block w-28 accent-[rgb(var(--cat))]"
              max={0.8}
              min={0}
              onChange={(event) => setDensity(Number(event.target.value))}
              step={0.05}
              type="range"
              value={density}
            />
          </label>
          <button className="btn btn-primary btn-sm" onClick={() => onChange(generateRandomGraph(count, density, kind))} type="button">
            <Dices size={16} strokeWidth={2.5} />
            Случайный граф
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => onChange(prepareDefault(config.defaultGraph, kind.directed), false)} type="button">
            <RotateCcw size={16} strokeWidth={2.5} />
            Пример
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onChange({ nodes: layoutGraph(graph.nodes, graph.edges), edges: graph.edges }, false)}
            type="button"
          >
            <LayoutDashboard size={16} strokeWidth={2.5} />
            Разложить
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onChange({ nodes: [], edges: [] })} type="button">
            <Eraser size={16} strokeWidth={2.5} />
            Очистить
          </button>
        </div>
      </div>

      <div>
        <p className="label">Вершины</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            aria-label="Метка новой вершины"
            className="input input-sm w-32 font-mono"
            onChange={(event) => setLabel(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && addNode()}
            placeholder="Метка"
            value={label}
          />
          <button className="btn btn-secondary btn-sm" onClick={addNode} type="button">
            <Plus size={16} strokeWidth={2.5} />
            Добавить
          </button>
          {graph.nodes.length > 0 && (
            <select
              aria-label="Удалить вершину"
              className="input input-sm w-auto pr-8"
              onChange={(event) => {
                const id = event.target.value;
                if (id.length === 0) return;
                onChange({
                  nodes: graph.nodes.filter((node) => node.id !== id),
                  edges: graph.edges.filter((edge) => edge.source !== id && edge.target !== id),
                });
              }}
              value=""
            >
              <option value="">Удалить вершину…</option>
              {graph.nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.label}
                </option>
              ))}
            </select>
          )}
        </div>
        {error !== null && <p className="mt-1.5 text-sm font-bold text-red">{error}</p>}
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="label mb-0">Мои графы</p>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              savePreset('graph', '', graph);
              toast.success('Граф сохранён', 'Его можно открыть на любой странице с графами.');
            }}
            type="button"
          >
            <Bookmark size={16} strokeWidth={2.5} />
            Сохранить текущий
          </button>
        </div>
        {graphPresets.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {graphPresets.map((preset) => (
              <li className="inline-flex items-center rounded-xl border-2 border-line bg-surface" key={preset.id}>
                <button
                  className="h-9 max-w-[200px] truncate px-3 text-sm font-bold text-ink hover:text-brand"
                  onClick={() => {
                    const value = preset.value as GraphSnapshot;
                    const edges = kind.weighted
                      ? value.edges.map((edge) => (edge.weight === undefined ? { ...edge, weight: 1 } : edge))
                      : value.edges.map(({ weight: _weight, ...edge }) => edge);
                    onChange({ nodes: value.nodes, edges });
                  }}
                  type="button"
                >
                  {preset.name}
                </button>
                <button
                  aria-label={`Удалить «${preset.name}»`}
                  className="h-9 pl-1 pr-2.5 text-ink-3 hover:text-red"
                  onClick={() => removePreset(preset.id)}
                  type="button"
                >
                  <Trash2 size={14} strokeWidth={2.5} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {config.hint !== undefined && <p className="text-sm font-semibold text-ink-3">{config.hint}</p>}
    </div>
  );
}

function GraphTextEditors({
  graph,
  kind,
  onChange,
  editable,
}: {
  readonly graph: GraphSnapshot;
  readonly kind: GraphKind;
  readonly onChange: (graph: GraphSnapshot) => void;
  readonly editable: boolean;
}) {
  const [draft, setDraft] = useState(() => serializeAdjacencyList(graph, kind));
  const [error, setError] = useState<string | null>(null);
  const matrix = useMemo(() => graphToMatrix(graph, kind.directed), [graph, kind.directed]);

  useEffect(() => {
    setDraft(serializeAdjacencyList(graph, kind));
    setError(null);
  }, [graph, kind]);

  const apply = (): void => {
    const parsed = parseAdjacencyList(draft, kind);
    if (!parsed.ok || parsed.graph === undefined) return setError(parsed.error ?? 'Не удалось разобрать список.');
    const positions = new Map(graph.nodes.map((node) => [node.id, node.position]));
    const keepAll = parsed.graph.nodes.every((node) => positions.has(node.id));
    setError(null);
    onChange({
      nodes: keepAll ? parsed.graph.nodes.map((node) => ({ ...node, position: positions.get(node.id)! })) : parsed.graph.nodes,
      edges: parsed.graph.edges,
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card p-5">
        <h3 className="text-[17px] font-black text-ink">Список смежности</h3>
        <p className="mt-1 text-sm font-semibold leading-6 text-ink-2">
          Строка — вершина и её {kind.directed ? 'исходящие рёбра' : 'соседи'}
          {kind.weighted ? '; вес в скобках: B(4)' : ''}. Отредактируйте и нажмите «Применить».
        </p>
        <textarea
          aria-label="Список смежности"
          className="input mt-3 h-44 font-mono text-[13px]"
          onChange={(event) => setDraft(event.target.value)}
          spellCheck={false}
          value={draft}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button className="btn btn-secondary btn-sm" disabled={!editable} onClick={apply} type="button">
            Применить
          </button>
          {error !== null && <p className="text-sm font-bold text-red">{error}</p>}
        </div>
      </section>

      <section className="card p-5">
        <h3 className="text-[17px] font-black text-ink">{kind.weighted ? 'Матрица весов' : 'Матрица смежности'}</h3>
        <p className="mt-1 text-sm font-semibold leading-6 text-ink-2">
          {kind.weighted ? 'В ячейке — вес ребра, пусто — ребра нет.' : '1 — вершины соединены, 0 — нет. Нажмите на ячейку, чтобы переключить.'}
          {kind.directed ? ' Строка — откуда, столбец — куда.' : ''}
        </p>
        {matrix.labels.length === 0 ? (
          <p className="mt-3 text-sm font-bold text-ink-3">Граф пуст.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="border-separate border-spacing-1 text-center font-mono text-[13px]">
              <thead>
                <tr>
                  <th className="h-9 w-9" />
                  {matrix.labels.map((label) => (
                    <th className="h-9 w-9 font-black text-ink-2" key={label} scope="col">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.cells.map((row, rowIndex) => {
                  const rowLabel = matrix.labels[rowIndex]!;
                  return (
                    <tr key={rowLabel}>
                      <th className="h-9 w-9 font-black text-ink-2" scope="row">
                        {rowLabel}
                      </th>
                      {row.map((cell, columnIndex) => {
                        const columnLabel = matrix.labels[columnIndex]!;
                        if (rowIndex === columnIndex)
                          return (
                            <td className="h-9 w-9 rounded-lg bg-surface-2 text-ink-3" key={columnLabel}>
                              ·
                            </td>
                          );
                        if (kind.weighted) {
                          return (
                            <td className="p-0" key={columnLabel}>
                              <input
                                aria-label={`Вес ${rowLabel}${kind.directed ? '→' : '—'}${columnLabel}`}
                                className={`h-9 w-11 rounded-lg border-2 text-center font-bold outline-none focus:border-brand ${cell !== null ? 'border-cat/40 bg-cat/10 text-ink' : 'border-line bg-surface text-ink-3'}`}
                                defaultValue={cell ?? ''}
                                disabled={!editable}
                                inputMode="numeric"
                                key={`${columnLabel}-${cell ?? 'none'}`}
                                onBlur={(event) => {
                                  const raw = event.target.value.trim();
                                  if (raw === (cell === null ? '' : String(cell))) return;
                                  if (raw === '') onChange(setMatrixCell(graph, rowLabel, columnLabel, null, kind));
                                  else if (/^-?\d{1,2}$/.test(raw)) onChange(setMatrixCell(graph, rowLabel, columnLabel, Number(raw), kind));
                                  else event.target.value = cell === null ? '' : String(cell);
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
                                }}
                              />
                            </td>
                          );
                        }
                        return (
                          <td className="p-0" key={columnLabel}>
                            <button
                              aria-label={`Ребро ${rowLabel}${kind.directed ? '→' : '—'}${columnLabel}: ${cell !== null ? 'есть' : 'нет'}`}
                              className={`h-9 w-9 rounded-lg border-2 font-bold transition-colors ${cell !== null ? 'border-cat/50 bg-cat text-on' : 'border-line bg-surface text-ink-3 hover:border-line-strong'}`}
                              disabled={!editable}
                              onClick={() => onChange(setMatrixCell(graph, rowLabel, columnLabel, cell !== null ? null : 1, kind))}
                              type="button"
                            >
                              {cell !== null ? 1 : 0}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/** Состояние алгоритма на графе: текущая вершина, очередь или стек, посещённые, таблицы расстояний. */
export function GraphStatePanel({
  frame,
  algorithm,
  needsStart,
}: {
  readonly frame: GraphAlgorithmFrame | null;
  readonly algorithm: GraphAlgorithmOption;
  readonly needsStart: boolean;
}) {
  if (frame === null) return null;
  const meta = frame.meta;
  const distanceRows = Array.isArray(meta.distanceRows)
    ? (meta.distanceRows as readonly { nodeId: string; distance: string; path: string; isFinal: boolean }[])
    : null;
  const components = Array.isArray(meta.components) ? (meta.components as readonly (readonly string[])[]) : null;
  const totalWeight = typeof meta.totalWeight === 'number' ? meta.totalWeight : null;
  const mstEdgeIds = Array.isArray(meta.mstEdgeIds) ? (meta.mstEdgeIds as readonly string[]) : null;
  const order = Array.isArray(meta.order) ? (meta.order as readonly string[]) : null;

  return (
    <section className="card flex flex-col gap-3 p-4 sm:p-5">
      <h3 className="text-[15px] font-black text-ink">Состояние алгоритма</h3>
      <div className="grid grid-cols-2 gap-2">
        {needsStart && <Stat label="Старт" value={meta.startNodeId} />}
        <Stat label="Текущая вершина" value={meta.currentNodeId ?? '—'} />
      </div>
      {algorithm.frontierName !== undefined && <ChipRow color="cyan" items={meta.frontierNodeIds} label={algorithm.frontierName} />}
      {distanceRows === null && components === null && <ChipRow color="green" items={meta.visitedNodeIds} label="Посещены" />}
      {order !== null && <ChipRow color="orange" items={order} label={(meta.orderLabel as string | undefined) ?? 'Порядок'} />}

      {distanceRows !== null && (
        <div className="overflow-x-auto rounded-2xl border-2 border-line">
          <table className="w-full border-collapse text-center text-[13px]">
            <thead>
              <tr className="bg-surface-2 font-extrabold text-ink-2">
                <th className="px-2 py-2" scope="col">
                  Вершина
                </th>
                <th className="px-2 py-2" scope="col">
                  Расстояние
                </th>
                <th className="px-2 py-2" scope="col">
                  Путь
                </th>
              </tr>
            </thead>
            <tbody>
              {distanceRows.map((row) => (
                <tr className={`border-t-2 border-line ${row.isFinal ? 'bg-green/8' : ''}`} key={row.nodeId}>
                  <td className="px-2 py-1.5 font-mono font-black text-ink">{row.nodeId}</td>
                  <td className={`px-2 py-1.5 font-mono font-black ${row.isFinal ? 'text-green' : 'text-ink-2'}`}>{row.distance}</td>
                  <td className="px-2 py-1.5 font-mono text-[12px] font-bold text-ink-2">{row.path}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {components !== null && (
        <div className="flex flex-col gap-1.5">
          {components.length === 0 && <p className="text-sm font-bold text-ink-3">Компоненты ещё не найдены</p>}
          {components.map((members, index) => (
            <p className="rounded-xl bg-surface-2 px-3 py-2 text-[13px] font-bold text-ink-2" key={`component-${index}`}>
              Компонента {index + 1}: <span className="font-mono font-black text-ink">{members.join(', ')}</span>
            </p>
          ))}
        </div>
      )}

      {totalWeight !== null && mstEdgeIds !== null && (
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Рёбер в остове" value={String(mstEdgeIds.length)} />
          <Stat label="Суммарный вес" value={String(totalWeight)} />
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-3 py-2.5">
      <p className="text-[12px] font-extrabold text-ink-3">{label}</p>
      <p className="font-mono text-lg font-black text-ink">{value}</p>
    </div>
  );
}

export function ChipRow({ label, items, color }: { readonly label: string; readonly items: readonly string[]; readonly color: string }) {
  return (
    <div>
      <p className="mb-1.5 text-[12px] font-extrabold text-ink-3">{label}</p>
      <div className="flex min-h-8 flex-wrap gap-1.5">
        {items.length === 0 && <span className="text-sm font-bold text-ink-3">пусто</span>}
        {items.map((item, index) => (
          <span
            className="rounded-lg px-2 py-0.5 font-mono text-[13px] font-black text-on"
            key={`${item}-${index}`}
            style={{ background: `rgb(var(--c-${color}))`, boxShadow: `inset 0 -3px 0 rgb(var(--c-${color}-press))` }}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
