import { useCallback, type ReactNode } from 'react';
import { coinChange, editDistance, fibonacciCallTree, fibonacciTable, knapsack, lcs, type DpFrame, type KnapsackItem } from '@/algorithms/dp/dp';
import type { TreeFrame } from '@/algorithms/trees/treeFrames';
import { DpTable, dpLegend } from '@/components/visualizers/dp/DpTable';
import { Tabs } from '@/components/ui/Tabs';
import theory from '@/content/theory/dp';
import { SequenceStrip, TreeStage } from '@/demos/shared/TreeAlgorithmDemo';
import { DemoLayout, type DemoData } from '@/features/demo/DemoLayout';
import { KeyField } from '@/features/demo/KeyField';
import type { LegendItem } from '@/features/demo/Legend';
import { NumbersInput } from '@/features/demo/NumbersInput';
import { TextInput } from '@/features/demo/TextInput';
import { useDemoPlayer } from '@/features/player/useDemoPlayer';
import { useFrames, type AnyFrame } from '@/features/player/usePlayer';
import { enumCodec, intCodec, numbersCodec, stringCodec, useUrlState } from '@/hooks/useUrlState';
import type { PseudocodeLine } from '@/types';

const pseudo = (id: string): readonly PseudocodeLine[] => theory[id]?.pseudocode ?? [];

function DpStage({ frame }: { readonly frame: DpFrame | null }) {
  const details = frame?.meta.details;
  return (
    <div className="flex flex-col gap-2.5">
      <DpTable frame={frame} />
      {details !== undefined && details.length > 0 && <SequenceStrip items={details} label={frame?.meta.detailsLabel ?? 'Ответ'} tone="yellow" />}
    </div>
  );
}

interface TableDemoProps {
  readonly frames: () => Generator<DpFrame, void, unknown>;
  readonly deps: readonly unknown[];
  readonly pseudocode: readonly PseudocodeLine[];
  readonly data?: DemoData;
  readonly toolbar?: ReactNode;
  readonly resultInput: string;
}

function TableDemo({ frames, deps, pseudocode, data, toolbar, resultInput }: TableDemoProps) {
  const frameSet = useFrames(frames, deps);
  const player = useDemoPlayer(frameSet);
  return (
    <DemoLayout
      {...(data === undefined ? {} : { data })}
      legend={dpLegend}
      player={player}
      pseudocode={pseudocode}
      resultInput={resultInput}
      stage={<DpStage frame={player.frame} />}
      toolbar={toolbar}
    />
  );
}

// ---------- Фибоначчи ----------

type FibMode = 'naive' | 'memo' | 'table';
const FIB_MODES: readonly FibMode[] = ['naive', 'memo', 'table'];
const fibLabels: Record<FibMode, string> = { naive: 'Рекурсия', memo: 'Мемоизация', table: 'Таблица' };

const recursionPseudocode: readonly PseudocodeLine[] = [
  { code: 'fib(k):', note: 'Определение: F(k) = F(k − 1) + F(k − 2).' },
  { code: 'если k есть в кеше — вернуть кеш[k]', note: 'Только в версии с мемоизацией.' },
  { code: 'если k ≤ 1 — вернуть k', note: 'База рекурсии.' },
  { code: 'вызвать fib(k − 1) и fib(k − 2)', note: 'Две ветки дерева вызовов.' },
  { code: 'результат ← их сумма (и записать в кеш)', note: 'Подъём по дереву.' },
  { code: 'вернуть F(n)', note: 'Сравните число вызовов в двух версиях.' },
];

const treeLegend: readonly LegendItem[] = [
  { color: 'rgb(var(--c-brand))', label: 'текущий вызов' },
  { color: 'rgb(var(--c-brand) / 0.35)', label: 'ждёт результата' },
  { color: 'rgb(var(--c-green))', label: 'посчитан' },
  { color: 'rgb(var(--c-orange))', label: 'посчитан повторно' },
  { color: 'rgb(var(--c-yellow))', label: 'взят из кеша' },
];

export function FibonacciDemo() {
  const [mode, setMode] = useUrlState<FibMode>('op', 'naive', enumCodec(FIB_MODES));
  const [n, setN] = useUrlState('k', 5, intCodec(1, 20));
  const limit = mode === 'table' ? 20 : 6;
  const k = Math.min(n, limit);
  const frameSet = useFrames<AnyFrame>(() => (mode === 'table' ? fibonacciTable(k) : fibonacciCallTree(k, mode === 'memo')), [mode, k]);
  const player = useDemoPlayer(frameSet);

  return (
    <DemoLayout
      legend={mode === 'table' ? dpLegend : treeLegend}
      player={player}
      pseudocode={mode === 'table' ? pseudo('fibonacci') : recursionPseudocode}
      resultInput={`n = ${k}, способ: ${fibLabels[mode].toLowerCase()}`}
      stage={mode === 'table' ? <DpStage frame={player.frame as DpFrame | null} /> : <TreeStage binary frame={player.frame as TreeFrame | null} />}
      toolbar={
        <div className="flex flex-wrap items-center gap-2.5">
          <Tabs
            ariaLabel="Способ"
            items={FIB_MODES.map((value) => ({ value, label: fibLabels[value] }))}
            onChange={(value) => setMode(value as FibMode)}
            size="sm"
            value={mode}
          />
          <KeyField label="n" max={limit} min={1} onApply={setN} submitLabel="Показать" value={k} />
          {mode !== 'table' && <span className="text-[13px] font-bold text-ink-3">до 6 — дерево вызовов растёт очень быстро</span>}
        </div>
      }
    />
  );
}

// ---------- размен монет ----------

export function CoinChangeDemo() {
  const [coins, setCoins] = useUrlState('in', [1, 3, 4], numbersCodec({ min: 1, max: 20, maxCount: 5 }));
  const [amount, setAmount] = useUrlState('k', 10, intCodec(1, 25));
  const frames = useCallback(() => coinChange(coins, amount), [coins, amount]);
  return (
    <TableDemo
      data={{
        title: 'Монеты',
        summary: `монеты [${coins.join(', ')}]`,
        editor: (
          <NumbersInput
            hint="До 5 разных номиналов от 1 до 20. Набор {1, 3, 4} и сумма 6 показывают, где жадный выбор ошибается."
            maxSize={5}
            maxValue={20}
            minSize={1}
            minValue={1}
            onApply={setCoins}
            scenarios={false}
            unique
            value={coins}
          />
        ),
      }}
      deps={[frames]}
      frames={frames}
      pseudocode={pseudo('coin-change')}
      resultInput={`монеты [${coins.join(', ')}], сумма ${amount}`}
      toolbar={<KeyField label="Сумма" max={25} min={1} onApply={setAmount} submitLabel="Разменять" value={amount} />}
    />
  );
}

// ---------- рюкзак ----------

const parseItems = (raw: string): KnapsackItem[] | null => {
  const parts = raw
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const items: KnapsackItem[] = [];
  for (const part of parts) {
    const match = /^(\d{1,2})\s*[/:x×]\s*(\d{1,2})$/.exec(part);
    if (match === null) return null;
    items.push({ weight: Number(match[1]), value: Number(match[2]) });
  }
  return items;
};

const itemsValidate = (raw: string): { value: string } | { error: string } => {
  const items = parseItems(raw);
  if (items === null || items.length === 0) return { error: 'Запишите предметы как «вес/ценность» через запятую, например: 2/3, 3/4.' };
  if (items.length > 5) return { error: 'Не больше 5 предметов — иначе таблица не поместится.' };
  if (items.some((item) => item.weight < 1 || item.weight > 10 || item.value < 1 || item.value > 40))
    return { error: 'Вес — от 1 до 10, ценность — от 1 до 40.' };
  return { value: items.map((item) => `${item.weight}/${item.value}`).join(', ') };
};

export function KnapsackDemo() {
  const [raw, setRaw] = useUrlState('in', '2/3, 3/4, 4/5, 5/6', stringCodec(60));
  const [capacity, setCapacity] = useUrlState('k', 8, intCodec(1, 12));
  const items = parseItems(raw) ?? [];
  const frames = useCallback(() => knapsack(parseItems(raw) ?? [], capacity), [raw, capacity]);
  return (
    <TableDemo
      data={{
        title: 'Предметы',
        summary: `${items.length} предм.: ${raw}`,
        editor: (
          <TextInput
            hint="До 5 предметов в формате «вес/ценность». Каждый предмет можно взять не больше одного раза."
            label="Предметы"
            onApply={setRaw}
            presets={[
              { name: 'Классика', value: '2/3, 3/4, 4/5, 5/6' },
              { name: 'Жадность подводит', value: '5/10, 4/7, 4/7' },
              { name: 'Мелочь', value: '1/1, 1/2, 2/2, 3/5, 4/6' },
            ]}
            validate={itemsValidate}
            value={raw}
          />
        ),
      }}
      deps={[frames]}
      frames={frames}
      pseudocode={pseudo('knapsack')}
      resultInput={`предметы ${raw}, вместимость ${capacity}`}
      toolbar={<KeyField label="Вместимость" max={12} min={1} onApply={setCapacity} submitLabel="Собрать" value={capacity} />}
    />
  );
}

// ---------- две строки: НОП и Левенштейн ----------

const wordValidate = (raw: string): { value: string } | { error: string } => {
  const value = raw.trim().replace(/\s+/g, '');
  if (value.length === 0) return { error: 'Введите хотя бы одну букву.' };
  if (value.length > 9) return { error: 'Не длиннее 9 символов — иначе таблица не поместится.' };
  if (!/^[\p{L}\p{N}]+$/u.test(value)) return { error: 'Только буквы и цифры.' };
  return { value };
};

function TwoStringsDemo({
  id,
  defaults,
  run,
  presets,
}: {
  readonly id: string;
  readonly defaults: readonly [string, string];
  readonly run: (a: string, b: string) => Generator<DpFrame, void, unknown>;
  readonly presets: readonly { name: string; a: string; b: string }[];
}) {
  const [a, setA] = useUrlState('a', defaults[0], stringCodec(9));
  const [b, setB] = useUrlState('b', defaults[1], stringCodec(9));
  const frames = useCallback(() => run(a, b), [run, a, b]);
  return (
    <TableDemo
      data={{
        title: 'Строки',
        summary: `«${a}» и «${b}»`,
        editor: (
          <div className="flex flex-col gap-4">
            <TextInput hint="Строки по вертикали таблицы." label="Первая строка" onApply={setA} validate={wordValidate} value={a} />
            <TextInput hint="Строки по горизонтали таблицы." label="Вторая строка" onApply={setB} validate={wordValidate} value={b} />
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <button
                  className="btn btn-secondary btn-sm"
                  key={preset.name}
                  onClick={() => {
                    setA(preset.a);
                    setB(preset.b);
                  }}
                  type="button"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        ),
      }}
      deps={[frames]}
      frames={frames}
      pseudocode={pseudo(id)}
      resultInput={`«${a}» и «${b}»`}
    />
  );
}

export const LcsDemo = () => (
  <TwoStringsDemo
    defaults={['ABCBDAB', 'BDCABA']}
    id="lcs"
    presets={[
      { name: 'Учебник', a: 'ABCBDAB', b: 'BDCABA' },
      { name: 'ДНК', a: 'GATTACA', b: 'TAGACCA' },
      { name: 'Слова', a: 'алгоритм', b: 'логарифм' },
    ]}
    run={lcs}
  />
);

export const EditDistanceDemo = () => (
  <TwoStringsDemo
    defaults={['котик', 'скотина']}
    id="edit-distance"
    presets={[
      { name: 'Котик', a: 'котик', b: 'скотина' },
      { name: 'kitten', a: 'kitten', b: 'sitting' },
      { name: 'Опечатка', a: 'алгоритм', b: 'алгортим' },
    ]}
    run={editDistance}
  />
);
