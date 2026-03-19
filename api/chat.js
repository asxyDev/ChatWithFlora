// Este archivo vivirá en Vercel y protegerá tu llave secreta.
// Nadie en internet podrá ver el contenido de este archivo excepto el servidor.

export default async function handler(req, res) {
  // Solo permitimos peticiones POST (enviar mensajes)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Obtenemos la llave de las variables de entorno de Vercel (la configuraremos luego)
  const apiKey = process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Error de configuración: API Key no encontrada en el servidor.' });
  }

  try {
    const { contents } = req.body;

    // Llamamos a Google desde el servidor, no desde el navegador del usuario
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-pro:generateContent?key=${apiKey}`,
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
    return res.status(500).json({ error: 'Error interno del servidor al procesar la respuesta de Flora.' });
  }
}