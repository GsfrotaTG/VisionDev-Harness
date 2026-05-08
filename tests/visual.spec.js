const fs = require('fs');
const { test } = require('@playwright/test');

test('Capturar evidencias visuais', async ({ page }) => {
  await page.goto('./');
  await page.waitForSelector('[data-testid="task-list"]');
  await page.waitForLoadState('networkidle');

  // Full-page — evidência principal para o Gemini
  await page.screenshot({ path: 'screenshot-final.png', fullPage: true });
  console.log('✅ Full-page capturado');

  // AOM Injection — árvore de acessibilidade para zerar alucinações da IA
  // page.accessibility.snapshot() foi removido no Playwright 1.46+; ariaSnapshot() é o substituto canônico
  const aomSnapshot = await page.locator('body').ariaSnapshot({ interestingOnly: false });
  fs.writeFileSync('a11y-snapshot.json', aomSnapshot);
  console.log('✅ AOM snapshot capturado');

  // Close-ups dinâmicos definidos em skills/capture-targets.json
  // Trocar de tela = editar o JSON. Zero alteração de código de teste.
  const targetsPath = './skills/capture-targets.json';
  if (!fs.existsSync(targetsPath)) {
    console.log('ℹ️  capture-targets.json ausente — apenas full-page capturado');
    return;
  }

  const targets = JSON.parse(fs.readFileSync(targetsPath, 'utf8'));
  for (const target of targets) {
    try {
      const locator = page.locator(target.selector);
      if (await locator.count() > 0) {
        const slug = target.label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        await locator.screenshot({ path: `screenshot-${slug}.png` });
        console.log(`✅ Close-up: ${target.label}`);
      } else {
        console.log(`ℹ️  Elemento ausente nesta tela: ${target.label} — pulando`);
      }
    } catch (e) {
      console.warn(`⚠️  Erro ao capturar ${target.label}: ${e.message}`);
    }
  }
});
