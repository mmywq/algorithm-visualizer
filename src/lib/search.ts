import { catalog, categoryById, type AlgorithmEntry } from '@/content/catalog';

const normalize = (text: string): string =>
  text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9*+ ]/gi, ' ');

/** Раскладка: «ыщке» → «sort». Помогает, если забыли переключить язык. */
const ru = 'йцукенгшщзхъфывапролджэячсмитьбю';
const en = "qwertyuiop[]asdfghjkl;'zxcvbnm,.";
const swapLayout = (text: string): string =>
  [...text]
    .map((char) => {
      const ruIndex = ru.indexOf(char);
      if (ruIndex >= 0) return en[ruIndex] ?? char;
      const enIndex = en.indexOf(char);
      return enIndex >= 0 ? (ru[enIndex] ?? char) : char;
    })
    .join('');

const haystack = new Map(
  catalog.map((entry) => [
    entry.id,
    normalize([entry.title, entry.short, entry.tags.join(' '), categoryById.get(entry.category)?.title ?? '', entry.complexity].join(' ')),
  ]),
);

const scoreEntry = (entry: AlgorithmEntry, words: readonly string[]): number => {
  const text = haystack.get(entry.id) ?? '';
  const title = normalize(entry.title);
  let score = 0;
  for (const word of words) {
    if (title.startsWith(word)) score += 6;
    else if (title.includes(` ${word}`)) score += 4;
    else if (text.includes(word)) score += 2;
    else return 0;
  }
  return score;
};

export const searchCatalog = (query: string, limit = 12): readonly AlgorithmEntry[] => {
  const words = normalize(query)
    .split(/\s+/)
    .filter((word) => word.length > 0);
  if (words.length === 0) return [];
  const rank = (variant: readonly string[]) =>
    catalog
      .map((entry) => ({ entry, score: scoreEntry(entry, variant) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.entry);
  const direct = rank(words);
  if (direct.length > 0) return direct.slice(0, limit);
  return rank(words.map(swapLayout)).slice(0, limit);
};
