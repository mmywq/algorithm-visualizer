import type { Plugin } from 'vite';
import { catalog } from '../src/content/catalog';

/**
 * Генерирует sitemap.xml и robots.txt при сборке. Адрес сайта — переменная VITE_SITE_URL
 * (из окружения или файла .env, её передаёт vite.config); без неё карта сайта не создаётся
 * (адреса в ней должны быть абсолютными), а robots.txt остаётся без ссылки на неё.
 */
export function sitemapPlugin(siteUrl = ''): Plugin {
  return {
    name: 'algoscope-sitemap',
    apply: 'build',
    generateBundle() {
      const site = siteUrl.replace(/\/$/, '');
      const staticPaths = ['/', '/catalog', '/for-schools'];
      if (site.length > 0) {
        const today = new Date().toISOString().slice(0, 10);
        const urls = [...staticPaths, ...catalog.map((entry) => entry.path)]
          .map((path) => `  <url><loc>${site}${path}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq></url>`)
          .join('\n');
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
        });
      }
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\nDisallow: /cabinet\nDisallow: /settings\nDisallow: /login\nDisallow: /auth/\nDisallow: /join/\n${site.length > 0 ? `\nSitemap: ${site}/sitemap.xml\n` : ''}`,
      });
    },
  };
}
