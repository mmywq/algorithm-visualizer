import { test as base, expect, type Page } from '@playwright/test';

/**
 * Общая подготовка: выбор в баннере cookie уже сделан, а Кэш не гуляет по экрану —
 * иначе он может оказаться над кнопкой, по которой кликает тест. Баннер и кота
 * проверяют отдельные тесты без этой подготовки.
 */
export const test = base.extend<{ prepared: void }>({
  prepared: [
    async ({ page }, use) => {
      await page.addInitScript(() => {
        localStorage.setItem('algoscope:consent', JSON.stringify({ state: { choice: 'necessary', decidedAt: '2026-01-01T00:00:00.000Z' }, version: 1 }));
        if (localStorage.getItem('algoscope:settings') === null) {
          localStorage.setItem('algoscope:settings', JSON.stringify({ state: { catWalks: false }, version: 2 }));
        }
      });
      await use();
    },
    { auto: true },
  ],
});

export { expect };

/** Ширина страницы не больше окна: на телефоне не должно быть горизонтальной прокрутки. */
export const horizontalOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
