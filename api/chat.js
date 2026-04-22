export default async function handler(req, res) {
  // 1. Solo aceptamos POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo se permiten peticiones POST' });
  }

  // 2. Revisar la Llave
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "YOUR_SECRET_VALUE_GOES_HERE") {
    console.error("ERROR: No se encontró la ANTHROPIC_API_KEY real.");
    return res.status(500).json({ error: 'Falta la API Key real en Vercel.' });
  }

  try {
    // 3. Revisar que lleguen datos
    const body = req.body;
    if (!body || !body.contents) {
      console.error("ERROR: El cuerpo de la petición está vacío.");
      return res.status(400).json({ error: 'No se recibieron mensajes para analizar.' });
    }

    const { contents } = body;

    // 4. Transformar mensajes (con protección de errores)
    const messages = contents.map(msg => {
      const role = (msg.role === 'model' || msg.role === 'assistant') ? 'assistant' : 'user';
      
      const contentParts = (msg.parts || []).map(part => {
        if (part.inlineData) {
          return {
            type: "image",
            source: {
              type: "base64",
              media_type: part.inlineData.mimeType || "image/jpeg",
              data: part.inlineData.data,
            },
          };
        }
        return { type: "text", text: part.text || "..." };
      });

      return { role, content: contentParts };
    });

    // 5. Llamada a Claude
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
        system: "Eres Flora, una entidad vegetal sabia. Analiza plantas con misticismo y precisión. Habla en plural ('Somos').",
        messages: messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error de la API de Claude:", data);
      return res.status(response.status).json({ error: data.error?.message || "Error en Claude" });
    }

    // 6. Respuesta compatible con tu App.jsx
    return res.status(200).json({
      candidates: [{ content: { parts: [{ text: data.content[0].text }] } }]
    });

  } catch (error) {
    console.error("CRASH DEL SERVIDOR:", error);
    return res.status(500).json({ error: "Error interno: " + error.message });
  }
}