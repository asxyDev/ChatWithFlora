export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Solo se permiten peticiones POST' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "YOUR_SECRET_VALUE_GOES_HERE") {
    return res.status(500).json({ error: 'Falta la API Key real en Vercel.' });
  }

  try {
    if (!req.body) {
      return res.status(400).json({ error: 'El cuerpo de la petición está vacío.' });
    }

    let messages = [];

    // 1. COMPATIBILIDAD: Detectamos si el Frontend manda el formato nuevo (texto) o el viejo (imágenes)
    if (req.body.message || req.body.prompt || req.body.text) {
      // Formato Nuevo (El que usa nuestro Dashboard actual)
      const userMessage = req.body.message || req.body.prompt || req.body.text;
      messages = [{ role: 'user', content: userMessage }];
    } 
    else if (req.body.contents) {
      // Formato Viejo (Para cuando reactivemos las fotos)
      messages = req.body.contents.map(msg => {
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
    } 
    else {
      return res.status(400).json({ error: 'No se recibieron datos válidos para analizar.' });
    }

    // 2. Llamada a Claude
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: `IDENTIDAD: Eres Flora, la máxima conciencia botánica. Hablas en plural ("Somos") con tono místico. SOLO HABLAS DE PLANTAS.

        INSTRUCCIÓN DE CONTEXTO:
        Debes detectar si el usuario te pregunta por una planta específica que TIENE (Modo Diagnóstico) o si pregunta información GENERAL sobre una especie (Modo Enciclopedia).

        ESTRUCTURA OBLIGATORIA <floradata>:
        Al final de cada respuesta, genera el JSON con esta lógica:
        1. "esGeneral": true (si es información teórica/especie) o false (si es un diagnóstico de una planta real del usuario).
        2. "salud": Si esGeneral es true, este valor representa la "Dificultad de Cuidado" (0 fácil - 100 difícil). Si es false, es la salud actual.
        3. "curiosidad": Un dato breve tipo "Sabías que..." sobre la planta.

        <floradata>
        {
          "nombre": "Nombre de la planta",
          "jardin": "Nombre del jardín o 'Especie'",
          "esGeneral": true, 
          "salud": 50,
          "agua": 60,
          "luz": "Alta/Media/Baja",
          "nutrientes": "Nivel requerido",
          "diagnostico": "Breve descripción de la especie o diagnóstico.",
          "sugerencia": "Tip principal de cuidado.",
          "proTip": "Dato experto.",
          "curiosidad": "Dato fascinante para el 'Sabías que...'"
        }
        </floradata>`,
        messages: messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error de Claude:", data);
      return res.status(502).json({ error: data.error?.message || "Error interno en los servidores de Claude" });
    }

    const claudeText = data.content[0].text;

    // 3. RESPUESTA UNIVERSAL: Devolvemos el formato que espera tu nuevo App.jsx
    return res.status(200).json({
      text: claudeText, 
      candidates: [{ content: { parts: [{ text: claudeText }] } }]
    });

  } catch (error) {
    console.error("CRASH DEL SERVIDOR:", error);
    return res.status(500).json({ error: "Error interno: " + error.message });
  }
}