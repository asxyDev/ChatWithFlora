import React, { useState, useRef, useEffect } from 'react';
import { Leaf, AlertCircle, Loader2, X, Send, Paperclip, Sparkles } from 'lucide-react';

export default function App() {
  const [images, setImages] = useState([]); 
  const [conversation, setConversation] = useState([]); 
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  // Mensaje de bienvenida inicial
  useEffect(() => {
    if (conversation.length === 0) {
      setConversation([{
        role: 'model',
        text: '¡Hola! Soy Flora. Siente mi presencia como el sol tibio de la mañana. 🌱\n\n¿Qué semilla de duda o curiosidad te ha traído hasta mi sombra? Pídeme un diagnóstico o envíame una foto para ayudarte a florecer.'
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

    const userText = chatInput.trim() || "¿Cómo estás?";
    const newUserMsg = { role: 'user', text: userText, attachedImages: [...images] };
    const fullHistory = [...conversation, newUserMsg];
    
    setConversation(fullHistory);
    setChatInput('');
    setImages([]);

    try {
      const apiContents = fullHistory.map((msg, i) => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [
          { text: i === 0 ? "Actúa como Flora, una planta sabia y mística. Analiza salud con barra 🟩🟩🟩🟨🟥 e identifica especies. Usa metáforas botánicas.\n\n" + msg.text : msg.text },
          ...(msg.attachedImages || []).map(img => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } }))
        ]
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: apiContents })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Error en el servidor de Flora');

      setConversation(prev => [...prev, { role: 'model', text: data.candidates[0].content.parts[0].text }]);
    } catch (err) {
      setError('Flora está descansando o hay un error de conexión. Revisa tu API Key.');
      console.error(err);
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
    <div className="min-h-screen bg-emerald-50 text-gray-800 flex flex-col items-center p-0 md:p-4 font-sans selection:bg-emerald-200">
      <div className="w-full max-w-2xl bg-white md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-screen md:h-[90vh] border border-emerald-100">
        
        <header className="bg-emerald-600 p-5 text-white flex items-center gap-4 shadow-lg shrink-0">
          <div className="bg-white p-2 rounded-full shadow-inner">
            <Leaf className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight">ChatWithFlora</h1>
            <p className="text-[10px] text-emerald-100 uppercase tracking-widest font-bold">En línea • Bosque Digital</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/leaf.png')]">
          {conversation.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
              <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white border border-emerald-100 text-gray-700 rounded-tl-none'}`}>
                {msg.attachedImages && (
                  <div className="flex gap-2 mb-3">
                    {msg.attachedImages.map((img, idx) => (
                      <img key={idx} src={img.preview} className="w-16 h-16 object-cover rounded-lg border border-black/10" alt="p" />
                    ))}
                  </div>
                )}
                <div className="whitespace-pre-wrap leading-relaxed">
                  {msg.role === 'model' ? formatText(msg.text) : msg.text}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-emerald-100 p-4 rounded-2xl rounded-tl-none shadow-sm">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <footer className="p-4 border-t bg-white shrink-0">
          {error && <div className="text-red-500 text-[11px] mb-2 px-2 font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {error}</div>}
          
          {images.length > 0 && (
            <div className="flex gap-2 mb-3 px-2">
              {images.map((img, i) => (
                <div key={i} className="relative">
                  <img src={img.preview} className="w-12 h-12 object-cover rounded-lg border-2 border-emerald-500" />
                  <button onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md"><X className="w-3 h-3"/></button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-center bg-emerald-50/50 p-1 rounded-full border border-emerald-100 focus-within:border-emerald-500 transition-all">
            <button onClick={() => fileInputRef.current?.click()} className="p-3 text-emerald-600 hover:bg-emerald-100 rounded-full transition-colors"><Paperclip className="w-5 h-5"/></button>
            <input type="file" hidden multiple ref={fileInputRef} onChange={handleImageChange} accept="image/*" />
            <input 
              className="flex-1 bg-transparent px-2 outline-none text-sm py-2" 
              placeholder="Habla con Flora..." 
              value={chatInput} 
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessageToPlant()}
            />
            <button 
              onClick={sendMessageToPlant} 
              disabled={loading}
              className="p-3 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 shadow-md transition-all disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}