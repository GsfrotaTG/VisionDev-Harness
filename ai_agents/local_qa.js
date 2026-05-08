require('dotenv').config();
const fs = require('fs');
const ollama = require('./providers/ollama_local');

async function runLocalVision() {
  console.log("🤖 VisionGuard: Auditoria Local Iniciada (Ollama)...");

  const businessRules = fs.readFileSync("./skills/business-rules.md", "utf8").trim();
  const screenshotBase64 = fs.readFileSync("screenshot-final.png", "base64");

  const personaTemplate = fs.readFileSync("./skills/auditor-persona.md", "utf8");
  const prompt = personaTemplate
    .replaceAll("{{BUSINESS_RULES}}", businessRules)
    .replaceAll("{{GIT_DIFF}}", "N/A — execução local sem PR");

  try {
    console.log("⏳ Processando com Ollama llama3.2-vision...");
    const result = await ollama.audit({ prompt, screenshotBase64 });
    console.log("\n" + "=".repeat(40));
    console.log("🛡️ RELATÓRIO DE AUDITORIA LOCAL");
    console.log("=".repeat(40) + "\n");
    console.log(`Descrição:  ${result.descricao}`);
    console.log(`Violações:  ${result.violacoes.length ? result.violacoes.join(', ') : 'nenhuma'}`);
    console.log(`Veredito:   [${result.veredito}]`);
  } catch (error) {
    console.error("❌ Falha na conexão local:", error.message);
  }
}

runLocalVision();
