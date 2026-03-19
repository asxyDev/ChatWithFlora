// Ruta: /src/App.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Leaf, AlertCircle, Loader2, X, Send, Paperclip } from 'lucide-react';

export default function App() {
  const [images, setImages] = useState([]); 
  const [conversation, setConversation] = useState([]); 
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (conversation.length === 0) {
      setConversation([{
        role: 'model',
        text: '¡Hola! Soy Flora. 🌿\n\n¿En qué puedo ayudarte hoy? Puedes enviarme una foto de tus plantas o hacerme cualquier consulta botánica.'
      }]);
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, loading, images]);

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    if (images.length + files.length > 3) {
      setError('Máximo 3 fotos por mensaje.');
      return;
    }
    setError('');
    const newImages = [];
    for (let file of files) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        setImages(prev => [...prev, { 
          preview: URL.createObjectURL(file), 
          base64: reader.result.split(',')[1], 
          mimeType: file.type 
        }]);
      };
    }
  };

  const sendMessageToPlant = async () => {
    if (images.length === 0 && !chatInput.trim()) return;
    setLoading(true);
    setError('');

    const userText = chatInput.trim() || "¿Cómo estás Flora?";
    const currentImagesSnapshot = [...images]; 
    const newUserMsg = { role: 'user', text: userText, attachedImages: currentImagesSnapshot };
    const fullHistory = [...conversation, newUserMsg];
    
    setConversation(fullHistory);
    setChatInput('');
    setImages([]);

    try {
      const apiContents = fullHistory.map((msg, i) => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [
          { text: i === 0 ? "Actúa como Flora, una planta sabia. Identifica especies y analiza salud (Barra: 🟩🟩🟩🟨🟥).\n\n" + msg.text : msg.text },
          ...(msg.attachedImages || []).map(img => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } }))
        ]
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: apiContents })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Error en la conexión.');

      setConversation(prev => [...prev, { role: 'model', text: data.candidates[0].content.parts[0].text }]);
    } catch (err) {
      setError(`Flora no pudo responder: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatText = (text) => {
    return text.split(/(\*\*.*?\*\*)/g).map((part, i) => 
      part.startsWith('**') ? <strong key={i} className="font-bold text-emerald-900">{part.slice(2, -2)}</strong> : part
    );
  };

  return (
    <div className="min-h-screen bg-emerald-50 text-gray-800 flex flex-col items-center p-0 md:p-4 font-sans">
      <div className="w-full max-w-2xl bg-white md:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-screen md:h-[90vh] border border-emerald-100">
        <header className="bg-emerald-600 p-5 text-white flex items-center gap-4 shadow-lg shrink-0">
          <div className="bg-white p-2 rounded-full"><Leaf className="w-6 h-6 text-emerald-600" /></div>
          <h1 className="font-bold text-xl tracking-tight">Flora</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-stone-50/30">
          {conversation.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-4 shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-emerald-600 text-white rounded-2xl rounded-tr-none' 
                  : 'bg-white border border-emerald-100 text-gray-700 rounded-2xl rounded-tl-none'
              }`}>
                {msg.attachedImages && (
                  <div className="flex gap-2 mb-2">
                    {msg.attachedImages.map((img, idx) => (
                      <img key={idx} src={img.preview} className="w-16 h-16 object-cover rounded-lg border border-white/20" alt="planta" />
                    ))}
                  </div>
                )}
                <div className="whitespace-pre-wrap leading-relaxed text-sm">
                  {msg.role === 'model' ? formatText(msg.text) : msg.text}
                </div>
              </div>
            </div>
          ))}
          {loading && <div className="flex justify-start"><Loader2 className="w-5 h-5 animate-spin text-emerald-600" /></div>}
          <div ref={chatEndRef} />
        </div>

        <footer className="p-4 border-t bg-white">
          {error && <div className="text-red-500 text-[10px] mb-2 px-2 font-bold">{error}</div>}
          <div className="flex gap-2 items-center bg-gray-50 p-1.5 rounded-full border focus-within:border-emerald-500 transition-all">
            <button onClick={() => fileInputRef.current?.click()} className="p-3 text-emerald-600"><Paperclip className="w-5 h-5"/></button>
            <input type="file" hidden multiple ref={fileInputRef} onChange={handleImageChange} accept="image/*" />
            <input className="flex-1 bg-transparent px-2 outline-none text-sm py-2" placeholder="Escribe aquí..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessageToPlant()} />
            <button onClick={sendMessageToPlant} disabled={loading} className="p-3 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 shadow-md">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}