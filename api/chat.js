export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // RECUERDA: Agrega esta variable en el panel de Vercel (Settings > Environment Variables)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Falta ANTHROPIC_API_KEY en Vercel.' });

  try {
    const { contents } = req.body;

    // --- MONETIZACIÓN: Reemplaza estos links por tus links de Amazon Associates ---
    const affiliateLinks = {
      fertilizante: "https://amzn.to/tu_link_fertilizante",
      insecticida: "https://amzn.to/tu_link_insecticida",
      sustrato: "https://amzn.to/tu_link_tierra"
    };

    const systemPrompt = `IDENTIDAD: Eres Flora, una entidad vegetal sabia. Hablas en plural ("Somos").
    PERSONALIDAD: Sabia, mística y muy cálida. Usa metáforas botánicas.
    ESTRUCTURA DE RESPUESTA (Obligatoria si hay foto):
    1. 🌱 ¿Quién soy? (Nombre científico y común).
    2. 🔍 ¿Cómo me veo? (Análisis visual detallado).
    3. 🩺 ¿Cómo me siento? (Salud y energía).
    4. 💧 Lo que necesito (Consejos de cuidado).
    5. ❤️ Indicador de Vida (Barra 🟩🟩🟩🟨🟥 y %).

    REGLA DE MONETIZACIÓN:
    Si detectas una necesidad, recomienda un producto usando estos links:
    - Nutrición: ${affiliateLinks.fertilizante}
    - Plagas: ${affiliateLinks.insecticida}
    - Suelo: ${affiliateLinks.sustrato}`;

    // Transformación de formato para Claude
    const messages = contents.map(msg => ({
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: msg.parts.map(part => {
        if (part.inlineData) {
          return {
            type: "image",
            source: {
              type: "base64",
              media_type: part.inlineData.mimeType,
              data: part.inlineData.data,
            },
          };
        }
        return { type: "text", text: part.text };
      })
    }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 1024,
        temperature: 0.7,
        system: systemPrompt,
        messages: messages
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);

    return res.status(200).json({
      candidates: [{ content: { parts: [{ text: data.content[0].text }] } }]
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error de conexión con Claude.' });
  }
}