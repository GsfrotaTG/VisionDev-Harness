require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Octokit } = require("@octokit/rest");
const fs = require("fs");

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function generateWithRetry(model, parts, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await model.generateContent(parts);
      return result.response;
    } catch (err) {
      const isLast = attempt === maxAttempts;
      console.warn(`⚠️  Gemini tentativa ${attempt}/${maxAttempts} falhou: [${err.status ?? err.code}] ${err.message}`);
      if (isLast) throw err;
      await sleep(1000 * Math.pow(2, attempt - 1));
    }
  }
}

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

function buildComment(agentUsed, humanReport, veredito, screenshotsUrl) {
  const statusIcon = veredito?.includes("APROVADO") ? "✅" : "❌";
  const lines = [`### 🛡️ VisionGuard Audit — ${statusIcon} ${veredito ?? "N/A"}`, `**Motor:** \`${agentUsed}\``];

  if (screenshotsUrl) {
    lines.push(
      "",
      "| Botão **Adicionar** | Botão **Excluir** |",
      "|:---:|:---:|",
      `| ![Adicionar](${screenshotsUrl}/screenshot-btn-adicionar.png) | ![Excluir](${screenshotsUrl}/screenshot-btn-excluir.png) |`,
      "",
      "<details>",
      "<summary>📸 Screenshot completo da interface</summary>",
      "",
      `![Interface completa](${screenshotsUrl}/screenshot-final.png)`,
      "",
      "</details>"
    );
  }

  lines.push("", "---", "", humanReport);
  return lines.join("\n");
}

function writeBadge(veredito) {
  const aprovado = veredito?.includes("APROVADO");
  fs.writeFileSync("badge.json", JSON.stringify({
    schemaVersion: 1,
    label: "VisionGuard",
    message: aprovado ? "aprovado" : "reprovado",
    color: aprovado ? "brightgreen" : "critical",
    namedLogo: "github-actions",
  }, null, 2));
}

async function runVisionGuard() {
  console.log("🛡️  VisionGuard: Auditoria de Integridade Iniciada...");

  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY ausente. Configure o secret no repo (Settings → Secrets → Actions).");
    process.exit(1);
  }

  const businessRules = fs.readFileSync("./skills/business-rules.md", "utf8");

  let diff = fs.existsSync("changes.diff") ? fs.readFileSync("changes.diff", "utf8") : "";
  if (!diff || diff.trim() === "") {
    diff = "Análise de integridade do estado atual (sem mudanças pendentes no código).";
  }

  const imageBase64 = fs.readFileSync("screenshot-final.png", "base64");

  const prompt = `
    VOCÊ É O VISIONGUARD, ENGENHEIRO DE QA COGNITIVO.

    [CONTEXTO: REGRAS DE NEGÓCIO]
    ${businessRules}

    [CONTEXTO: CÓDIGO FONTE / MUDANÇAS]
    ${diff}

    TAREFA:
    1. Descreva brevemente o que você vê na imagem.
    2. Verifique se as cores e textos dos botões seguem as regras de negócio.
    3. Dê o veredito: [APROVADO] se tudo estiver correto ou [REPROVADO] se houver violação, listando cada violação.

    Responda em JSON com este formato:
    {
      "descricao": "<o que você vê na interface>",
      "violacoes": ["<violação 1>", "<violação 2>"],
      "veredito": "[APROVADO]" ou "[REPROVADO]"
    }
  `;

  let humanReport = null;
  let agentUsed = "";
  let veredito = null;

  // --- NUVEM: Google Gemini 2.5 Flash ---
  try {
    console.log("☁️  Iniciando análise com Google Gemini 2.5 Flash...");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" },
    });

    const response = await generateWithRetry(model, [
      prompt,
      { inlineData: { data: imageBase64, mimeType: "image/png" } },
    ]);

    const parsed = JSON.parse(response.text());
    veredito = parsed.veredito;

    humanReport = [
      `**Descrição:** ${parsed.descricao}`,
      parsed.violacoes?.length
        ? `**Violações:**\n${parsed.violacoes.map(v => `- ${v}`).join("\n")}`
        : "**Violações:** nenhuma",
      `**Veredito:** ${parsed.veredito}`,
    ].join("\n\n");

    agentUsed = "Gemini 2.5 Flash (Cloud)";
  } catch (cloudErr) {
    console.error(`❌ Gemini falhou após retries: [${cloudErr.status ?? cloudErr.code}] ${cloudErr.message}`);

    if (process.env.CI !== "true") {
      try {
        console.log("🔄 Acionando fallback local (Ollama)...");
        const localResponse = await fetch("http://localhost:11434/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama3.2-vision",
            prompt,
            images: [imageBase64],
            stream: false,
            options: { temperature: 0.1 },
          }),
        });
        const data = await localResponse.json();
        humanReport = data.response;
        agentUsed = "Ollama llama3.2-vision (Local)";
      } catch (localErr) {
        console.error("❌ Ollama também indisponível:", localErr.message);
      }
    }

    if (!humanReport) {
      const errorBody = [
        "### ⚠️ VisionGuard — Falha na Auditoria",
        "O motor de IA não conseguiu processar a análise. Detalhes do erro:",
        `\`\`\`\n[${cloudErr.status ?? cloudErr.code}] ${cloudErr.message}\n\`\`\``,
        "**Ação necessária:** Verifique se o secret `GEMINI_API_KEY` está configurado corretamente no repositório.",
      ].join("\n\n");
      await postPRComment(errorBody);
      writeBadge(null);
      process.exit(1);
    }
  }

  // --- OUTPUT ---
  console.log(`\n--- ✨ RELATÓRIO VISIONGUARD (${agentUsed}) ---`);
  console.log(humanReport);
  console.log("-------------------------------------------\n");

  // Artefatos para downstream jobs
  fs.writeFileSync("audit-output.md", `### 🛡️ VisionGuard Audit\n**Motor:** \`${agentUsed}\`\n\n${humanReport}\n`);
  writeBadge(veredito);

  // Comentário no PR com imagens inline (se SCREENSHOTS_BASE_URL disponível)
  const comment = buildComment(agentUsed, humanReport, veredito, process.env.SCREENSHOTS_BASE_URL || null);
  await postPRComment(comment);

  if (process.env.STRICT_MODE === "true" && veredito && !veredito.includes("APROVADO")) {
    console.error("🚨 STRICT_MODE: veredito é REPROVADO — sinalizando falha para acionar rollback.");
    process.exit(2);
  }
}

runVisionGuard();
