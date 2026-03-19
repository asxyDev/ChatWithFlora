export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const apiKey = process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API Key no configurada.' });

  try {
    const { contents } = req.body;
    //GEM_PRO_2.5
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      }
    );

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Error de conexión con el motor botánico.' });
  }
}