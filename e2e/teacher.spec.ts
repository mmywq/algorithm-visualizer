import { readFile } from 'node:fs/promises';
import { expect, test } from './fixtures';

test.describe('демо-класс преподавателя', () => {
  test('показывает статусы сдачи по заданиям', async ({ page }) => {
    await page.goto('/cabinet/classes/demo');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('АиСД · группа ИВТ-21');
    const lab1 = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Лабораторная 1 — простые сортировки' }) })
      .last();
    await expect(lab1.getByRole('list', { name: 'Сводка по статусам' })).toContainText('Сдано с опозданием: 2');
    await expect(lab1.getByRole('row', { name: /Глеб Д\./ })).toContainText('Просрочено');
  });

  test('выгружает сводку в CSV для Excel', async ({ page, isMobile }) => {
    test.skip(isMobile, 'выгрузка файла одинакова на всех экранах — проверяем на десктопе');
    await page.goto('/cabinet/classes/demo');
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Скачать сводку для Excel' }).click()]);
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
    const csv = await readFile((await download.path())!, 'utf-8');
    expect(csv.charCodeAt(0), 'BOM в начале файла').toBe(0xfeff);
    const rows = csv.slice(1).trim().split(/\r\n/);
    expect(rows[0]).toMatch(/^Студент;/);
    expect(rows).toHaveLength(1 + 8);
  });

  test('задание добавляется в демо-класс', async ({ page }) => {
    await page.goto('/cabinet/classes/demo');
    await page.getByRole('button', { name: 'Новое задание' }).click();
    const dialog = page.getByRole('dialog', { name: 'Новое задание' });
    await dialog.getByLabel('Название').fill('Контрольная — кучи');
    await dialog.getByRole('button', { name: 'Двоичная куча' }).click();
    await dialog.getByRole('button', { name: /Выдать задание \(1\)/ }).click();
    await expect(page.getByRole('heading', { name: 'Контрольная — кучи' })).toBeVisible();
  });
});
