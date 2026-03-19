import React, { useState, useRef, useEffect } from 'react';
import { Leaf, AlertCircle, Loader2, X, Send, Paperclip } from 'lucide-react';

export default function App() {
  const [images, setImages] = useState([]); 
  const [conversation, setConversation] = useState([]); 
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Mensaje de bienvenida universal
  useEffect(() => {
    if (conversation.length === 0) {
      setConversation([{ 
        role: 'model', 
        text: '¡Hola! Somos las pequeñas que habitan en este rincón. Nos da mucha alegría que te acerques a preguntarnos cómo estamos. 🌱' 
      }]);
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, loading]);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 3) return setError('Máximo 3 fotos por mensaje.');
    setError('');
    files.forEach(file => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        setImages(prev => [...prev, { preview: URL.createObjectURL(file), base64: reader.result.split(',')[1], mimeType: file.type }]);
      };
    });
  };

  const sendMessage = async () => {
    if (!chatInput.trim() && images.length === 0) return;
    setLoading(true); setError('');
    
    const newUserMsg = { role: 'user', text: chatInput, attachedImages: [...images] };
    const fullHistory = [...conversation, newUserMsg];
    setConversation(fullHistory);
    setChatInput(''); setImages([]);

    try {
      const apiContents = fullHistory.map((msg, index) => {
        const parts = [];
        let contentText = msg.text || "";
        
        // System Prompt blindado: Sin nombres específicos, personalidad botánica pura
        if (index === 0) {
           contentText = `IDENTIDAD: Eres Flora. Hablas en primera persona del plural ("Somos", "Nos sentimos") como si fueras el conjunto de plantas del usuario.
           PERSONALIDAD: Cálida, mística y sabia. Usa metáforas de raíces, fotosíntesis y savia.
           ESTRUCTURA SI HAY FOTO:
           1. 🌱 ¿Quién soy? (Nombre científico y común).
           2. 🔍 ¿Cómo me veo? (Descripción visual detallada de lo que ves en la imagen).
           3. 🩺 ¿Cómo me siento? (Estado de salud y ánimo).
           4. 💧 Lo que necesito (3 consejos de cuidado).
           5. ❤️ Indicador de Vida (Barra 🟩🟩🟩🟨🟥 y %).
           
           CONVERSACIÓN GENERAL: Si el usuario te habla de cualquier otro tema, responde desde tu perspectiva de planta, relacionando sus sentimientos con ciclos naturales.
           \n\n${contentText}`;
        }
        
        parts.push({ text: contentText });
        if (msg.attachedImages) {
          msg.attachedImages.forEach(img => {
            parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
          });
        }
        return { role: msg.role === 'model' ? 'model' : 'user', parts };
      });

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: apiContents })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Error en la conexión.');

      setConversation(prev => [...prev, { role: 'model', text: data.candidates[0].content.parts[0].text }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Renderizador que elimina los asteriscos ** y aplica negritas reales de CSS
  const renderFloraResponse = (text) => {
    if (!text) return null;
    return text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-emerald-900">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="min-h-screen bg-[#ECF0EC] flex flex-col items-center p-0 md:p-6 font-sans">
      {/* Contenedor max-w-4xl para espacio amplio */}
      <div className="w-full max-w-4xl bg-white shadow-2xl md:rounded-[3rem] flex flex-col h-screen md:h-[90vh] overflow-hidden border border-emerald-100">
        
        <header className="bg-emerald-600 p-6 text-white flex items-center gap-4 shadow-lg shrink-0">
          <div className="bg-white p-2 rounded-full"><Leaf className="w-6 h-6 text-emerald-600" /></div>
          <div>
            <h1 className="font-bold text-2xl tracking-tighter">Flora</h1>
            <p className="text-[10px] text-emerald-100 uppercase tracking-widest font-bold">Voz de la Naturaleza</p>
          </div>
        </header>

        {/* Espacio de conversación con textura de hojas de fondo */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-[url('https://www.transparenttextures.com/patterns/leaf.png')] bg-repeat">
          {conversation.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-6 shadow-sm transition-all duration-300 ${
                msg.role === 'user' 
                ? 'bg-emerald-700 text-white rounded-[2.2rem] rounded-tr-none' 
                : 'bg-white/95 backdrop-blur-sm text-stone-800 rounded-[2.2rem] rounded-tl-none border border-emerald-50'
              }`}>
                {msg.attachedImages?.length > 0 && (
                  <div className="flex gap-3 mb-4">
                    {msg.attachedImages.map((img, idx) => (
                      <img key={idx} src={img.preview} className="w-32 h-32 object-cover rounded-3xl border-4 border-white shadow-md" alt="planta" />
                    ))}
                  </div>
                )}
                <div className="text-[15px] leading-relaxed whitespace-pre-wrap font-medium">
                  {renderFloraResponse(msg.text)}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white p-4 rounded-full border border-emerald-100 shadow-sm animate-pulse">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <footer className="p-6 bg-white border-t border-emerald-50 shrink-0">
          {/* Previsualización de fotos adjuntas */}
          {images.length > 0 && (
            <div className="flex gap-3 mb-4 p-3 bg-emerald-50/50 rounded-3xl w-fit border border-emerald-100 animate-in zoom-in-95">
              {images.map((img, i) => (
                <div key={i} className="relative">
                  <img src={img.preview} className="w-20 h-20 object-cover rounded-2xl shadow-md border-2 border-white" />
                  <button onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:scale-110 transition-transform"><X className="w-3 h-3"/></button>
                </div>
              ))}
            </div>
          )}

          {error && <div className="text-red-600 text-[11px] mb-3 px-3 font-bold bg-red-50 py-2 rounded-lg border border-red-100 flex items-center gap-2">
            <AlertCircle className="w-3 h-3"/> {error}
          </div>}

          <div className="flex gap-3 items-center bg-stone-100/60 p-2 rounded-full border border-stone-200 focus-within:bg-white focus-within:border-emerald-500 focus-within:shadow-xl transition-all">
            <button onClick={() => fileInputRef.current?.click()} className="p-3 text-emerald-600 hover:bg-emerald-100 rounded-full transition-colors"><Paperclip className="w-6 h-6"/></button>
            <input type="file" hidden multiple ref={fileInputRef} onChange={handleImageChange} accept="image/*" />
            <input className="flex-1 bg-transparent px-3 outline-none text-[15px] font-medium" placeholder="Habla con Flora..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} />
            <button onClick={sendMessage} disabled={loading} className="p-4 bg-emerald-600 text-white rounded-full shadow-xl hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-30"><Send className="w-6 h-6" /></button>
          </div>
        </footer>
      </div>
    </div>
  );
}