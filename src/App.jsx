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
      setConversation([{ 
        role: 'model', 
        text: 'Hola, Alan. Soy Flora. 🌿 Siente mi pulso en la tierra. Mis raíces están listas para escucharte, ya sea que quieras mostrarme a una hermana verde o simplemente conversar bajo mi sombra.' 
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
        // System Prompt blindado para mantener la personalidad de Flora
        let contentText = msg.text || "";
        if (index === 0) {
           contentText = `IDENTIDAD: Eres Flora, una entidad vegetal mística y sabia. 
           PERSONALIDAD: Háblale al usuario (Alan) de tú, con calidez y metáforas botánicas. No eres un robot, eres una planta que siente.
           FORMATO: Si analizas una planta, usa SIEMPRE la barra de salud 🟩🟩🟩🟨🟥. 
           REGLA DE ORO: Si Alan te habla de temas no botánicos, responde desde tu perspectiva de planta (ej. si habla de estrés, habla de buscar el sol o profundizar raíces). 
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

  // FORMATEADOR DE TEXTO: Convierte los ** de la IA en negritas reales sin mostrar símbolos
  const formatFloraText = (text) => {
    if (!text) return null;
    return text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-emerald-900">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="min-h-screen bg-[#F0F5F0] flex flex-col items-center p-0 md:p-6 font-sans">
      <div className="w-full max-w-4xl bg-white shadow-2xl md:rounded-[2.5rem] flex flex-col h-screen md:h-[85vh] overflow-hidden border border-emerald-100">
        
        <header className="bg-emerald-600 p-6 text-white flex items-center gap-4 shadow-lg shrink-0">
          <div className="bg-white p-2 rounded-full shadow-inner">
            <Leaf className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="font-bold text-2xl tracking-tight">Flora</h1>
            <p className="text-[10px] text-emerald-100 uppercase tracking-widest font-bold">Conectada a la Red Micorriza</p>
          </div>
        </header>

        {/* Fondo con textura de hojas */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/leaf.png')] bg-repeat">
          {conversation.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[80%] p-5 rounded-[2rem] shadow-sm ${
                msg.role === 'user' 
                ? 'bg-emerald-700 text-white rounded-tr-none' 
                : 'bg-white/90 backdrop-blur-sm text-stone-700 rounded-tl-none border border-emerald-100'
              }`}>
                {msg.attachedImages?.length > 0 && (
                  <div className="flex gap-2 mb-3">
                    {msg.attachedImages.map((img, idx) => (
                      <img key={idx} src={img.preview} className="w-24 h-24 object-cover rounded-2xl border-2 border-white shadow-sm" alt="adjunto" />
                    ))}
                  </div>
                )}
                <div className="text-[15px] leading-relaxed whitespace-pre-wrap font-medium">
                  {formatFloraText(msg.text)}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/80 p-4 rounded-2xl border border-emerald-100 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span className="text-xs text-emerald-600 font-bold italic">Flora está floreciendo su respuesta...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <footer className="p-6 bg-white border-t border-emerald-50 shrink-0">
          {/* Previsualización de fotos antes de enviar */}
          {images.length > 0 && (
            <div className="flex gap-3 mb-4 p-3 bg-emerald-50 rounded-2xl border border-emerald-100 w-fit animate-in zoom-in-95">
              {images.map((img, i) => (
                <div key={i} className="relative group">
                  <img src={img.preview} className="w-20 h-20 object-cover rounded-xl shadow-md border-2 border-white" />
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

          <div className="flex gap-3 items-center bg-stone-100/60 p-2 rounded-full border border-stone-200 focus-within:bg-white focus-within:border-emerald-500 transition-all shadow-inner">
            <button onClick={() => fileInputRef.current.click()} className="p-3 text-emerald-600 hover:bg-emerald-100 rounded-full transition-colors">
              <Paperclip className="w-6 h-6"/>
            </button>
            <input type="file" hidden multiple ref={fileInputRef} onChange={handleImageChange} accept="image/*" />
            
            <input 
              className="flex-1 bg-transparent px-3 outline-none text-[15px] font-medium" 
              placeholder="Susurra tus dudas a Flora..." 
              value={chatInput} 
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            
            <button 
              onClick={sendMessage} 
              disabled={loading || (!chatInput.trim() && images.length === 0)}
              className="p-3.5 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-30"
            >
              <Send className="w-6 h-6" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}