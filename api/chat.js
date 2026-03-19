// Usaremos gemini-1.5-flash para asegurar compatibilidad total
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const apiKey = process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Error: API Key no configurada en Vercel.' });
  }

  try {
    const { contents } = req.body;

    // Cambiado a gemini-1.5-flash (el más compatible y rápido)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Error en el servidor:", error);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
}