/**
 * Скриншоты для README: собранный сайт (npm run build) снимается в браузере Playwright.
 * Запуск: npm run screenshots — или с установленным браузером: PW_CHANNEL=msedge npm run screenshots.
 * Картинки сохраняются в docs/screenshots в формате PNG.
 */
import { mkdir } from 'node:fs/promises';
import { chromium, devices } from '@playwright/test';
import { preview } from 'vite';

const OUT = 'docs/screenshots';
const PORT = 4175;
const base = `http://127.0.0.1:${PORT}`;

const server = await preview({ preview: { host: '127.0.0.1', port: PORT, strictPort: true }, logLevel: 'silent' });
const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
await mkdir(OUT, { recursive: true });

/** Свежий профиль: выбор в баннере cookie сделан, тема тёмная. */
const open = async (options) => {
  const context = await browser.newContext({ serviceWorkers: 'block', locale: 'ru-RU', colorScheme: 'dark', ...options });
  await context.addInitScript(() => {
    localStorage.setItem('algoscope:consent', JSON.stringify({ state: { choice: 'necessary', decidedAt: '2026-01-01T00:00:00.000Z' }, version: 1 }));
  });
  return { context, page: await context.newPage() };
};

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const desktop = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };

const shots = [
  {
    name: 'home',
    run: async (page) => {
      await page.goto(`${base}/`);
      await pause(2500);
    },
  },
  {
    name: 'demo-sorting',
    run: async (page) => {
      await page.goto(`${base}/sorting/bubble`);
      await page.getByRole('button', { name: 'Шаг вперёд' }).first().waitFor();
      for (let i = 0; i < 7; i += 1) await page.getByRole('button', { name: 'Шаг вперёд' }).first().click();
      await pause(800);
    },
  },
  {
    name: 'demo-graph',
    run: async (page) => {
      await page.goto(`${base}/graphs/dijkstra`);
      await page.getByRole('button', { name: 'Шаг вперёд' }).first().waitFor();
      for (let i = 0; i < 9; i += 1) await page.getByRole('button', { name: 'Шаг вперёд' }).first().click();
      await pause(800);
    },
  },
  {
    name: 'wardrobe',
    run: async (page) => {
      await page.goto(`${base}/cabinet?tab=wardrobe`);
      await page.getByRole('button', { name: /^Корона/ }).click();
      await page.getByRole('heading', { name: 'Мой прогресс' }).waitFor();
      await page.locator('section.window', { hasText: 'Гардероб Кэша' }).scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, -90));
      await pause(1200);
    },
  },
  {
    name: 'teacher-class',
    run: async (page) => {
      await page.goto(`${base}/cabinet/classes/demo`);
      await page.getByRole('heading', { name: 'Лабораторная 1 — простые сортировки' }).scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, 160));
      await pause(800);
    },
  },
];

for (const shot of shots) {
  const { context, page } = await open(desktop);
  await shot.run(page);
  await page.screenshot({ path: `${OUT}/${shot.name}.png` });
  await context.close();
  console.log(`${OUT}/${shot.name}.png`);
}

// телефон: та же демонстрация, плавающая панель проигрывателя внизу
{
  const { context, page } = await open({ ...devices['Pixel 7'], deviceScaleFactor: 2 });
  await page.goto(`${base}/sorting/quick`);
  await page.getByRole('button', { name: 'Шаг вперёд' }).first().waitFor();
  for (let i = 0; i < 5; i += 1) await page.getByRole('button', { name: 'Шаг вперёд' }).first().click();
  await pause(800);
  await page.screenshot({ path: `${OUT}/mobile.png` });
  await context.close();
  console.log(`${OUT}/mobile.png`);
}

await browser.close();
await new Promise((resolve) => server.httpServer.close(resolve));
