import { TriangleAlert } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PixelCat } from '@/components/mascot/PixelCat';
import { Window } from '@/components/ui/Window';
import { brand } from '@/config/brand';
import { privacyPolicy, termsOfUse } from '@/content/legal';
import { usePageMeta } from '@/hooks/usePageMeta';

export default function LegalPage({ kind }: { readonly kind: 'privacy' | 'terms' }) {
  const document = useMemo(() => (kind === 'privacy' ? privacyPolicy() : termsOfUse()), [kind]);
  usePageMeta({ title: document.title });
  const missing = brand.legalEntity.length === 0 || brand.contactEmail.length === 0;

  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[220px_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <nav aria-label="Документы" className="flex gap-2 lg:flex-col">
          <Link className={`chip h-9 px-3 text-sm ${kind === 'privacy' ? 'bg-brand text-on' : ''}`} to="/privacy">
            Конфиденциальность
          </Link>
          <Link className={`chip h-9 px-3 text-sm ${kind === 'terms' ? 'bg-brand text-on' : ''}`} to="/terms">
            Условия использования
          </Link>
        </nav>
        <ol className="mt-6 hidden space-y-2 text-sm font-bold text-ink-3 lg:block">
          {document.sections.map((section, index) => (
            <li key={section.title}>
              <a className="hover:text-ink" href={`#section-${index + 1}`}>
                {index + 1}. {section.title}
              </a>
            </li>
          ))}
        </ol>
        <PixelCat className="mt-6 hidden lg:inline-block" pose="think" size={78} />
      </aside>

      <article>
        {import.meta.env.DEV && missing && (
          <p className="mb-5 flex items-start gap-2 rounded-2xl border-2 border-yellow/50 bg-yellow/10 px-4 py-3 text-sm font-bold text-ink-2">
            <TriangleAlert className="mt-0.5 shrink-0 text-yellow" size={18} strokeWidth={2.5} />
            Видно только в режиме разработки: задайте VITE_LEGAL_ENTITY и VITE_CONTACT_EMAIL, а перед публикацией согласуйте текст с юристом.
          </p>
        )}
        <Window bodyClassName="p-6 sm:p-8" color="purple" title={kind === 'privacy' ? 'privacy.txt' : 'terms.txt'}>
          <h1 className="h-display text-ink">{document.title}</h1>
          <p className="mt-4 text-[17px] font-semibold leading-8 text-ink-2">{document.intro}</p>
          {document.sections.map((section, index) => (
            <section className="mt-8 scroll-mt-24" id={`section-${index + 1}`} key={section.title}>
              <h2 className="font-display text-[24px] leading-tight text-ink">
                {index + 1}. {section.title}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p className="mt-3 text-[16px] font-medium leading-7 text-ink-2" key={paragraph.slice(0, 40)}>
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </Window>
      </article>
    </div>
  );
}
