/** Форма слова после числа по правилам русского языка: 1 вершина, 2 вершины, 5 вершин, 11 вершин, 21 вершина. */
export const plural = (count: number, one: string, few: string, many: string): string => {
  const mod100 = Math.abs(count) % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  const mod10 = mod100 % 10;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
};

/** Число вместе со словом в нужной форме: «3 вершины». Формы передаются в падеже, которого требует фраза. */
export const countOf = (count: number, one: string, few: string, many: string): string => `${count} ${plural(count, one, few, many)}`;
