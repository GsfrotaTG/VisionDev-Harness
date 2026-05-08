async function audit({ prompt, screenshotBase64 }) {
  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3.2-vision",
      prompt,
      images: [screenshotBase64],
      stream: false,
      format: "json",
      options: { temperature: 0.1 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  const raw = data.response || '';

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\[?(APROVADO|REPROVADO)\]?/i);
    parsed = {
      veredito: match ? match[1].toUpperCase() : 'REPROVADO',
      descricao: raw.substring(0, 300),
      violacoes: [],
    };
  }

  return {
    veredito: parsed.veredito || 'REPROVADO',
    descricao: parsed.descricao || raw.substring(0, 300),
    violacoes: Array.isArray(parsed.violacoes) ? parsed.violacoes : [],
    raw,
  };
}

module.exports = { audit };
