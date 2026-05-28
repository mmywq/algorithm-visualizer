import { useEffect, useMemo, useState } from 'react';
import { bstScenario } from '@/algorithms/structures/extendedStructures';
import { PlayerControls } from '@/components/player/PlayerControls';
import { StructureVisualizer } from '@/components/visualizers/structures/StructureVisualizer';
import { loadStructurePresets, removeStructurePreset, renameStructurePreset, saveStructurePreset } from '@/lib/storage';
import { useAlgorithmPlayerStore } from '@/stores';
import type { AlgorithmFrame, ArrayPreset, StructureAlgorithmFrame } from '@/types';

const MIN_VALUE = -100;
const MAX_VALUE = 100;

export function BstPage() {
  const [manualInput, setManualInput] = useState('50, 30, 70, 20, 40, 60, 80');
  const [values, setValues] = useState<readonly number[]>([50, 30, 70, 20, 40, 60, 80]);
  const [inputError, setInputError] = useState<string | null>(null);
  const [presets, setPresets] = useState(loadStructurePresets());
  const [presetName, setPresetName] = useState('');
  const [renamePresetState, setRenamePresetState] = useState<{ id: string; name: string } | null>(null);

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

  const applyManual = () => {
    const result = parseValues(manualInput, true);
    if (result.ok === false) {
      setInputError(result.error);
      return;
    }
    setInputError(null);
    setValues(result.values);
    setManualInput(result.values.join(', '));
  };

  const randomValues = () => {
    const set = new Set<number>();
    while (set.size < 7) set.add(Math.floor(Math.random() * (MAX_VALUE - MIN_VALUE + 1)) + MIN_VALUE);
    const next = [...set];
    setValues(next);
    setManualInput(next.join(', '));
    setInputError(null);
  };

  const savePreset = () => {
    saveStructurePreset(presetName.trim() || `BST ${new Date().toLocaleTimeString()}`, values);
    setPresetName('');
    setPresets(loadStructurePresets());
  };

  const loadPreset = (preset: ArrayPreset) => {
    setValues(preset.values);
    setManualInput(preset.values.join(', '));
    setInputError(null);
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <section className="app-panel">
        <h1 className="text-3xl font-bold text-app-primary">Двоичное дерево поиска (BST)</h1>
        <p className="mt-2 text-sm leading-6 text-app-muted">BST (Binary Search Tree, двоичное дерево поиска) — структура, в которой у каждого узла ключи в левом поддереве меньше, а в правом больше либо равны. Поиск, вставка и удаление выполняются через последовательность сравнений от корня вниз.</p>
        <p className="mt-2 text-sm text-app-muted">Сложность операций: в среднем O(log n), в худшем случае O(n), если дерево вырождается в цепочку.</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
          <label className="text-sm text-app-muted">
            Значения для пошаговой вставки
            <input className="control-input mt-2 w-full" value={manualInput} onChange={(e) => setManualInput(e.target.value)} placeholder="50, 30, 70, 20" />
            <span className="mt-2 block text-xs text-slate-400">От 3 до 12 целых чисел, диапазон {MIN_VALUE}…{MAX_VALUE}. Набор 0, 0, 0 отклоняется как неинформативный.</span>
          </label>
          <div className="flex flex-wrap items-end gap-2">
            <button className="control-button control-button-primary" type="button" onClick={applyManual}>Применить</button>
            <button className="control-button" type="button" onClick={randomValues}>Случайные −100…100</button>
            <input className="control-input" value={presetName} onChange={(event) => setPresetName(event.target.value)} placeholder="Имя пресета" />
            <button className="control-button" type="button" onClick={savePreset}>Сохранить пресет</button>
          </div>
        </div>
        {inputError && <p className="mt-2 text-sm text-rose-300">{inputError}</p>}
        <PresetList presets={presets} onLoad={loadPreset} onRemove={(id) => { removeStructurePreset(id); setPresets(loadStructurePresets()); }} onRename={(id, name) => setRenamePresetState({ id, name })} />
        {renamePresetState !== null && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-app bg-surface p-3">
            <input className="control-input" value={renamePresetState.name} onChange={(event) => setRenamePresetState({ ...renamePresetState, name: event.target.value })} />
            <button className="control-button" onClick={() => { renameStructurePreset(renamePresetState.id, renamePresetState.name); setRenamePresetState(null); setPresets(loadStructurePresets()); }} type="button">Сохранить</button>
            <button className="control-button" onClick={() => setRenamePresetState(null)} type="button">Отмена</button>
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <StructureVisualizer frame={frame} />
        <section className="app-panel">
          <h3 className="text-xl font-semibold text-app-primary">Псевдокод вставки в BST</h3>
          <div className="mt-3 space-y-1 text-sm text-app-muted">
            {['если корень пуст, создать корень', 'начать с корня', 'если key < node.key, перейти влево', 'иначе перейти вправо (включая равные ключи)', 'когда найдено пустое место, вставить узел', 'повторять, пока узел не вставлен'].map((line, index) => (
              <p key={line} className={frame?.pseudocode.line === index + 1 ? 'font-semibold text-cyan-200' : ''}>{index + 1}. {line}</p>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-app bg-surface p-3 text-sm text-app-muted">
            <p className="font-semibold text-cyan-200">Пояснение шага</p>
            <p className="mt-2">{frame?.message ?? 'Запустите плеер, чтобы построить дерево.'}</p>
          </div>
        </section>
      </section>

      {status === 'completed' && history.length > 0 && (
        <section className="app-panel">
          <h3 className="text-xl font-semibold text-app-primary">История шагов</h3>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-app-muted">{history.map((h, idx) => <li key={`${idx}-${h}`}>{h}</li>)}</ol>
        </section>
      )}

      <PlayerControls canStepBackward={currentIndex > 0} canStepForward={status !== 'completed'} currentIndex={currentIndex} onNextStep={nextStep} onPause={pause} onPlay={play} onPrevStep={prevStep} onReset={() => run(values, loadAlgorithm)} onSpeedChange={setPlaybackSpeed} playbackSpeedMs={playbackSpeedMs} status={status} totalFrames={frames.length} />
    </div>
  );
}

function PresetList({ presets, onLoad, onRemove, onRename }: { readonly presets: readonly ArrayPreset[]; readonly onLoad: (preset: ArrayPreset) => void; readonly onRemove: (id: string) => void; readonly onRename: (id: string, name: string) => void }) {
  if (presets.length === 0) return null;
  return <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{presets.slice(0, 6).map((preset) => <div className="flex items-center gap-2" key={preset.id}><button className="control-button flex-1" type="button" onClick={() => onLoad(preset)}>{preset.name}</button><button className="control-button" type="button" onClick={() => onRename(preset.id, preset.name)}>Переим.</button><button className="control-button" type="button" onClick={() => onRemove(preset.id)}>Удалить</button></div>)}</div>;
}

const run = (values: readonly number[], loadAlgorithm: ReturnType<typeof useAlgorithmPlayerStore.getState>['loadAlgorithm']) => {
  const generator = bstScenario(values);
  const first = generator.next();
  if (first.done) loadAlgorithm(generator); else loadAlgorithm(generator, { initialFrame: first.value });
};

const parseValues = (source: string, unique: boolean): { ok: true; values: readonly number[] } | { ok: false; error: string } => {
  const values = source.split(',').map((v) => v.trim()).filter(Boolean).map((value) => Number(value));
  if (values.length < 3 || values.length > 12 || values.some((v) => Number.isInteger(v) === false || Number.isFinite(v) === false)) return { ok: false, error: 'Введите от 3 до 12 целых чисел через запятую.' };
  if (values.some((v) => v < MIN_VALUE || v > MAX_VALUE)) return { ok: false, error: `Все числа должны быть в диапазоне ${MIN_VALUE}…${MAX_VALUE}.` };
  if (new Set(values).size === 1) return { ok: false, error: 'Все значения одинаковые: дерево выродится в неинформативную цепочку.' };
  if (unique && new Set(values).size !== values.length) return { ok: false, error: 'Для BST используйте уникальные значения, чтобы дерево было нагляднее.' };
  return { ok: true, values };
};

const isStructureFrame = (frame: AlgorithmFrame<unknown, Record<string, unknown>> | null): frame is StructureAlgorithmFrame =>
  (frame?.domain === 'tree' || frame?.domain === 'array') && typeof frame.data === 'object' && frame.data !== null && 'cells' in frame.data;
