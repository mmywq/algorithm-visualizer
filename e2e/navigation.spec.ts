import { expect, horizontalOverflow, test } from './fixtures';

test.describe('навигация', () => {
  test('главная открывается и ведёт в каталог', async ({ page, isMobile }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Алгоскоп/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Алгоритмы');
    if (isMobile) {
      await page
        .getByRole('navigation')
        .getByRole('link', { name: /Каталог/ })
        .last()
        .click();
    } else {
      await page.getByRole('navigation', { name: 'Основная навигация' }).getByRole('link', { name: 'Каталог' }).click();
    }
    await expect(page).toHaveURL(/\/catalog$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Каталог алгоритмов' })).toBeVisible();
  });

  test('поиск по каталогу находит алгоритм', async ({ page }) => {
    await page.goto('/catalog');
    await page.getByRole('searchbox', { name: 'Поиск по каталогу' }).or(page.getByLabel('Поиск по каталогу')).first().fill('дейкстр');
    await expect(page.getByRole('link', { name: /Алгоритм Дейкстры/ }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Пузырьковая сортировка/ })).toHaveCount(0);
  });

  test('неизвестный адрес показывает страницу 404', async ({ page }) => {
    await page.goto('/такой-страницы-нет');
    await expect(page.getByRole('heading', { level: 1, name: 'Страница потерялась' })).toBeVisible();
  });

  test('на страницах нет горизонтальной прокрутки', async ({ page }) => {
    for (const path of ['/', '/catalog', '/sorting/bubble', '/cabinet', '/for-schools', '/cabinet/classes/demo']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      expect(await horizontalOverflow(page), path).toBeLessThanOrEqual(0);
    }
  });
});
