import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures';

/**
 * Автоматическая проверка доступности (axe-core, правила WCAG 2.1 A и AA).
 * Тест падает на нарушениях уровня serious и critical; мелкие замечания выводятся в отчёт.
 */
const pages = [
  { path: '/', name: 'главная' },
  { path: '/catalog', name: 'каталог' },
  { path: '/sorting/bubble', name: 'демонстрация' },
  { path: '/sorting/bubble?tab=theory', name: 'теория' },
  { path: '/sorting/bubble?tab=quiz', name: 'тест' },
  { path: '/cabinet', name: 'кабинет' },
  { path: '/cabinet/classes/demo', name: 'демо-класс' },
  { path: '/for-schools', name: 'для учебных заведений' },
  { path: '/settings', name: 'настройки' },
  { path: '/privacy', name: 'политика' },
];

for (const { path, name } of pages) {
  test(`доступность: ${name}`, async ({ page }, testInfo) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const serious = results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical');
    if (results.violations.length > 0) {
      await testInfo.attach('axe', { body: JSON.stringify(results.violations, null, 2), contentType: 'application/json' });
    }
    expect(
      serious.map(
        (violation) =>
          `${violation.id}: ${violation.help} — ${violation.nodes.length} эл.: ${violation.nodes
            .slice(0, 3)
            .map((node) => node.target.join(' '))
            .join(' | ')}`,
      ),
    ).toEqual([]);
  });
}
