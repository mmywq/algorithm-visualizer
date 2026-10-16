import { motion } from 'framer-motion';
import { kmpSearch, naiveSearch, rabinKarp, RK_BASE, RK_MOD, type StringFrame } from '@/algorithms/strings/stringSearch';
import { StringMatchView, stringLegend } from '@/components/visualizers/strings/StringMatchView';
import theory from '@/content/theory/strings';
import { DemoLayout } from '@/features/demo/DemoLayout';
import { TextInput } from '@/features/demo/TextInput';
import { useDemoPlayer } from '@/features/player/useDemoPlayer';
import { useFrames } from '@/features/player/usePlayer';
import { stringCodec, useUrlState } from '@/hooks/useUrlState';
import { countOf } from '@/lib/plural';

type Run = (text: string, pattern: string) => Generator<StringFrame, void, unknown>;

const validator =
  (max: number, what: string) =>
  (raw: string): { value: string } | { error: string } => {
    const value = raw.replace(/\s+/g, '');
    if (value.length === 0) return { error: `Введите ${what}.` };
    if (value.length > max) return { error: `Не длиннее ${countOf(max, 'символа', 'символов', 'символов')}.` };
    if (!/^[\p{L}\p{N}]+$/u.test(value)) return { error: 'Только буквы и цифры, без пробелов.' };
    return { value };
  };

function SearchStats({ frame, bound }: { readonly frame: StringFrame | null; readonly bound: (n: number, m: number) => { value: number; label: string } }) {
  if (frame === null) return null;
  const { text, pattern } = frame.data;
  const { value, label } = bound(text.length, pattern.length);
  const share = value === 0 ? 0 : Math.min(1, frame.meta.comparisons / value);
  return (
    <section className="card p-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-surface-2 px-3.5 py-3">
          <p className="text-[13px] font-extrabold text-ink-3">Сравнений символов</p>
          <motion.p animate={{ scale: [1.15, 1] }} className="font-mono text-[28px] font-black leading-tight text-brand tabular" key={frame.meta.comparisons}>
            {frame.meta.comparisons}
          </motion.p>
        </div>
        <div className="rounded-2xl bg-surface-2 px-3.5 py-3">
          <p className="text-[13px] font-extrabold text-ink-3">Вхождений</p>
          <motion.p animate={{ scale: [1.15, 1] }} className="font-mono text-[28px] font-black leading-tight text-yellow tabular" key={frame.meta.found.length}>
            {frame.meta.found.length}
          </motion.p>
        </div>
      </div>
      <div className="mt-3.5 flex items-baseline justify-between gap-3 text-[13px] font-bold text-ink-2">
        <span>{label}</span>
        <span className="font-mono font-black text-ink">
          {frame.meta.comparisons} / {value}
        </span>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface-2">
        <motion.div
          animate={{ width: `${share * 100}%` }}
          className="h-full rounded-full bg-brand"
          initial={false}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        />
      </div>
    </section>
  );
}

interface StringSearchDemoProps {
  readonly id: string;
  readonly run: Run;
  readonly defaults: readonly [string, string];
  readonly presets: readonly { name: string; text: string; pattern: string }[];
  readonly bound: (n: number, m: number) => { value: number; label: string };
  readonly note?: string;
}

function StringSearchDemo({ id, run, defaults, presets, bound, note }: StringSearchDemoProps) {
  const [text, setText] = useUrlState('a', defaults[0], stringCodec(24));
  const [pattern, setPattern] = useUrlState('b', defaults[1], stringCodec(8));
  const frameSet = useFrames(() => run(text, pattern), [run, text, pattern]);
  const player = useDemoPlayer(frameSet);

  return (
    <DemoLayout
      aside={<SearchStats bound={bound} frame={player.frame} />}
      data={{
        title: 'Текст и образец',
        summary: `«${pattern}» в «${text}»`,
        editor: (
          <div className="flex flex-col gap-4">
            <TextInput
              hint={`До 24 символов.${note === undefined ? '' : ` ${note}`}`}
              label="Текст"
              onApply={setText}
              validate={validator(24, 'текст')}
              value={text}
            />
            <TextInput hint="До 8 символов." label="Образец" onApply={setPattern} validate={validator(8, 'образец')} value={pattern} />
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <button
                  className="btn btn-secondary btn-sm"
                  key={preset.name}
                  onClick={() => {
                    setText(preset.text);
                    setPattern(preset.pattern);
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
      legend={stringLegend}
      player={player}
      pseudocode={theory[id]?.pseudocode ?? []}
      resultInput={`текст «${text}», образец «${pattern}»`}
      stage={<StringMatchView frame={player.frame} />}
    />
  );
}

const commonPresets = [
  { name: 'Абракадабра', text: 'абракадабра', pattern: 'абра' },
  { name: 'Много «a»', text: 'aaaaaaaaab', pattern: 'aaab' },
  { name: 'ДНК', text: 'GATTACAGATTACA', pattern: 'TACA' },
];

export const NaiveSearchDemo = () => (
  <StringSearchDemo
    bound={(n, m) => ({ value: Math.max(0, n - m + 1) * m, label: `Худший случай (n − m + 1)·m` })}
    defaults={['абракадабра', 'абра']}
    id="naive-search"
    presets={commonPresets}
    run={naiveSearch}
  />
);

export const KmpDemo = () => (
  <StringSearchDemo
    bound={(n, m) => ({ value: 2 * (n + m), label: 'Граница КМП 2(n + m)' })}
    defaults={['abababcabababcabc', 'ababc']}
    id="kmp"
    presets={[{ name: 'Повторы', text: 'abababcabababcabc', pattern: 'ababc' }, ...commonPresets]}
    run={kmpSearch}
  />
);

export const RabinKarpDemo = () => (
  <StringSearchDemo
    bound={(n, m) => ({ value: Math.max(0, n - m + 1) * m, label: 'Сравнений у наивного в худшем' })}
    defaults={['2359023141526739921', '31415']}
    id="rabin-karp"
    note={`Хеш по основанию ${RK_BASE} по модулю ${RK_MOD} — маленький модуль, чтобы коллизии были видны.`}
    presets={[{ name: 'Кормен: цифры', text: '2359023141526739921', pattern: '31415' }, ...commonPresets]}
    run={rabinKarp}
  />
);
