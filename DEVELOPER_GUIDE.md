# Developer Guide — Passing the VisionGuard Pipeline

This guide explains the practices that let your code pass all VisionGuard quality gates.

## Quick Command (run before every push)

```bash
npm run lint && npm test && npm run audit
```

---

## 1. Semantic HTML — Making the AI's Job Easier

VisionGuard reads the Accessibility Object Model (AOM) of the interface. A rich AOM reduces AI hallucinations and false positives.

### `data-testid` naming
- Use kebab-case: `data-testid="submit-button"`, not `data-testid="submitButton"`.
- Prefix with the component name for cross-component uniqueness: `task-form`, `login-button`.
- Dynamically created elements must also set `data-testid`:
  ```js
  li.setAttribute('data-testid', 'task-item');
  ```

### `aria-label`
- Every interactive control must have a visible label or an `aria-label`.
- Use `aria-label` when button text alone is ambiguous (e.g., an icon-only "X" button needs `aria-label="Fechar"`).
- Controls whose visible text may change with locale should have `aria-label` to remain stable.
- `aria-required="true"` must accompany every required form field.

### Button `type`
Always declare `type="button"` on buttons that do not submit a form.  
Missing `type` defaults to `"submit"` and causes accidental form submissions.

Dynamically created buttons must also set `type`:
```js
const btn = document.createElement('button');
btn.type = 'button'; // required — ESLint will catch this if omitted in HTML
```

---

## 2. CSS Tokens — Business Rules as Code

Button colors defined in `skills/business-rules.md` must be expressed via CSS classes. Inline `style=` attributes are **forbidden** (the ESLint gate will reject them via `@html-eslint/no-inline-styles`).

### Correct
```css
/* In the <style> block or a .css file */
.delete-btn  { background-color: #ef4444; } /* Excluir — business-rules.md */
.btn-login   { background-color: #16a34a; } /* Entrar  — business-rules.md */
.btn-cancel  { background-color: #6b7280; } /* Cancelar — business-rules.md */
```

### Incorrect — fails lint and confuses the AI
```html
<button style="background-color: #16a34a;">Entrar</button>
```

### Known conflict: `frontend-skill.md` vs `business-rules.md`
`skills/frontend-skill.md` references a green CTA (`bg-green-600`) while `business-rules.md` defines "Adicionar" as blue (`#2563eb`). These describe different contexts (generic design language vs specific module buttons). **Always prefer `business-rules.md` for named buttons.** When in doubt, align with the product owner and update `business-rules.md`.

---

## 3. Lint Quality Gate

`.eslintrc.json` enforces two categories of rules:

| Scope | Rules |
|-------|-------|
| **JS files** | `eslint:recommended` — standard JS quality; `jsx-a11y/recommended` — future-proof for any JSX additions |
| **HTML files** | `@html-eslint/recommended` — doctype, charset, viewport, lang, no duplicate ids/attrs; plus explicit gates: `require-button-type`, `no-inline-styles`, `require-img-alt`, `no-aria-hidden-body` |

Run `npm run lint` before pushing. CI rejects PRs with lint failures before running Playwright or spending any AI tokens.

---

## 4. Adding a New Business Rule

1. Edit `skills/business-rules.md` and add the rule in plain language.
2. Update the UI to comply (new CSS class, new aria-label if needed).
3. Codify the style with a CSS class — **no** `style=` inline.
4. Open a PR — VisionGuard will automatically validate the rule is met via Gemini.

---

## 5. AI Provider Contract

See `AGENT_INTEGRATION.md` for the full contract. The current provider lives at `ai_agents/providers/google_gemini.js` and exports:

```js
async function audit({ prompt, screenshotBase64, screenshotMime })
  // → { veredito, descricao, violacoes, raw }
```

Replacing the provider (e.g., switching cloud models) means rewriting that file against the same shape. Adding a second provider is out of scope for the cloud-first design — if you have a use case that requires it, open an issue first.
