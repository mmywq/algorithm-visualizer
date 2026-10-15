import { useEffect } from 'react';
import { brand, getSiteOrigin } from '@/config/brand';

interface PageMeta {
  readonly title?: string | undefined;
  readonly description?: string | undefined;
  readonly noindex?: boolean;
}

const setMeta = (selector: string, attribute: 'name' | 'property', key: string, content: string): void => {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (element === null) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
};

/** Заголовок вкладки, описание и Open Graph для текущей страницы. */
export function usePageMeta({ title, description, noindex = false }: PageMeta): void {
  useEffect(() => {
    const fullTitle = title === undefined ? `${brand.name} — ${brand.tagline}` : `${title} — ${brand.name}`;
    const text = description ?? brand.description;
    document.title = fullTitle;
    setMeta('meta[name="description"]', 'name', 'description', text);
    setMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    setMeta('meta[property="og:description"]', 'property', 'og:description', text);
    setMeta('meta[property="og:url"]', 'property', 'og:url', `${getSiteOrigin()}${window.location.pathname}`);
    setMeta('meta[name="robots"]', 'name', 'robots', noindex ? 'noindex' : 'index, follow');

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical === null) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = `${getSiteOrigin()}${window.location.pathname}`;
  }, [title, description, noindex]);
}
