# Changelog

All notable changes to VisionDev-Harness are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased] — feat/pipeline-v2

### Added

#### Harness Cognitivo Industrial
- **Provider module** (`ai_agents/providers/google_gemini.js`): exports a unified `audit()` contract — `{veredito, descricao, violacoes, raw}`. Retries and transport errors are provider-owned; the orchestrator is provider-agnostic.
- **`skills/auditor-persona.md`**: single source of truth for the auditor persona and task instructions. Replaces two divergent inline prompts that had drifted apart. Placeholders: `{{BUSINESS_RULES}}`, `{{GIT_DIFF}}`, `{{AOM_TREE}}`.
- **ESLint quality gate** (`npm run lint`): `eslint:recommended` + `eslint-plugin-jsx-a11y` for JS; `@html-eslint/parser` + `@html-eslint/eslint-plugin` for HTML structure and accessibility rules (`require-button-type`, `require-img-alt`, `require-lang`, `no-inline-styles`, etc.).
- **`AGENT_INTEGRATION.md`**: MCP-style integration contract — inputs, provider contract signature, output contract (`APROVADO`/`REPROVADO`), exit code matrix, and environment variables.
- **`DEVELOPER_GUIDE.md`**: boas práticas for contributors — `data-testid` naming, `aria-label` on controls, `type="button"` discipline, CSS tokens over inline styles, and the known `frontend-skill.md` vs `business-rules.md` CTA color conflict.
- **Lint job in CI** (`production-pipeline.yml`): new `lint` job runs before `deploy`; `deploy: needs: [snapshot, lint]` — syntactic errors abort the pipeline before any deploy or AI spend.
- **Lint step in sandbox gate** (`visionguard-harness.yml`): lint runs after `npm ci` and before the sandbox deploy, as the first quality gate on PRs.

#### AOM Injection — zero alucinações de IA
- **`tests/visual.spec.js`**: after the full-page screenshot, captures the Accessibility Object Model via `page.locator('body').ariaSnapshot({ interestingOnly: false })` and writes `a11y-snapshot.json`. The AOM tree names every button, input, heading, and region with ground-truth labels.
- **`skills/auditor-persona.md`**: new `[ESTRUTURA SEMÂNTICA DA TELA (AOM)]` section injected before `[TAREFA]`. The auditor is instructed to cross-reference the screenshot with the AOM JSON to resolve any ambiguity about element labels and states.
- **`ai_agents/visual_qa.js`**: reads `a11y-snapshot.json` (degrades gracefully to empty string if absent) and substitutes `{{AOM_TREE}}` in the persona template.

### Changed

- **`public/index.html`**: full AOM retrofit — `aria-label`, `aria-required`, `role`, `autocomplete`, `name`, and `required` added to all interactive controls; inline styles on `.btn-login` and `.btn-cancel` moved to CSS classes to satisfy `@html-eslint/no-inline-styles` and keep business rule colors auditable.
- **`ai_agents/visual_qa.js`**: rewritten as a "dumb orchestrator" (~90 lines). Provider selection, retries, and JSON coercion removed from this file entirely. Persona loaded from `skills/auditor-persona.md` at runtime.
- **`npm install` → `npm ci`** in both workflows for deterministic installs.

### Fixed

- **STRICT_MODE rollback gate consolidado:** `STRICT_MODE=true` + veredito `REPROVADO` → exit 2 → rollback. O bug histórico onde o caminho de fallback Ollama nunca populava `veredito` ficou irrelevante: o fallback foi removido (ver "Removed" abaixo).
- **`page.accessibility.snapshot()` removed in Playwright 1.46+**: migrated to `page.locator('body').ariaSnapshot({ interestingOnly: false })`, which is the canonical replacement in Playwright 1.46+.

### Removed

- **Ollama local fallback** (`ai_agents/providers/ollama_local.js` e `ai_agents/local_qa.js`): a arquitetura era cloud + edge na narrativa, mas só Gemini no fluxo principal. Posicionamento atualizado para "auditor cognitivo cloud-first" — uma história só, código alinhado.
- **Variável `CI`** como gate de fallback no orquestrador e nos workflows (`env: CI: 'true'` em ambos `.github/workflows/*.yml`): tornou-se dead config após a remoção do fallback.
- **`llama3.2-vision`** das dependências documentais e do README.

---

## [0.4.0] — 2026-04-xx · cff4bb2

- Production pipeline with snapshot → deploy → smoke-test → rollback jobs.
- `STRICT_MODE` exit-2 wires VisionGuard veredito directly to automatic rollback.
- `prod-stable` branch used as last-known-good for rollback restore.

## [0.3.0] — Login Form module · 37e8799

- Login form added to `public/index.html` with `data-testid` on all controls.
- `skills/business-rules.md` extended with login-specific rules.
- Dynamic close-up captures via `skills/capture-targets.json`.

## [0.2.0] — VisionGuard Sandbox Gate · 1d1c8fc

- PR pre-merge gate: Playwright screenshot + Gemini audit + PR comment.
- Ollama local fallback for dev-only runs.
- `badge.json` output for shield.io status badge.

## [0.1.0] — Initial harness

- `public/index.html` task manager demo app.
- `tests/visual.spec.js` full-page screenshot capture.
- `skills/business-rules.md` as live documentation for the AI auditor.
