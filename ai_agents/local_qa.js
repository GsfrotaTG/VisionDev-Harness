const fs = require('fs');

async function runLocalVision() {
  console.log("🤖 VisionGuard: Iniciando Auditoria Baseada em Regras...");

  // 1. CARGA DINÂMICA DE CONTEXTO (Zero Hardcode)
  const businessRules = fs.readFileSync("./skills/business-rules.md", "utf8");
  const imageBase64 = fs.readFileSync("screenshot-final.png", "base64");

  // 2. PROMPT DE RACIOCÍNIO (Template Genérico)
  // Em vez de dizer "o botão é azul", passamos a regra bruta e pedimos auditoria.
  const prompt = `
    ATUA COMO UM AUDITOR DE QUALIDADE (QA).
    
    [CONTEXTO: REGRAS DE NEGÓCIO DO PROJETO]
    ${businessRules}

    [TAREFA]
    Analisa a imagem da interface anexa seguindo rigorosamente estes passos:
    1. Identifica todos os elementos visuais importantes (botões, inputs, títulos).
    2. Para cada regra listada no [CONTEXTO], verifica se a imagem a cumpre.
    3. Descreve o que vês antes de decidires (Visual Chain of Thought).

    [FORMATO DE RESPOSTA]
    - Análise Técnica: (Descreve os elementos e cores detetados)
    - Verificação de Regras: (Lista cada regra e diz se "Cumpre" ou "Viola")
    - Veredito: [APROVADO] ou [REPROVADO]
  `;

  try {
    console.log("⏳ O M4 Pro está a processar as regras contra a imagem...");
    
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2-vision', // Ou 'moondream' para maior precisão de cores
        prompt: prompt,
        images: [imageBase64],
        stream: false,
        options: {
          temperature: 0.1, // Baixa temperatura = menos "criatividade"/alucinação
          top_p: 0.9
        }
      })
    });

    const data = await response.json();
    console.log("\n" + "=".repeat(40));
    console.log("🛡️ RELATÓRIO DE AUDITORIA LOCAL");
    console.log("=".repeat(40) + "\n");
    console.log(data.response);

  } catch (error) {
    console.error("❌ Falha na conexão local:", error.message);
  }
}

runLocalVision();