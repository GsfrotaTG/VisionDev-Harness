# VisionGuard Cognitive Harness

> **Continuous Inspection cognitivo para CI/CD** — transforma a esteira de GitHub Actions num QA Sênior autônomo que entende regras de negócio.

[![VisionGuard](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/GsfrotaTG/VisionDev-Harness/visionguard-evidence/badge.json&style=for-the-badge)](https://github.com/GsfrotaTG/VisionDev-Harness/actions)
[![Histórico de Auditorias](https://img.shields.io/badge/histórico-auditorias-blue?style=for-the-badge&logo=github)](https://github.com/GsfrotaTG/VisionDev-Harness/blob/visionguard-evidence/audit-history.md)

Projeto do **Hackathon Thoughtworks 2026**.

---

## O Problema

Testes de UI tradicionais são frágeis, acoplados a seletores CSS e **cegos a regras de negócio**. Um código pode passar em todos os testes e ainda assim subir uma tela com o botão da cor errada, violando a identidade visual da empresa. E ninguém percebe até o usuário reclamar.

---

## A Solução: Continuous Inspection Cognitivo

Em vez de testar *se o código funciona*, o VisionGuard pergunta o que importa de verdade:

| Pergunta | Fonte |
|---|---|
| **O que o dev tentou fazer?** | Git Diff |
| **Qual foi o impacto visual real?** | Screenshot capturado pelo Playwright |
| **Isso fere o que a empresa exige?** | Markdown de regras de negócio (`skills/business-rules.md`) |

A IA responde essas 3 perguntas em cada Pull Request e em cada deploy em produção.

---

## Arquitetura: 2 Gates Cognitivos

```
┌─────────────────────────────────────────────────────────────┐
│                    PULL REQUEST ABERTO                       │
│                                                             │
│  Git Diff ──┐                                               │
│             ├──► VisionGuard ──► [APROVADO]  → libera merge  │
│  Screenshot ┘     (Gemini)    ──► [REPROVADO] → bloqueia PR  │
│  Regras .md ┘                                               │
└─────────────────────────────────────────────────────────────┘
                          │ merge em main
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  PRODUCTION PIPELINE                         │
│                                                             │
│  1. snapshot  → salva gh-pages atual em prod-stable          │
│  2. deploy    → publica public/ em GitHub Pages              │
│  3. smoke     → HTTP 200 + VisionGuard STRICT contra prod    │
│       ├── [APROVADO] → deploy confirmado                     │
│       └── [REPROVADO] → rollback automático para prod-stable │
│                         + issue aberta com relatório da IA   │
└─────────────────────────────────────────────────────────────┘
```

---

## Os 2 Diferenciais Competitivos

### 1. Documentação Viva (Agnóstico a Código)

A IA é guiada por um arquivo Markdown:

```markdown
# skills/business-rules.md
- O botão "Adicionar" deve ser obrigatoriamente AZUL (#2563eb).
- O botão "Excluir" deve ser VERMELHO (#ef4444).
```

Se a equipe de Produto decidir que o botão agora é roxo, ela edita o Markdown. Na próxima PR, a esteira já cobra a nova regra — **sem alterar uma linha de código do motor de testes**.

### 2. Governança com Rollback Automático

O veredito da IA não é informativo — é gate. Em PR, `[REPROVADO]` bloqueia o merge. Em produção, com `STRICT_MODE=true`, ele derruba o smoke-test com exit code 2 e dispara rollback automático para a branch `prod-stable` (último deploy aprovado), além de abrir uma issue de incidente com o relatório completo da IA.

```
PR:    [REPROVADO] ──► comentário detalhado, merge bloqueado
Prod:  [REPROVADO] ──► rollback automático + issue `production-incident`
```

---

## Setup

### Pré-requisitos

- Node.js 20+
- Repositório no GitHub com GitHub Pages habilitado
- Conta no Google AI Studio (Gemini API)

### Configuração do repositório (uma vez)

1. **Secret da IA:**
   `Settings → Secrets and variables → Actions → New repository secret`
   Nome: `GEMINI_API_KEY` | Valor: sua chave do Google AI Studio

2. **GitHub Pages:**
   `Settings → Pages → Source = Deploy from a branch`
   Branch: `gh-pages` | Path: `/`

3. **Permissões do workflow:**
   `Settings → Actions → General → Workflow permissions`
   Selecionar: **Read and write permissions**

### Rodando localmente

```bash
npm install
npm start              # sobe a UI em http://localhost:8080
npm test               # Playwright captura screenshot
npm run audit          # VisionGuard audita com Gemini
```

---

## Stack

| Camada | Tecnologia |
|---|---|
| Captura visual | Playwright |
| IA cognitiva | Google Gemini 2.5 Flash |
| GitHub integration | Octokit REST |
| Deploy | GitHub Pages via peaceiris/actions-gh-pages |
| Automação | GitHub Actions |

---

## Status

Esteira funcional com:
- [x] Sandbox gate em Pull Requests
- [x] Production pipeline com snapshot/deploy/smoke/rollback
- [x] Rollback automático orientado pelo veredito da IA
- [x] Relatórios estruturados em comentários de PR e issues de incidente
- [ ] Dashboard de histórico de auditorias *(roadmap)*
- [ ] Orquestração multi-skill via Claude Sonnet *(roadmap — `scripts/orchestrator.py`)*

---

*Construído para o Hackathon Thoughtworks 2026.*
