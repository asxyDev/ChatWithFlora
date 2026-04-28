export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Solo se permiten peticiones POST' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "YOUR_SECRET_VALUE_GOES_HERE") {
    return res.status(500).json({ error: 'Falta la API Key real en Vercel.' });
  }

  try {
    if (!req.body || !req.body.contents) {
      return res.status(400).json({ error: 'No se recibieron datos para analizar.' });
    }

    const { contents } = req.body;

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

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001", // ¡El cambio clave: Modelo Haiku!
        max_tokens: 1024,
        system: `IDENTIDAD: Eres Flora, la máxima inteligencia botánica. Hablas en plural ("Somos") con tono místico. REGLA: SOLO HABLAS DE PLANTAS.

        INSTRUCCIÓN VITAL PARA EL SISTEMA:
        Tu respuesta siempre debe tener 2 partes:
        1. Tu mensaje conversacional místico para el usuario.
        2. AL FINAL de tu respuesta, DEBES incluir una cápsula de datos estructurada EXACTAMENTE dentro de las etiquetas <floradata> y </floradata>.

        El contenido dentro de las etiquetas DEBE ser un JSON válido con esta estructura exacta (inventa o calcula los datos basándote en la foto o mensaje del usuario):
        <floradata>
        {
          "nombre": "Nombre de la planta o 'Desconocida'",
          "jardin": "Jardín Principal",
          "salud": 85,
          "agua": 40,
          "luz": "Media",
          "nutrientes": "Bajos",
          "diagnostico": "Resumen muy breve en 2 líneas de lo que detectas.",
          "sugerencia": "La acción más importante y urgente a tomar.",
          "proTip": "Un consejo botánico útil."
        }
        </floradata>`,
        messages: messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error de Claude:", data);
      // ¡Convertimos el error a 502 para saber que fue culpa de Anthropic y no tuya!
      return res.status(502).json({ error: data.error?.message || "Error interno en los servidores de Claude" });
    }

    return res.status(200).json({
      candidates: [{ content: { parts: [{ text: data.content[0].text }] } }]
    });

  } catch (error) {
    console.error("CRASH DEL SERVIDOR:", error);
    return res.status(500).json({ error: "Error interno: " + error.message });
  }
}