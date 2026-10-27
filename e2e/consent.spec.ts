import { expect, test } from '@playwright/test';

// без общей подготовки: здесь проверяется сам баннер cookie
test('баннер cookie: выбор запоминается', async ({ page }) => {
  await page.goto('/');
  const banner = page.getByText('Мы используем cookie');
  await expect(banner).toBeVisible();
  await page.getByRole('button', { name: 'Только необходимые' }).click();
  await expect(banner).toBeHidden();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(banner).toBeHidden();
});
