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

  useEffect(() => {
    if (conversation.length === 0) {
      setConversation([{ role: 'model', text: 'Hola, Alan. Soy Flora. 🌿\n\nMis raíces están listas para escucharte. ¿Qué planta analizamos hoy?' }]);
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
        // Inject system prompt only on the first turn or keep context
        let contentText = msg.text || (msg.attachedImages?.length > 0 ? "Analiza esta planta." : "");
        if (index === 0) {
           contentText = `Actúa como Flora, una experta botánica mística. 
           Identifica especies y analiza salud SIEMPRE usando la barra 🟩🟩🟩🟨🟥. 
           Usa metáforas botánicas y lenguaje cálido. \n\n${contentText}`;
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
      if (!res.ok) throw new Error(data.error?.message || 'Error en el servidor');

      setConversation(prev => [...prev, { role: 'model', text: data.candidates[0].content.parts[0].text }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F7F3] flex flex-col items-center p-0 md:p-6 font-sans">
      {/* Contenedor más ancho: max-w-4xl */}
      <div className="w-full max-w-4xl bg-white shadow-2xl md:rounded-[2.5rem] flex flex-col h-screen md:h-[85vh] overflow-hidden border border-emerald-100">
        
        <header className="bg-emerald-600 p-6 text-white flex items-center gap-4 shadow-md">
          <div className="bg-white p-2 rounded-full shadow-inner">
            <Leaf className="w-6 h-6 text-emerald-600" />
          </div>
          <h1 className="font-bold text-2xl tracking-tight">Flora</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-emerald-50/10">
          {conversation.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-5 rounded-3xl shadow-sm ${
                msg.role === 'user' 
                ? 'bg-emerald-700 text-white rounded-tr-none' 
                : 'bg-white text-stone-700 rounded-tl-none border border-emerald-100'
              }`}>
                {msg.attachedImages?.length > 0 && (
                  <div className="flex gap-2 mb-3">
                    {msg.attachedImages.map((img, idx) => (
                      <img key={idx} src={img.preview} className="w-24 h-24 object-cover rounded-xl border border-black/5" alt="upload" />
                    ))}
                  </div>
                )}
                <div className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                  {msg.text}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white p-4 rounded-2xl border border-emerald-100 animate-pulse">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <footer className="p-5 bg-white border-t border-emerald-50">
          {/* Previsualización de imágenes adjuntas ANTES de enviar */}
          {images.length > 0 && (
            <div className="flex gap-3 mb-4 p-2 bg-emerald-50/50 rounded-2xl border border-emerald-100 w-fit">
              {images.map((img, i) => (
                <div key={i} className="relative group">
                  <img src={img.preview} className="w-16 h-16 object-cover rounded-xl shadow-md border-2 border-white" />
                  <button 
                    onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:scale-110 transition-transform"
                  >
                    <X className="w-3 h-3"/>
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && <div className="text-red-600 text-[11px] mb-3 px-3 font-bold bg-red-50 py-2 rounded-lg border border-red-100 flex items-center gap-2">
            <AlertCircle className="w-3 h-3"/> {error}
          </div>}

          <div className="flex gap-3 items-center bg-stone-100/80 p-2 rounded-full border border-stone-200 focus-within:bg-white focus-within:border-emerald-500 focus-within:shadow-md transition-all">
            <button onClick={() => fileInputRef.current.click()} className="p-3 text-emerald-600 hover:bg-emerald-100 rounded-full transition-colors">
              <Paperclip className="w-5 h-5"/>
            </button>
            <input type="file" hidden multiple ref={fileInputRef} onChange={handleImageChange} accept="image/*" />
            
            <input 
              className="flex-1 bg-transparent px-3 outline-none text-sm font-medium" 
              placeholder="Habla con Flora..." 
              value={chatInput} 
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            
            <button 
              onClick={sendMessage} 
              disabled={loading || (!chatInput.trim() && images.length === 0)}
              className="p-3 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-30"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}