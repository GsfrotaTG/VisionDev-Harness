require('dotenv').config();
const fs = require("fs");
const { Octokit } = require("@octokit/rest");
const gemini = require("./providers/google_gemini");

const ENGINE = "Gemini 2.5 Flash (Cloud)";

async function postPRComment(body) {
  if (!process.env.PR_NUMBER || process.env.PR_NUMBER === "undefined") return;
  try {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    await octokit.rest.issues.createComment({
      owner: process.env.REPO_OWNER,
      repo: process.env.REPO_NAME,
      issue_number: parseInt(process.env.PR_NUMBER),
      body,
    });
    console.log("✅ Feedback enviado ao Pull Request.");
  } catch (e) {
    console.warn("⚠️  Não foi possível comentar no PR:", e.message);
  }
}

function buildComment(humanReport, veredito, screenshotsUrl) {
  const statusIcon = veredito === 'APROVADO' ? "✅" : "❌";
  const lines = [
    `### 🛡️ VisionGuard Audit — ${statusIcon} [${veredito ?? "N/A"}]`,
    `**Motor:** \`${ENGINE}\``,
  ];

  if (screenshotsUrl) {
    const targets = fs.existsSync("./skills/capture-targets.json")
      ? JSON.parse(fs.readFileSync("./skills/capture-targets.json", "utf8"))
      : [];
    const captured = targets.filter(t => {
      const slug = t.label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      return fs.existsSync(`screenshot-${slug}.png`);
    });
    if (captured.length > 0) {
      const headers = captured.map(t => `**${t.label}**`).join(" | ");
      const seps    = captured.map(() => ":---:").join(" | ");
      const imgs    = captured.map(t => {
        const slug = t.label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        return `![${t.label}](${screenshotsUrl}/screenshot-${slug}.png)`;
      }).join(" | ");
      lines.push("", `| ${headers} |`, `| ${seps} |`, `| ${imgs} |`);
    }
    lines.push(
      "", "<details>", "<summary>📸 Screenshot completo da interface</summary>", "",
      `![Interface completa](${screenshotsUrl}/screenshot-final.png)`, "", "</details>"
    );
  }

  lines.push("", "---", "", humanReport);
  return lines.join("\n");
}

function writeBadge(veredito) {
  const aprovado = veredito === 'APROVADO';
  fs.writeFileSync("badge.json", JSON.stringify({
    schemaVersion: 1,
    label: "VisionGuard",
    message: aprovado ? "aprovado" : "reprovado",
    color: aprovado ? "brightgreen" : "critical",
    namedLogo: "github-actions",
  }, null, 2));
}

function formatHumanReport(result) {
  return [
    `**Descrição:** ${result.descricao}`,
    result.violacoes?.length
      ? `**Violações:**\n${result.violacoes.map(v => `- ${v}`).join("\n")}`
      : "**Violações:** nenhuma",
    `**Veredito:** [${result.veredito}]`,
  ].join("\n\n");
}

async function runVisionGuard() {
  console.log("🛡️  VisionGuard: Auditoria de Integridade Iniciada...");

  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY ausente. Configure o secret no repo (Settings → Secrets → Actions).");
    process.exit(1);
  }

  const brPath = "./skills/business-rules.md";
  const businessRules = fs.existsSync(brPath) ? fs.readFileSync(brPath, "utf8").trim() : "";
  if (!businessRules) {
    const msg = [
      "### ⚠️ VisionGuard — Regras de Negócio Ausentes",
      "",
      "`skills/business-rules.md` está vazio ou não existe.",
      "",
      "**Sem regras definidas não há como auditar.** Crie o arquivo com as diretrizes da tela antes de abrir um PR.",
      "",
      "Exemplo:",
      "```markdown",
      "- O botão \"Confirmar\" deve ser VERDE (#16a34a).",
      "- O botão \"Cancelar\" deve ser CINZA (#6b7280).",
      "```",
    ].join("\n");
    console.error("❌ skills/business-rules.md ausente ou vazio — auditoria bloqueada.");
    await postPRComment(msg);
    process.exit(1);
  }

  let diff = fs.existsSync("changes.diff") ? fs.readFileSync("changes.diff", "utf8") : "";
  if (!diff || diff.trim() === "") {
    diff = "Análise de integridade do estado atual (sem mudanças pendentes no código).";
  }

  const screenshotBase64 = fs.readFileSync("screenshot-final.png", "base64");

  const aomTree = fs.existsSync("a11y-snapshot.json")
    ? fs.readFileSync("a11y-snapshot.json", "utf8")
    : "";

  const personaTemplate = fs.readFileSync("./skills/auditor-persona.md", "utf8");
  const prompt = personaTemplate
    .replaceAll("{{BUSINESS_RULES}}", businessRules)
    .replaceAll("{{GIT_DIFF}}", diff)
    .replaceAll("{{AOM_TREE}}", aomTree);

  let result;
  try {
    console.log("☁️  Iniciando análise com Google Gemini 2.5 Flash...");
    result = await gemini.audit({ prompt, screenshotBase64, screenshotMime: "image/png" });
  } catch (err) {
    const errorBody = [
      "### ⚠️ VisionGuard — Falha na Auditoria",
      "O motor de IA não conseguiu processar a análise. Detalhes do erro:",
      `\`\`\`\n[${err.status ?? err.code}] ${err.message}\n\`\`\``,
      "**Ação necessária:** Verifique se o secret `GEMINI_API_KEY` está configurado corretamente no repositório.",
    ].join("\n\n");
    console.error(`❌ Gemini falhou após retries: [${err.status ?? err.code}] ${err.message}`);
    await postPRComment(errorBody);
    writeBadge(null);
    process.exit(1);
  }

  const humanReport = formatHumanReport(result);
  console.log(`\n--- ✨ RELATÓRIO VISIONGUARD (${ENGINE}) ---`);
  console.log(humanReport);
  console.log("-------------------------------------------\n");

  fs.writeFileSync("audit-output.md", `### 🛡️ VisionGuard Audit\n**Motor:** \`${ENGINE}\`\n\n${humanReport}\n`);
  writeBadge(result.veredito);

  const comment = buildComment(humanReport, result.veredito, process.env.SCREENSHOTS_BASE_URL || null);
  await postPRComment(comment);

  if (process.env.STRICT_MODE === "true" && result.veredito !== "APROVADO") {
    console.error("🚨 STRICT_MODE: veredito é REPROVADO — sinalizando falha para acionar rollback.");
    process.exit(2);
  }
}

runVisionGuard();
