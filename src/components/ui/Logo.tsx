import { CatHead } from '@/components/mascot/PixelCat';
import { brand } from '@/config/brand';

/** Знак — голова Кэша, пиксельного кота-маскота. */
export function LogoMark({ size = 22, className }: { readonly size?: number; readonly className?: string }) {
  return <CatHead className={className} size={size} />;
}

export function Logo({ compact = false }: { readonly compact?: boolean }) {
  return (
    <span className="group inline-flex items-center gap-2.5">
      <span className="transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-110">
        <LogoMark />
      </span>
      {!compact && <span className="font-display text-[24px] leading-none text-ink">{brand.name}</span>}
    </span>
  );
}
