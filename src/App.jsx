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
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, loading, images]);

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 3) {
      setError('Máximo 3 fotos permitidas.');
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

    const newUserMsg = { role: 'user', text: chatInput.trim() || "¿Cómo estás?", attachedImages: [...images] };
    const fullHistory = [...conversation, newUserMsg];
    setConversation(fullHistory);
    setChatInput('');
    setImages([]);

    try {
      const apiContents = fullHistory.map((msg, i) => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [
          { text: i === 0 ? "Eres Flora, una experta botánica. Analiza salud con barra 🟩🟩🟩🟨🟥 e identifica especies.\n\n" + msg.text : msg.text },
          ...(msg.attachedImages || []).map(img => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } }))
        ]
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: apiContents })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Error en el servidor');

      setConversation(prev => [...prev, { role: 'model', text: data.candidates[0].content.parts[0].text }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-50 flex flex-col items-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-[2rem] shadow-xl overflow-hidden flex flex-col h-[90vh]">
        <header className="bg-emerald-600 p-4 text-white flex items-center gap-3 shrink-0">
          <Leaf className="w-6 h-6" />
          <h1 className="font-bold">ChatWithFlora</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-gray-700">
          {conversation.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-2xl ${msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-gray-100'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && <div className="flex justify-center"><Loader2 className="animate-spin text-emerald-600" /></div>}
          <div ref={chatEndRef} />
        </div>

        <footer className="p-4 border-t bg-white shrink-0">
          <div className="flex gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="p-2 border rounded-full text-emerald-600"><Paperclip /></button>
            <input type="file" hidden multiple ref={fileInputRef} onChange={handleImageChange} accept="image/*" />
            <input 
              className="flex-1 border rounded-full px-4 outline-none focus:border-emerald-500" 
              placeholder="Habla con Flora..." 
              value={chatInput} 
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessageToPlant()}
            />
            <button onClick={sendMessageToPlant} className="p-2 bg-emerald-600 text-white rounded-full"><Send /></button>
          </div>
        </footer>
      </div>
    </div>
  );
}