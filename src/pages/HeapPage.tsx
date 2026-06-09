import { useEffect, useMemo, useState } from 'react';
import { heapExtractMinScenario, heapScenario } from '@/algorithms/structures/extendedStructures';
import { PlayerControls } from '@/components/player/PlayerControls';
import { StructureVisualizer } from '@/components/visualizers/structures/StructureVisualizer';
import { loadStructurePresets, saveStructurePreset } from '@/lib/storage';
import { useAlgorithmPlayerStore } from '@/stores';
import type { AlgorithmFrame, StructureAlgorithmFrame } from '@/types';

export function HeapPage() {
  const [manualInput, setManualInput] = useState('40, 15, 60, 5, 30, 55');
  const [values, setValues] = useState<readonly number[]>([40, 15, 60, 5, 30, 55]);
  const [inputError, setInputError] = useState<string | null>(null);
  const [presets, setPresets] = useState(loadStructurePresets());

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

  useEffect(() => {
    runBuild(values, loadAlgorithm);
  }, [values, loadAlgorithm]);

  const frame = isStructureFrame(currentFrame) ? currentFrame : null;
  const history = useMemo(() => frames.map((f) => f.description ?? f.message), [frames]);

  const applyManual = () => {
    const parsed = manualInput.split(',').map((v) => v.trim()).filter(Boolean).map(Number);
    if (parsed.length < 3 || parsed.length > 12 || parsed.some((v) => Number.isInteger(v) === false || Number.isFinite(v) === false)) {
      setInputError('Введите от 3 до 12 целых чисел через запятую.');
      return;
    }
    setInputError(null);
    setValues(parsed);
  };

  const randomValues = () => {
    const next = Array.from({ length: 7 }, () => Math.floor(Math.random() * 201) - 100);
    setValues(next);
    setManualInput(next.join(', '));
  };

  const runExtractMin = () => {
    const generator = heapExtractMinScenario(values);
    const first = generator.next();
    if (first.done) loadAlgorithm(generator); else loadAlgorithm(generator, { initialFrame: first.value });
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <section className="app-panel">
        <h1 className="text-3xl font-bold text-app-primary">Бинарная куча (Heap)</h1>
        <p className="mt-2 text-sm leading-6 text-app-muted">Бинарная куча — почти полное бинарное дерево, которое удобно хранить в массиве: для узла с индексом i левый ребёнок находится в 2i+1, правый — в 2i+2, родитель — в floor((i−1)/2). В min-heap значение каждого родителя не больше значений его детей, поэтому минимальный элемент всегда расположен в корне.</p>
        <p className="mt-2 text-sm leading-6 text-app-muted">Раздел показывает две основные операции. При вставке новый элемент помещается в первую свободную позицию и поднимается вверх процедурой sift-up, пока не восстановится порядок родитель ≤ ребёнок. При извлечении минимума корень удаляется, последний элемент переносится в корень и опускается вниз процедурой sift-down.</p>
        <p className="mt-2 text-sm text-app-muted">Зачем нужна куча: она реализует очередь с приоритетом, где можно быстро получить задачу с минимальным приоритетом. Сложность вставки и извлечения корня — O(log n), просмотр корня — O(1).</p>
        <div className="mt-4 grid gap-3 rounded-2xl border border-app bg-surface p-4">
          <div className="flex flex-wrap gap-2">
            <input className="control-input min-w-[360px]" value={manualInput} onChange={(e) => setManualInput(e.target.value)} />
            <button className="control-button" type="button" onClick={applyManual}>Применить значения</button>
            <button className="control-button" type="button" onClick={randomValues}>Случайные значения −100…100</button>
            <button className="control-button" type="button" onClick={() => { saveStructurePreset('Heap набор', values); setPresets(loadStructurePresets()); }}>Сохранить пресет</button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="control-button control-button-primary" type="button" onClick={() => runBuild(values, loadAlgorithm)}>Построить min-heap</button>
            <button className="control-button" type="button" onClick={runExtractMin}>Извлечь минимум</button>
          </div>
          {inputError && <p className="text-sm text-rose-300">{inputError}</p>}
          {presets.length > 0 && <div className="flex flex-wrap gap-2">{presets.slice(0, 6).map((preset) => <button key={preset.id} className="control-button" type="button" onClick={() => { setValues(preset.values); setManualInput(preset.values.join(', ')); }}>{preset.name}</button>)}</div>}
        </div>
      </section>

      <section className="app-panel">
        <h3 className="text-xl font-semibold text-app-primary">Псевдокод операций с min-heap</h3>
        <div className="mt-3 space-y-1 text-sm text-app-muted">
          {['вставить элемент в конец массива кучи', 'сравнить элемент с родителем', 'если родитель больше, поменять их местами', 'повторять sift-up до корня или правильного порядка', 'при extract-min заменить корень последним элементом', 'выполнять sift-down через меньшего ребёнка до восстановления свойства кучи'].map((line, index) => (
            <p className={frame?.pseudocode.line === index + 1 ? 'font-semibold text-cyan-200' : ''} key={line}>{index + 1}. {line}</p>
          ))}
        </div>
      </section>

      <StructureVisualizer frame={frame} />

      {status === 'completed' && history.length > 0 && (
        <section className="app-panel">
          <h3 className="text-xl font-semibold text-app-primary">Полный список выполненных шагов</h3>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-app-muted">{history.map((h, idx) => <li key={`${idx}-${h}`}>{h}</li>)}</ol>
        </section>
      )}

      <PlayerControls canStepBackward={currentIndex > 0} canStepForward={status !== 'completed'} currentIndex={currentIndex} onNextStep={nextStep} onPause={pause} onPlay={play} onPrevStep={prevStep} onReset={() => runBuild(values, loadAlgorithm)} onSpeedChange={setPlaybackSpeed} playbackSpeedMs={playbackSpeedMs} status={status} totalFrames={frames.length} />
    </div>
  );
}

const runBuild = (values: readonly number[], loadAlgorithm: ReturnType<typeof useAlgorithmPlayerStore.getState>['loadAlgorithm']) => {
  const generator = heapScenario(values);
  const first = generator.next();
  if (first.done) loadAlgorithm(generator); else loadAlgorithm(generator, { initialFrame: first.value });
};

const isStructureFrame = (frame: AlgorithmFrame<unknown, Record<string, unknown>> | null): frame is StructureAlgorithmFrame =>
  (frame?.domain === 'tree' || frame?.domain === 'array') && typeof frame.data === 'object' && frame.data !== null && 'cells' in frame.data;
