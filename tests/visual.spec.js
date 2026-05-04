const { test } = require('@playwright/test');

test('Capturar evidencias visuais', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="task-list"]');
  await page.waitForLoadState('networkidle');

  // Full-page — evidência principal para o Gemini
  await page.screenshot({ path: 'screenshot-final.png', fullPage: true });

  // Close-ups dos botões auditados pelas regras de negócio
  await page.locator('[data-testid="submit-button"]').screenshot({ path: 'screenshot-btn-adicionar.png' });
  await page.locator('[data-testid="delete-button"]').screenshot({ path: 'screenshot-btn-excluir.png' });

  console.log('✅ Evidências visuais capturadas (full-page + close-ups dos botões)');
});
