import { useEffect, useMemo, useState } from 'react';
import { bstScenario, bstSearchScenario } from '@/algorithms/structures/extendedStructures';
import { PlayerControls } from '@/components/player/PlayerControls';
import { StepHistoryPanel } from '@/components/player/StepHistoryPanel';
import { StructureVisualizer } from '@/components/visualizers/structures/StructureVisualizer';
import { loadStructurePresets, saveStructurePreset } from '@/lib/storage';
import { useAlgorithmPlayerStore } from '@/stores';
import type { AlgorithmFrame, StructureAlgorithmFrame } from '@/types';

export function BstPage() {
  const [manualInput, setManualInput] = useState('50, 30, 70, 20, 40, 60, 80');
  const [values, setValues] = useState<readonly number[]>([50, 30, 70, 20, 40, 60, 80]);
  const [inputError, setInputError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('40');
  const [searchError, setSearchError] = useState<string | null>(null);
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
    run(values, loadAlgorithm);
  }, [values, loadAlgorithm]);

  const frame = isStructureFrame(currentFrame) ? currentFrame : null;
  const history = useMemo(() => frames.map((f) => f.description ?? f.message), [frames]);
  const searchTarget = searchInput.trim();

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
    const set = new Set<number>();
    while (set.size < 7) set.add(Math.floor(Math.random() * 201) - 100);
    const next = [...set];
    setValues(next);
    setManualInput(next.join(', '));
  };

  const runSearch = () => {
    const parsed = Number(searchTarget);
    if (searchTarget.length === 0 || Number.isInteger(parsed) === false || Number.isFinite(parsed) === false) {
      setSearchError('Введите целое число для поиска в BST.');
      return;
    }
    setSearchError(null);
    const generator = bstSearchScenario(values, parsed);
    const first = generator.next();
    if (first.done) loadAlgorithm(generator); else loadAlgorithm(generator, { initialFrame: first.value });
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <section className="app-panel">
        <h1 className="text-3xl font-bold text-app-primary">Двоичное дерево поиска (BST)</h1>
        <p className="mt-2 text-sm leading-6 text-app-muted">BST (Binary Search Tree, двоичное дерево поиска) — бинарное дерево, в котором для каждого узла значения в левом поддереве меньше ключа узла, а значения в правом поддереве больше или равны ключу узла. Такая организация делает поиск последовательностью сравнений от корня к листу. Если дерево сбалансировано, глубина остаётся небольшой и основные операции выполняются быстро; если дерево вырождается в цепочку, время поиска становится линейным.</p>
        <p className="mt-2 text-sm leading-6 text-app-muted">После построения дерева можно запустить интерактивный поиск: алгоритм сравнивает искомый ключ с текущим узлом, подсвечивает его и переходит влево или вправо, пока не найдёт значение или не придёт в пустую позицию.</p>
        <p className="mt-2 text-sm text-app-muted">Сложность операций: в среднем O(log n), в худшем случае O(n), если дерево вырождается в цепочку.</p>
        <div className="mt-4 grid gap-3 rounded-2xl border border-app bg-surface p-4">
          <div className="flex flex-wrap gap-2">
            <input className="control-input min-w-[360px]" value={manualInput} onChange={(e) => setManualInput(e.target.value)} />
            <button className="control-button" type="button" onClick={applyManual}>Применить значения</button>
            <button className="control-button" type="button" onClick={randomValues}>Случайные значения −100…100</button>
            <button className="control-button" type="button" onClick={() => { saveStructurePreset('BST набор', values); setPresets(loadStructurePresets()); }}>Сохранить пресет</button>
          </div>
          {inputError && <p className="text-sm text-rose-300">{inputError}</p>}
          {presets.length > 0 && <div className="flex flex-wrap gap-2">{presets.slice(0, 6).map((preset) => <button key={preset.id} className="control-button" type="button" onClick={() => { setValues(preset.values); setManualInput(preset.values.join(', ')); }}>{preset.name}</button>)}</div>}
        </div>

        <div className="mt-4 grid gap-3 rounded-2xl border border-app bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-app-muted">Найти элемент</label>
            <input className="control-input w-40" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Например: 25" />
            <button className="control-button control-button-primary" type="button" onClick={runSearch}>Найти элемент</button>
          </div>
          <p className="text-xs leading-5 text-app-muted">Интерактивный поиск запускает отдельную демонстрацию по уже построенному дереву. На каждом шаге подсвечивается текущий узел, а текст поясняет, почему алгоритм идёт влево или вправо.</p>
          {searchError && <p className="text-sm text-rose-300">{searchError}</p>}
        </div>
      </section>



      <section className="app-panel">
        <h3 className="text-xl font-semibold text-app-primary">Псевдокод вставки в BST</h3>
        <div className="mt-3 space-y-1 text-sm text-app-muted">
          {['если корень пуст, создать корень', 'начать с корня', 'если key < node.key, перейти влево', 'иначе перейти вправо (включая равные ключи)', 'когда найдено пустое место, вставить узел', 'повторять, пока узел не вставлен'].map((line, index) => (
            <p key={line} className={frame?.pseudocode.line === index + 1 ? 'font-semibold text-cyan-200' : ''}>{index + 1}. {line}</p>
          ))}
        </div>
      </section>

      <StructureVisualizer frame={frame} />

      {status === 'completed' && <StepHistoryPanel steps={history} />}

      <PlayerControls canStepBackward={currentIndex > 0} canStepForward={status !== 'completed'} currentIndex={currentIndex} onNextStep={nextStep} onPause={pause} onPlay={play} onPrevStep={prevStep} onReset={() => run(values, loadAlgorithm)} onSpeedChange={setPlaybackSpeed} playbackSpeedMs={playbackSpeedMs} status={status} totalFrames={frames.length} />
    </div>
  );
}

const run = (values: readonly number[], loadAlgorithm: ReturnType<typeof useAlgorithmPlayerStore.getState>['loadAlgorithm']) => {
  const generator = bstScenario(values);
  const first = generator.next();
  if (first.done) loadAlgorithm(generator); else loadAlgorithm(generator, { initialFrame: first.value });
};

const isStructureFrame = (frame: AlgorithmFrame<unknown, Record<string, unknown>> | null): frame is StructureAlgorithmFrame =>
  (frame?.domain === 'tree' || frame?.domain === 'array') && typeof frame.data === 'object' && frame.data !== null && 'cells' in frame.data;
