const { test, expect } = require('@playwright/test');

// ── Módulo: Gerenciador de Tarefas ──────────────────────────────────────────

test('Task manager — adicionar tarefa', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="task-list"]');

  const countBefore = await page.locator('[data-testid="task-item"]').count();

  await page.fill('[data-testid="task-input"]', 'Tarefa criada pelo VisionGuard');
  await page.click('[data-testid="submit-button"]');

  await expect(page.locator('[data-testid="task-item"]')).toHaveCount(countBefore + 1);
  await expect(page.locator('[data-testid="task-item"]').last()).toContainText('Tarefa criada pelo VisionGuard');
});

test('Task manager — excluir tarefa', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="task-list"]');

  const countBefore = await page.locator('[data-testid="task-item"]').count();

  await page.locator('[data-testid="delete-button"]').first().click();

  await expect(page.locator('[data-testid="task-item"]')).toHaveCount(countBefore - 1);
});

test('Task manager — campo vazio não adiciona tarefa', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="task-list"]');

  const countBefore = await page.locator('[data-testid="task-item"]').count();
  await page.click('[data-testid="submit-button"]');

  await expect(page.locator('[data-testid="task-item"]')).toHaveCount(countBefore);
});

// ── Módulo: Login ────────────────────────────────────────────────────────────

test('Login — todos os elementos estão visíveis', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="login-form"]');

  await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
  await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
  await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  await expect(page.locator('[data-testid="cancel-button"]')).toBeVisible();
});

test('Login — botão Entrar tem texto correto', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-testid="login-button"]')).toHaveText('Entrar');
});

test('Login — botão Cancelar tem texto correto', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-testid="cancel-button"]')).toHaveText('Cancelar');
});
