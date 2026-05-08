require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function audit({ prompt, screenshotBase64, screenshotMime = 'image/png' }) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" },
  });

  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await model.generateContent([
        prompt,
        { inlineData: { data: screenshotBase64, mimeType: screenshotMime } },
      ]);
      const raw = response.response.text();
      const parsed = JSON.parse(raw);
      return {
        veredito: parsed.veredito,
        descricao: parsed.descricao || '',
        violacoes: Array.isArray(parsed.violacoes) ? parsed.violacoes : [],
        raw,
      };
    } catch (err) {
      lastErr = err;
      console.warn(`⚠️  Gemini tentativa ${attempt}/3 falhou: [${err.status ?? err.code}] ${err.message}`);
      if (attempt < 3) await sleep(1000 * Math.pow(2, attempt - 1));
    }
  }
  throw lastErr;
}

module.exports = { audit };
