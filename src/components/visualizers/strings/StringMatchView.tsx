import { motion } from 'framer-motion';
import type { StringFrame } from '@/algorithms/strings/stringSearch';
import { useElementWidth } from '@/hooks/useElementSize';
import { spring } from '@/lib/motion';

const GAP = 4;

/** Текст, образец под ним на текущем сдвиге и, для КМП, префикс-функция образца. */
export function StringMatchView({ frame }: { readonly frame: StringFrame | null }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  if (frame === null) return <div className="viz-stage h-[200px]" ref={ref} />;
  const { text, pattern } = frame.data;
  const meta = frame.meta;
  const n = Math.max(1, text.length);
  const cell = width === 0 ? 34 : Math.max(22, Math.min(42, Math.floor((width - 24 - GAP * (n - 1)) / n)));
  const font = cell >= 32 ? 17 : cell >= 26 ? 15 : 13;
  const found = new Set(meta.found.flatMap((s) => Array.from({ length: pattern.length }, (_, k) => s + k)));
  const spurious = new Set((meta.spurious ?? []).flatMap((s) => Array.from({ length: pattern.length }, (_, k) => s + k)));
  const compared = meta.j === undefined ? null : meta.shift + meta.j;
  const building = meta.building === true;
  const offset = meta.shift * (cell + GAP);

  const textTone = (index: number): string => {
    if (!building && compared === index) return meta.state === 'match' ? 'border-green-press bg-green text-on' : 'border-red-press bg-red text-on';
    const inWindow = !building && index >= meta.shift && index < meta.shift + pattern.length;
    if (inWindow) return 'border-brand bg-brand/12 text-ink';
    return 'border-[rgb(var(--viz-node-line))] bg-surface text-ink';
  };

  const patternTone = (index: number): string => {
    if (building && meta.piFocus !== undefined) {
      if (index === meta.piFocus.i) return 'border-brand-press bg-brand text-on';
      if (index === meta.piFocus.k) return 'border-cyan-press bg-cyan text-on';
      return 'border-[rgb(var(--viz-node-line))] bg-surface text-ink';
    }
    if (meta.j === index) return meta.state === 'match' ? 'border-green-press bg-green text-on' : 'border-red-press bg-red text-on';
    if (meta.matched !== undefined && index < meta.matched) return 'border-green bg-green/25 text-ink';
    return 'border-purple-press bg-purple text-on';
  };

  const box = (content: string, tone: string, extra = '') => (
    <span
      className={`flex shrink-0 items-center justify-center rounded-lg border-2 font-mono font-black transition-colors duration-150 ${tone} ${extra}`}
      style={{ width: cell, height: cell, fontSize: font }}
    >
      {content}
    </span>
  );

  return (
    <div className="viz-stage overflow-x-auto px-3 py-4" ref={ref}>
      <div className="mx-auto" style={{ width: n * cell + (n - 1) * GAP }}>
        <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wide text-ink-3">текст</p>
        <div className={`flex transition-opacity ${building ? 'opacity-40' : ''}`} style={{ gap: GAP }}>
          {[...text].map((char, index) => (
            <span className="flex flex-col items-center gap-1" key={index}>
              {box(char, textTone(index))}
              <span
                className={`h-1 w-full rounded-full ${found.has(index) ? 'bg-yellow' : spurious.has(index) ? 'bg-red/60' : 'bg-transparent'}`}
                title={found.has(index) ? 'вхождение' : spurious.has(index) ? 'коллизия хеша' : undefined}
              />
              <span className="font-mono text-[10px] font-bold text-ink-3">{index}</span>
            </span>
          ))}
        </div>

        <p className="mb-1.5 mt-3 text-[11px] font-extrabold uppercase tracking-wide text-ink-3">
          {building ? 'образец — строим префикс-функцию' : `образец · сдвиг ${meta.shift}`}
        </p>
        <motion.div animate={{ x: building ? 0 : offset }} initial={false} transition={{ ...spring.viz }}>
          <div className="flex" style={{ gap: GAP }}>
            {[...pattern].map((char, index) => (
              <span key={index}>{box(char, patternTone(index))}</span>
            ))}
          </div>
          {meta.pi !== undefined && (
            <div className="mt-1.5 flex" style={{ gap: GAP }}>
              {meta.pi.map((value, index) => (
                <span
                  className={`flex items-center justify-center rounded-md font-mono text-[12px] font-black ${
                    building && meta.piFocus?.i === index ? 'bg-brand/16 text-brand' : value === null ? 'text-ink-3' : 'bg-surface-2 text-ink-2'
                  }`}
                  key={index}
                  style={{ width: cell, height: 22 }}
                  title={`π[${index}]`}
                >
                  {value ?? '·'}
                </span>
              ))}
            </div>
          )}
        </motion.div>
        {meta.pi !== undefined && (
          <p className="mt-1 text-[11px] font-bold text-ink-3">π — префикс-функция: на сколько символов можно «перескочить» после несовпадения</p>
        )}

        {meta.patternHash !== undefined && meta.windowHash !== undefined && (
          <div className="mt-4 flex flex-wrap gap-2 font-mono text-[13px] font-black">
            <span className={`rounded-lg px-2.5 py-1 ${meta.windowHash === meta.patternHash ? 'bg-green/25 text-ink' : 'bg-surface-2 text-ink-2'}`}>
              h(окно) = {meta.windowHash}
            </span>
            <span className="rounded-lg bg-purple/16 px-2.5 py-1 text-ink">h(образец) = {meta.patternHash}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export const stringLegend = [
  { color: 'rgb(var(--c-purple))', label: 'образец' },
  { color: 'rgb(var(--c-green))', label: 'совпадение' },
  { color: 'rgb(var(--c-red))', label: 'несовпадение' },
  { color: 'rgb(var(--c-yellow))', label: 'найденное вхождение', shape: 'line' as const },
];
