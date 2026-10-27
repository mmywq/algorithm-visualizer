import quizzes from '../src/content/quizzes/sorting';
import { expect, test } from './fixtures';

test.describe('учебный сценарий', () => {
  test('демонстрация на своих данных доходит до результата', async ({ page }) => {
    await page.goto('/sorting/bubble');
    await page.getByRole('button', { name: /^Входные данные/ }).click();
    const field = page.locator('#numbers-input');
    await field.fill('9, 4, 7, 1');
    await page.getByRole('button', { name: 'Применить' }).click();
    await expect(page.getByRole('button', { name: 'Входные данные: [9, 4, 7, 1]' })).toBeVisible();

    await page.getByRole('button', { name: 'К результату' }).click();
    await expect(page.locator('main')).toContainText('1, 4, 7, 9');
  });

  test('тест сдаётся и засчитывается в прогресс', async ({ page }) => {
    const questions = quizzes['bubble-sort'] ?? [];
    expect(questions.length).toBeGreaterThanOrEqual(5);

    await page.goto('/sorting/bubble?tab=quiz');
    await page.getByRole('button', { name: 'Начать тест' }).click();

    let previous = '';
    for (let index = 0; index < questions.length; index += 1) {
      const main = page.locator('main');
      await expect(main.getByText(`${index + 1}/${questions.length}`)).toBeVisible();
      // вопрос на экране определяем по заголовку: порядок вопросов и вариантов перемешан;
      // счётчик «2/5» меняется сразу, а прежний вопрос ещё доигрывает анимацию ухода — ждём новый заголовок
      const heading = main.getByRole('heading', { level: 2 });
      let title = '';
      await expect
        .poll(async () => {
          title = (await heading.count()) === 1 ? (await heading.innerText()).trim() : '';
          return title !== '' && title !== previous;
        })
        .toBe(true);
      previous = title;
      const question = questions.find((item) => item.q === title);
      expect(question, 'вопрос на экране есть в файле тестов').toBeDefined();
      const right = question!.options[question!.answer]!;
      await main.getByRole('radio', { name: new RegExp(`^\\d\\s*${right.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).click();
      await main.getByRole('button', { name: 'Проверить' }).click();
      await expect(main.getByText('Верно!')).toBeVisible();
      await main.getByRole('button', { name: index + 1 < questions.length ? 'Дальше' : 'Завершить' }).click();
    }

    await expect(page.locator('main')).toContainText(`Верных ответов: ${questions.length} из ${questions.length}`);

    await page.goto('/cabinet');
    await expect(page.locator('main')).toContainText(/Тестов сдано\s*1\s*из 54/);
  });
});
