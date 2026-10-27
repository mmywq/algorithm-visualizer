import { defineConfig, devices } from '@playwright/test';

/**
 * Сквозные тесты на собранной версии сайта (vite preview), как её увидит посетитель.
 * Локально можно взять установленный браузер вместо скачанного: PW_CHANNEL=msedge или chrome.
 * WebKit (движок Safari) запускается в CI или при PW_WEBKIT=1.
 */
const channel = process.env.PW_CHANNEL;
const withChannel = channel === undefined || channel === '' ? {} : { channel };
const withWebkit = process.env.CI !== undefined || process.env.PW_WEBKIT !== undefined;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: process.env.CI !== undefined,
  retries: process.env.CI !== undefined ? 1 : 0,
  reporter: process.env.CI !== undefined ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
    // сервис-воркер кеширует страницы между тестами — для проверок он не нужен
    serviceWorkers: 'block',
    contextOptions: { reducedMotion: 'reduce' },
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: process.env.CI === undefined,
    timeout: 60_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], ...withChannel } },
    { name: 'mobile', use: { ...devices['Pixel 7'], ...withChannel } },
    ...(withWebkit ? [{ name: 'iphone', use: { ...devices['iPhone 14'] } }] : []),
  ],
});
