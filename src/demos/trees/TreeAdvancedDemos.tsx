import { motion } from 'framer-motion';
import { useEffect, useId, useState } from 'react';
import { redBlackInsertScenario } from '@/algorithms/trees/redBlack';
import { segmentBuildScenario, segmentQueryScenario, segmentUpdateScenario } from '@/algorithms/trees/segmentTree';
import type { TreeFrame } from '@/algorithms/trees/treeFrames';
import { normalizeWords, trieBuildScenario, triePrefixScenario } from '@/algorithms/trees/trie';
import { TreeDiagram } from '@/components/visualizers/structures/TreeDiagram';
import { Tabs } from '@/components/ui/Tabs';
import theory from '@/content/theory/trees';
import { SequenceStrip, TreeAlgorithmDemo, TreeStage } from '@/demos/shared/TreeAlgorithmDemo';
import { DemoLayout } from '@/features/demo/DemoLayout';
import type { LegendItem } from '@/features/demo/Legend';
import { NumbersInput } from '@/features/demo/NumbersInput';
import { TextInput } from '@/features/demo/TextInput';
import { useDemoPlayer } from '@/features/player/useDemoPlayer';
import { useFrames } from '@/features/player/usePlayer';
import { enumCodec, intCodec, numbersCodec, stringCodec, useUrlState } from '@/hooks/useUrlState';
import type { PseudocodeLine } from '@/types';

// ---------- красно-чёрное дерево ----------

const redBlackLegend: readonly LegendItem[] = [
  { color: 'rgb(var(--c-red))', label: 'красный узел' },
  { color: 'rgb(14 10 24)', label: 'чёрный узел' },
  { color: 'rgb(var(--c-brand))', label: 'текущий узел x', shape: 'ring' },
  { color: 'rgb(var(--c-ink))', label: 'P · U · G — родитель, дядя, дед' },
];

export function RedBlackDemo() {
  return (
    <TreeAlgorithmDemo
      build={redBlackInsertScenario}
      buildLabel="Вставка"
      defaultValues={[10, 20, 30, 15, 25, 5, 1, 27]}
      input={{ maxSize: 14, unique: true }}
      keyHint="Ключи вставляются по одному. Возрастающая последовательность — лучший способ увидеть повороты."
      legendItems={redBlackLegend}
      pseudocode={theory['red-black']!.pseudocode}
    />
  );
}

// ---------- префиксное дерево ----------

const DEFAULT_WORDS = 'кот, код, кит, коты, кодекс, мир, мирон';

const wordsValidate = (raw: string): { value: string } | { error: string } => {
  const words = normalizeWords(raw);
  if (words.length === 0) return { error: 'Введите хотя бы одно слово из букв.' };
  if (words.length > 8) return { error: 'Не больше 8 слов — иначе дерево не поместится на экране.' };
  if (words.some((word) => word.length > 9)) return { error: 'Каждое слово — не длиннее 9 букв.' };
  return { value: words.join(', ') };
};

const trieLegend: readonly LegendItem[] = [
  { color: 'rgb(var(--c-brand))', label: 'текущая буква' },
  { color: 'rgb(var(--c-orange))', label: 'новый узел' },
  { color: 'rgb(var(--c-green))', label: 'конец слова' },
  { color: 'rgb(var(--c-yellow))', label: 'найдено' },
];

const prefixPseudocode: readonly PseudocodeLine[] = [
  { code: 'node ← корень', note: 'Поиск идёт от корня по буквам префикса.' },
  { code: 'для каждой буквы c префикса: node ← node.дети[c]', note: 'Один шаг на букву.' },
  { code: 'если ребёнка c нет — слов с таким префиксом нет', note: 'Дальше искать бессмысленно.' },
  { code: 'обойти поддерево node и собрать концы слов', note: 'Все слова с префиксом лежат ниже.' },
  { code: 'вывести найденные слова', note: 'В алфавитном порядке — так устроен обход.' },
];

type TrieOp = 'build' | 'prefix';

export function TrieDemo() {
  const [raw, setRaw] = useUrlState('in', DEFAULT_WORDS, stringCodec(120));
  const [op, setOp] = useUrlState<TrieOp>('op', 'build', enumCodec<TrieOp>(['build', 'prefix']));
  const [prefix, setPrefix] = useUrlState('k', 'ко', stringCodec(9));
  const [prefixDraft, setPrefixDraft] = useState(prefix);
  useEffect(() => setPrefixDraft(prefix), [prefix]);
  const words = normalizeWords(raw).slice(0, 8);
  const frameSet = useFrames(() => (op === 'build' ? trieBuildScenario(words) : triePrefixScenario(words, prefix)), [raw, op, prefix]);
  const player = useDemoPlayer(frameSet);

  const applyPrefix = (): void => {
    const next = normalizeWords(prefixDraft)[0] ?? '';
    setPrefixDraft(next);
    if (next !== prefix) setPrefix(next);
  };

  return (
    <DemoLayout
      data={{
        summary: words.join(', '),
        title: 'Слова',
        editor: (
          <TextInput
            hint="До 8 слов по 9 букв, через запятую или пробел. Регистр и «ё» не различаются."
            label="Слова"
            mono={false}
            onApply={setRaw}
            presets={[
              { name: 'Кот и компания', value: DEFAULT_WORDS },
              { name: 'Английский', value: 'car, card, care, cart, cat, dog, do' },
              { name: 'Без общих префиксов', value: 'дом, лес, сад, мост' },
            ]}
            validate={wordsValidate}
            value={raw}
          />
        ),
      }}
      legend={trieLegend}
      player={player}
      pseudocode={op === 'build' ? theory.trie!.pseudocode : prefixPseudocode}
      resultInput={`${words.join(', ')}${op === 'prefix' ? `; префикс «${prefix}»` : ''}`}
      stage={<TreeStage binary={false} frame={player.frame as TreeFrame | null} />}
      toolbar={
        <div className="flex flex-wrap items-center gap-2.5">
          <Tabs
            ariaLabel="Операция"
            items={[
              { value: 'build', label: 'Вставка слов' },
              { value: 'prefix', label: 'Поиск по префиксу' },
            ]}
            onChange={(value) => setOp(value as TrieOp)}
            size="sm"
            value={op}
          />
          {op === 'prefix' && (
            <form
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                applyPrefix();
              }}
            >
              <label className="text-sm font-extrabold text-ink-2" htmlFor="trie-prefix">
                Префикс
              </label>
              <input
                className="input input-sm w-28 font-mono"
                id="trie-prefix"
                maxLength={9}
                onBlur={applyPrefix}
                onChange={(event) => setPrefixDraft(event.target.value)}
                value={prefixDraft}
              />
              <button className="btn btn-primary btn-sm" type="submit">
                Искать
              </button>
            </form>
          )}
        </div>
      }
    />
  );
}

// ---------- дерево отрезков ----------

const segmentLegend: readonly LegendItem[] = [
  { color: 'rgb(var(--c-brand))', label: 'текущий узел' },
  { color: 'rgb(var(--c-green))', label: 'взят в ответ / посчитан' },
  { color: 'rgb(var(--c-orange))', label: 'обновлён' },
  { color: 'rgb(var(--viz-empty))', label: 'не нужен' },
];

const queryPseudocode: readonly PseudocodeLine[] = [
  { code: 'sum(v, [l…r]) для запроса [ql…qr]', note: 'Начинаем с корня — отрезка всего массива.' },
  { code: 'если [l…r] не пересекается с запросом — вернуть 0', note: 'Узел вне запроса отбрасывается сразу.' },
  { code: 'если [l…r] целиком внутри — вернуть t[v]', note: 'Готовая сумма без спуска вниз.' },
  { code: 'иначе — sum(левый) + sum(правый)', note: 'Частичное пересечение: спрашиваем детей.' },
  { code: 'ответ — сумма взятых узлов', note: 'На каждом уровне не больше двух взятых узлов.' },
];

const updatePseudocode: readonly PseudocodeLine[] = [
  { code: 'спуститься от корня к листу i', note: 'Выбираем половину, в которой лежит i.' },
  { code: 't[лист] ← x', note: 'Меняется один элемент массива.' },
  { code: 'подняться к корню: t[v] ← t[левый] + t[правый]', note: 'Пересчитываются только узлы на пути.' },
  { code: 'обновлено O(log n) узлов', note: 'По одному на уровень.' },
];

type SegmentOp = 'build' | 'query' | 'update';

function SegmentArray({ frame }: { readonly frame: TreeFrame | null }) {
  const values = (frame?.meta['array'] as readonly number[] | undefined) ?? [];
  const range = frame?.meta['arrayRange'] as readonly [number, number] | undefined;
  const active = frame?.meta['arrayActive'] as number | undefined;
  return (
    <div className="flex flex-wrap justify-center gap-1.5 rounded-2xl bg-surface-2 px-3 py-3">
      {values.map((value, index) => {
        const inRange = range !== undefined && index >= range[0] && index <= range[1];
        const isActive = active === index;
        return (
          <div className="flex flex-col items-center gap-1" key={index}>
            <motion.span
              animate={{ scale: isActive ? 1.12 : 1 }}
              className={`flex h-10 min-w-10 items-center justify-center rounded-xl border-2 px-1.5 font-mono text-[16px] font-black transition-colors ${
                isActive
                  ? 'border-brand-press bg-brand text-on'
                  : inRange
                    ? 'border-green-press bg-green text-on'
                    : 'border-[rgb(var(--viz-node-line))] bg-surface text-ink'
              }`}
              style={{ boxShadow: 'inset 0 -4px 0 rgb(0 0 0 / 0.18)' }}
            >
              {value}
            </motion.span>
            <span className="font-mono text-[11px] font-bold text-ink-3">{index}</span>
          </div>
        );
      })}
    </div>
  );
}

function NumberPair({
  labels,
  values,
  limits,
  onApply,
  submit,
}: {
  readonly labels: readonly [string, string];
  readonly values: readonly [number, number];
  readonly limits: readonly [[number, number], [number, number]];
  readonly onApply: (a: number, b: number) => void;
  readonly submit: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState<[string, string]>([String(values[0]), String(values[1])]);
  const [a, b] = values;
  useEffect(() => setDraft([String(a), String(b)]), [a, b]);
  const parse = (text: string, [min, max]: [number, number]): number | null => {
    const value = Number(text.trim().replace('−', '-'));
    return text.trim().length > 0 && Number.isInteger(value) && value >= min && value <= max ? value : null;
  };
  const first = parse(draft[0], limits[0]);
  const second = parse(draft[1], limits[1]);
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (first !== null && second !== null) onApply(first, second);
      }}
    >
      {([0, 1] as const).map((index) => (
        <span className="flex items-center gap-1.5" key={index}>
          <label className="text-sm font-extrabold text-ink-2" htmlFor={`${id}-${index}`}>
            {labels[index]}
          </label>
          <input
            aria-invalid={(index === 0 ? first : second) === null}
            className={`input input-sm w-16 font-mono ${(index === 0 ? first : second) === null ? 'input-error' : ''}`}
            id={`${id}-${index}`}
            inputMode="numeric"
            onChange={(event) => setDraft((current) => (index === 0 ? [event.target.value, current[1]] : [current[0], event.target.value]))}
            value={draft[index]}
          />
        </span>
      ))}
      <button className="btn btn-primary btn-sm" disabled={first === null || second === null} type="submit">
        {submit}
      </button>
    </form>
  );
}

export function SegmentTreeDemo() {
  const [values, setValues] = useUrlState('in', [5, 3, 8, 6, 1, 4, 7, 2], numbersCodec({ min: -99, max: 99, maxCount: 10 }));
  const [op, setOp] = useUrlState<SegmentOp>('op', 'query', enumCodec<SegmentOp>(['build', 'query', 'update']));
  const [from, setFrom] = useUrlState('l', 2, intCodec(0, 15));
  const [to, setTo] = useUrlState('r', 6, intCodec(0, 15));
  const [index, setIndex] = useUrlState('i', 3, intCodec(0, 15));
  const [value, setValue] = useUrlState('x', 9, intCodec(-99, 99));
  const last = values.length - 1;
  const frameSet = useFrames(
    () =>
      op === 'build'
        ? segmentBuildScenario(values)
        : op === 'query'
          ? segmentQueryScenario(values, Math.min(from, last), Math.min(to, last))
          : segmentUpdateScenario(values, Math.min(index, last), value),
    [values, op, from, to, index, value, last],
  );
  const player = useDemoPlayer(frameSet);
  const frame = player.frame as TreeFrame | null;

  return (
    <DemoLayout
      data={{
        summary: `[${values.join(', ')}]`,
        editor: (
          <NumbersInput
            hint="От 2 до 10 элементов: каждый станет листом дерева."
            maxSize={10}
            minSize={2}
            onApply={setValues}
            scenarios={false}
            value={values}
          />
        ),
      }}
      legend={segmentLegend}
      player={player}
      pseudocode={op === 'build' ? theory['segment-tree']!.pseudocode : op === 'query' ? queryPseudocode : updatePseudocode}
      resultInput={`[${values.join(', ')}]${op === 'query' ? `, сумма на [${Math.min(from, last)}…${Math.min(to, last)}]` : op === 'update' ? `, A[${Math.min(index, last)}] ← ${value}` : ''}`}
      stage={
        <div className="flex flex-col gap-2.5">
          <TreeDiagram minHeight={260} nodes={frame?.meta.nodes ?? []} />
          <SegmentArray frame={frame} />
          {frame?.meta.output !== undefined && frame.meta.output.length > 0 && (
            <SequenceStrip items={frame.meta.output} label={frame.meta.outputLabel ?? 'Взятые узлы'} tone="green" />
          )}
        </div>
      }
      toolbar={
        <div className="flex flex-wrap items-center gap-2.5">
          <Tabs
            ariaLabel="Операция"
            items={[
              { value: 'build', label: 'Построение' },
              { value: 'query', label: 'Сумма' },
              { value: 'update', label: 'Обновление' },
            ]}
            onChange={(next) => setOp(next as SegmentOp)}
            size="sm"
            value={op}
          />
          {op === 'query' && (
            <NumberPair
              labels={['l', 'r']}
              limits={[
                [0, last],
                [0, last],
              ]}
              onApply={(l, r) => {
                setFrom(Math.min(l, r));
                setTo(Math.max(l, r));
              }}
              submit="Посчитать"
              values={[Math.min(from, last), Math.min(to, last)]}
            />
          )}
          {op === 'update' && (
            <NumberPair
              labels={['i', 'x']}
              limits={[
                [0, last],
                [-99, 99],
              ]}
              onApply={(i, x) => {
                setIndex(i);
                setValue(x);
              }}
              submit="Записать"
              values={[Math.min(index, last), value]}
            />
          )}
        </div>
      }
    />
  );
}
