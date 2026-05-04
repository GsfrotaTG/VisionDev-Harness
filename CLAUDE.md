# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**VisionDev-Harness** is an AI-powered visual QA automation system. It captures screenshots of a frontend app via Playwright, then sends the screenshot + git diff + business rules to Google Gemini 2.5 Flash (with Ollama as local-only fallback) for automated visual auditing. Results are posted as comments on GitHub PRs.

## Running the System

```bash
npm install
npm start              # http-server public -p 8080
npm test               # Playwright screenshot capture → screenshot-final.png
npm run audit          # Gemini 2.5 Flash audit → prints report (+ PR comment if PR_NUMBER set)
node ai_agents/local_qa.js  # local-only audit via Ollama (dev only)
```

## Architecture

VisionGuard atua como **gate cognitivo em 2 momentos** da esteira: pré-merge (sandbox) e pós-deploy (smoke em prod). Mesmas regras de negócio (`skills/business-rules.md`) — Documentação Viva.

### Sandbox gate — `visionguard-harness.yml` (PR pre-merge)

1. Valida secret `GEMINI_API_KEY`
2. `git diff origin/base...HEAD > changes.diff`
3. Sobe `http-server public -p 8080`, aguarda via `wait-on`
4. Playwright captura `screenshot-final.png`
5. `ai_agents/visual_qa.js` audita e comenta no PR (ou comenta erro se a IA falhar)

### Production pipeline — `production-pipeline.yml` (push em main)

Quatro jobs encadeados com rollback automático:

1. **snapshot** → copia `gh-pages` atual para branch `prod-stable` (last-known-good). No primeiro deploy, vira no-op.
2. **deploy** → publica `public/` em `gh-pages` (GitHub Pages serve `https://<owner>.github.io/<repo>/`).
3. **smoke-test** → aguarda HTTP 200, captura screenshot da URL real de prod via `BASE_URL`, roda VisionGuard em **STRICT_MODE** (veredito `[REPROVADO]` derruba o job com exit 2).
4. **rollback** (`if: failure()` no smoke) → restaura `prod-stable` em `gh-pages` via force-push e abre issue com label `production-incident` contendo o relatório completo do VisionGuard.

Critérios de rollback combinados: HTTP 5xx/timeout **OU** veredito reprovado pela IA.

### STRICT_MODE no `visual_qa.js`

- `STRICT_MODE=true` → exit code 2 quando veredito é `[REPROVADO]` (aciona rollback)
- Sem `STRICT_MODE` → sempre exit 0 (modo PR, não bloqueia)
- Sempre escreve `audit-output.md` para artifact downstream

### Key Files

| File | Role |
|------|------|
| `ai_agents/visual_qa.js` | Primary audit agent: Gemini 2.5 Flash + retry/backoff + Ollama fallback (dev only) |
| `ai_agents/local_qa.js` | Local-only audit via Ollama at `localhost:11434` (dev only, never runs in CI) |
| `tests/visual.spec.js` | Playwright test — capture only, no assertions, outputs `screenshot-final.png` |
| `playwright.config.js` | Fixed viewport 1280×800, CI retries, GitHub reporter |
| `public/index.html` | Self-contained task manager demo app (the UI being audited) |
| `scripts/orchestrator.py` | Future Claude Sonnet orchestration — not yet integrated |
| `skills/business-rules.md` | UI rules injected as AI context (button colors, etc.) |

### AI Model Strategy

- **Cloud:** Google Gemini 2.5 Flash via `@google/generative-ai` — structured JSON output, 3-attempt retry with exponential backoff
- **Local fallback:** Ollama `llama3.2-vision` at `http://localhost:11434/api/generate` — only triggered in dev (`CI !== 'true'`)
- If all paths fail, posts an error comment to the PR with the exact failure reason

## Environment Variables

Required in `.env` (dev) and as repository secret (CI):
```
GEMINI_API_KEY=...
```

In GitHub Actions, also injected automatically: `GITHUB_TOKEN`, `PR_NUMBER`, `REPO_OWNER`, `REPO_NAME`.

## GitHub Workflows

| Workflow | Trigger | Função |
|---|---|---|
| `visionguard-harness.yml` | PR open/sync/reopen → main | Sandbox gate: audita preview local antes do merge |
| `production-pipeline.yml` | push em main, workflow_dispatch | Snapshot → deploy → smoke (STRICT) → rollback |

**Setup obrigatório (uma vez):**
- Secret `GEMINI_API_KEY` em Settings → Secrets and variables → Actions
- GitHub Pages habilitado: Settings → Pages → Source = `Deploy from a branch`, branch = `gh-pages`, path = `/`
- Permitir Actions criarem PRs/issues: Settings → Actions → General → Workflow permissions = "Read and write"

## Business Rules

Defined in `skills/business-rules.md` and loaded at runtime by the AI agents:
- "Adicionar" button must be blue (`#2563eb`)
- "Excluir" button must be red (`#ef4444`)

Additional design guidelines are in `skills/frontend-skill.md` (Tailwind, shadows, rounded corners) and `skills/security-skill.md` (OWASP Top 10 gates).
