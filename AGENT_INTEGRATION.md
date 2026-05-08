# AGENT_INTEGRATION.md — VisionGuard Integration Manual

This document defines the integration contract for VisionGuard, enabling other agents and automation systems to interoperate with this harness.

## Inputs

| Asset | Location | Required | Description |
|-------|----------|----------|-------------|
| Screenshot | `screenshot-final.png` (repo root) | Yes | Full-page PNG captured by Playwright |
| AOM snapshot | `a11y-snapshot.json` (repo root) | Yes | Accessibility Object Model tree captured by Playwright (`page.locator('body').ariaSnapshot({ interestingOnly: false })`); describes the semantic structure of the screen (roles, names, states) so the AI can cross-reference what it sees in the image with ground-truth element data, eliminating hallucinations about button labels and interactive controls |
| Git diff | `changes.diff` (repo root) | No | Unified diff of changes; defaults to "no pending changes" message |
| Business rules | `skills/business-rules.md` | Yes | UI rules the auditor enforces; absence aborts with exit 1 |
| Auditor persona | `skills/auditor-persona.md` | Yes | Prompt template with `{{BUSINESS_RULES}}`, `{{GIT_DIFF}}`, and `{{AOM_TREE}}` placeholders |
| API key | `GEMINI_API_KEY` (env) | Yes | Google Gemini API key; absence aborts with exit 1 |

## Provider Contract

Each provider in `ai_agents/providers/` exports a single async function:

```js
async function audit({ prompt, screenshotBase64, screenshotMime })
  // Returns:
  // {
  //   veredito:  'APROVADO' | 'REPROVADO',
  //   descricao: string,
  //   violacoes: string[],
  //   raw:       string        // raw provider response, for debugging
  // }
```

### Adding a New Provider

1. Create `ai_agents/providers/<name>.js` exporting `audit` with the signature above.
2. Import it in `ai_agents/visual_qa.js`.
3. Plug it into the fallback chain after the cloud provider.

The provider is responsible for retries, transport errors, and normalizing the response into the contract shape. The orchestrator (`visual_qa.js`) must not contain any provider-specific logic.

## Output Contract

The `veredito` field MUST be exactly `"APROVADO"` or `"REPROVADO"`. Any other value is a contract violation and will produce unpredictable exit codes.

The orchestrator writes `audit-output.md` with the full human-readable report after every run.

## Exit Code Matrix

| Condition | Exit Code |
|-----------|-----------|
| `GEMINI_API_KEY` missing | 1 |
| `business-rules.md` missing or empty | 1 |
| All providers failed | 1 |
| Audit OK, `veredito === 'APROVADO'` | 0 |
| Audit OK, `veredito === 'REPROVADO'`, no `STRICT_MODE` | 0 |
| Audit OK, `veredito === 'REPROVADO'`, `STRICT_MODE=true` | 2 |

Exit code **2** triggers the automatic rollback job in `production-pipeline.yml`.

## Environment Variables

| Variable | Consumed by | Description |
|----------|-------------|-------------|
| `GEMINI_API_KEY` | Gemini provider | Google AI API key |
| `GITHUB_TOKEN` | Orchestrator | Octokit PR comment auth |
| `PR_NUMBER` | Orchestrator | PR number for comment target (omit to skip comment) |
| `REPO_OWNER` | Orchestrator | GitHub repository owner |
| `REPO_NAME` | Orchestrator | GitHub repository name |
| `SCREENSHOTS_BASE_URL` | Orchestrator | Base URL for inline screenshot images in PR comment |
| `STRICT_MODE` | Orchestrator | Set to `"true"` to exit 2 on REPROVADO (triggers rollback) |
| `CI` | Orchestrator | Set to `"true"` to disable local Ollama fallback |

## Prompt Template Placeholders

The file `skills/auditor-persona.md` is the single source of truth for the auditor persona and task description. It contains two placeholders that the orchestrator replaces at runtime:

| Placeholder | Replaced with |
|-------------|---------------|
| `{{BUSINESS_RULES}}` | Contents of `skills/business-rules.md` |
| `{{GIT_DIFF}}` | Contents of `changes.diff` (or a fallback string if absent) |
| `{{AOM_TREE}}` | Contents of `a11y-snapshot.json` (or empty string if absent — degraded mode) |
