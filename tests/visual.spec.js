const { test } = require('@playwright/test');

test('Capturar evidencias visuais', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="task-list"]');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'screenshot-final.png', fullPage: true });
  console.log('✅ Evidência visual capturada com sucesso!');
});
