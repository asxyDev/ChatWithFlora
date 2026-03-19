import React, { useState, useRef, useEffect } from 'react';
import { Leaf, AlertCircle, Loader2, X, Send, Paperclip, Github } from 'lucide-react';

export default function App() {
  const [images, setImages] = useState([]); 
  const [conversation, setConversation] = useState([]); 
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  // Mensaje de inicio
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

    // Devolver el foco al chat automáticamente
    setTimeout(() => inputRef.current?.focus(), 150);
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
        
        if (index === 0) {
           contentText = `IDENTIDAD: Eres Flora. Hablas como un conjunto de plantas ("Somos", "Nos sentimos").
           PERSONALIDAD: Sabia, mística y muy cálida. 
           ESTRUCTURA SI HAY FOTO (NO use ### ni ***):
           🌱 ¿Quién soy?
           🔍 ¿Cómo me veo?
           🩺 ¿Cómo me siento?
           💧 Lo que necesito
           ❤️ Indicador de Vida (Barra de emojis y %).
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

  // Renderizador limpio que elimina basura de Markdown
  const renderCleanText = (text) => {
    if (!text) return null;
    // Quitamos encabezados ### y separadores ***
    const cleanText = text.replace(/###\s?/g, '').replace(/\*\*\*/g, '');
    
    return cleanText.split(/(\*\*.*?\*\*)/g).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-emerald-900">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="min-h-screen bg-[#F1F8F1] flex flex-col items-center p-0 md:p-4 font-sans selection:bg-emerald-100">
      <div className="w-full max-w-4xl bg-white shadow-2xl md:rounded-[2.5rem] flex flex-col h-screen md:h-[88vh] overflow-hidden border border-emerald-50">
        
        <header className="bg-emerald-600 p-5 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-full shadow-inner"><Leaf className="w-5 h-5 text-emerald-600" /></div>
            <h1 className="font-bold text-xl tracking-tight">Flora</h1>
          </div>
          <div className="text-[9px] bg-emerald-700/50 px-3 py-1 rounded-full uppercase tracking-widest font-bold">Voz de la Naturaleza</div>
        </header>

        {/* Fondo con textura botánica cómoda */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/leaf.png')] bg-repeat">
          {conversation.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-5 shadow-sm transition-all duration-300 ${
                msg.role === 'user' 
                ? 'bg-emerald-700 text-white rounded-[1.8rem] rounded-tr-none' 
                : 'bg-white/95 backdrop-blur-sm text-stone-800 rounded-[1.8rem] rounded-tl-none border border-emerald-50'
              }`}>
                {msg.attachedImages?.length > 0 && (
                  <div className="flex gap-3 mb-4">
                    {msg.attachedImages.map((img, idx) => (
                      <img key={idx} src={img.preview} className="w-28 h-28 object-cover rounded-2xl border-2 border-white shadow-md" alt="p" />
                    ))}
                  </div>
                )}
                <div className="text-[14px] leading-relaxed whitespace-pre-wrap font-medium">
                  {renderCleanText(msg.text)}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/80 p-3 rounded-full border border-emerald-100 shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <footer className="p-5 bg-white border-t border-emerald-50 shrink-0">
          {images.length > 0 && (
            <div className="flex gap-3 mb-4 p-2 bg-emerald-50 rounded-2xl w-fit border border-emerald-100">
              {images.map((img, i) => (
                <div key={i} className="relative group">
                  <img src={img.preview} className="w-16 h-16 object-cover rounded-xl shadow-md border-2 border-white" />
                  <button onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X className="w-3 h-3"/></button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 items-center bg-stone-100/50 p-1.5 rounded-full border border-stone-200 focus-within:bg-white focus-within:border-emerald-500 transition-all shadow-inner">
            <button onClick={() => fileInputRef.current?.click()} className="p-3 text-emerald-600 hover:bg-emerald-100 rounded-full"><Paperclip className="w-5 h-5"/></button>
            <input type="file" hidden multiple ref={fileInputRef} onChange={handleImageChange} accept="image/*" />
            <input 
              ref={inputRef}
              className="flex-1 bg-transparent px-2 outline-none text-sm font-medium" 
              placeholder="Susurra algo a Flora..." 
              value={chatInput} 
              onChange={e => setChatInput(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && sendMessage()} 
            />
            <button onClick={sendMessage} disabled={loading} className="p-3.5 bg-emerald-600 text-white rounded-full shadow-lg active:scale-95 transition-all"><Send className="w-5 h-5" /></button>
          </div>

          <div className="mt-4 flex flex-col items-center gap-1">
            <div className="flex items-center gap-2 text-[10px] text-stone-400 font-bold uppercase tracking-widest">
              <span>Made by</span>
              <a href="https://github.com/asxyDev" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-emerald-600 hover:underline">
                <Github className="w-3 h-3" /> asxyDev
              </a>
            </div>
            <span className="text-[8px] text-stone-300 font-black uppercase tracking-[0.2em]">Fase Beta</span>
          </div>
        </footer>
      </div>
    </div>
  );
}