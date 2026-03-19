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
      setConversation([{ role: 'model', text: '¡Hola! Soy Flora. 🌿 ¿En qué puedo ayudarte hoy?' }]);
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, loading]);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 3) return setError('Máximo 3 fotos.');
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
      const apiContents = fullHistory.map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [
          { text: msg.text },
          ...(msg.attachedImages || []).map(img => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } }))
        ]
      }));

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
    <div className="min-h-screen bg-[#f8faf8] flex flex-col items-center p-0 md:p-4">
      <div className="w-full max-w-2xl bg-white shadow-2xl md:rounded-[2.5rem] flex flex-col h-screen md:h-[90vh] overflow-hidden border border-emerald-50">
        <header className="bg-emerald-600 p-5 text-white flex items-center gap-4">
          <Leaf className="w-6 h-6" />
          <h1 className="font-bold text-xl tracking-tight">Flora</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {conversation.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-4 rounded-3xl shadow-sm ${
                msg.role === 'user' 
                ? 'bg-emerald-700 text-white rounded-tr-none' 
                : 'bg-emerald-50 text-emerald-900 rounded-tl-none border border-emerald-100'
              }`}>
                {msg.attachedImages?.length > 0 && (
                  <div className="flex gap-2 mb-2">
                    {msg.attachedImages.map((img, idx) => (
                      <img key={idx} src={img.preview} className="w-20 h-20 object-cover rounded-xl border border-white/20" />
                    ))}
                  </div>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{msg.text}</p>
              </div>
            </div>
          ))}
          {loading && <Loader2 className="animate-spin text-emerald-600 mx-auto" />}
          <div ref={chatEndRef} />
        </div>

        <footer className="p-4 bg-white border-t border-emerald-50">
          {error && <div className="text-red-500 text-[10px] mb-3 p-2 bg-red-50 rounded-lg border border-red-100 font-bold">⚠️ {error}</div>}
          <div className="flex gap-2 items-center bg-gray-100/50 p-2 rounded-full border border-gray-200">
            <button onClick={() => fileInputRef.current.click()} className="p-2.5 text-emerald-600 hover:bg-emerald-100 rounded-full transition-colors"><Paperclip className="w-5 h-5"/></button>
            <input type="file" hidden multiple ref={fileInputRef} onChange={handleImageChange} accept="image/*" />
            <input 
              className="flex-1 bg-transparent px-2 outline-none text-sm font-medium" 
              placeholder="Habla con Flora..." 
              value={chatInput} 
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            <button onClick={sendMessage} className="p-3 bg-emerald-600 text-white rounded-full shadow-lg active:scale-95 transition-transform"><Send className="w-5 h-5" /></button>
          </div>
        </footer>
      </div>
    </div>
  );
}