import React, { useState, useRef, useEffect } from 'react';

export default function App() {
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [plantaActiva, setPlantaActiva] = useState(null);
  const [misPlantas, setMisPlantas] = useState([]);
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);
  const [imagenBase64, setImagenBase64] = useState(null);
  
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const plantasGuardadas = localStorage.getItem('flora_jardin');
    if (plantasGuardadas) setMisPlantas(JSON.parse(plantasGuardadas));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const procesarImagen = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setImagenBase64(canvas.toDataURL('image/jpeg', 0.7));
      };
    };
  };

  const enviarMensaje = async () => {
    if (!chatInput.trim() && !imagenBase64) return;
    const userMsg = chatInput;
    const imgAdjunta = imagenBase64;
    setChatInput('');
    setImagenBase64(null);
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg, img: imgAdjunta }]);
    setIsLoading(true);
    setGuardadoExitoso(false);

    try {
      const payload = { contents: [{ role: 'user', parts: [] }] };
      if (imgAdjunta) payload.contents[0].parts.push({ inlineData: { mimeType: 'image/jpeg', data: imgAdjunta.split(',')[1] } });
      if (userMsg) payload.contents[0].parts.push({ text: userMsg });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      let botText = data.text || "";

      // --- 🚨 EL NUEVO CAZADOR DE DATOS Y LIMPIADOR 🚨 ---
      
      // 1. Buscamos el JSON de los datos, ya sea en <floradata> o en un bloque ```json
      const regexFlora = /<floradata>([\s\S]*?)<\/floradata>/;
      const regexJson = /```json\s*([\s\S]*?)\s*```/;
      
      let match = botText.match(regexFlora) || botText.match(regexJson);

      if (match && match[1]) {
        try {
          const jsonLimpio = match[1].replace(/```json/g, '').replace(/```/g, '').trim();
          setPlantaActiva(JSON.parse(jsonLimpio));
          // Borramos el bloque de datos original del texto
          botText = botText.replace(match[0], '').trim();
        } catch (e) { console.error("Error al leer JSON de Flora:", e); }
      }

      // 2. LIMPIEZA EXTREMA DE RUIDO VISUAL
      botText = botText.replace(/```[\s\S]*?```/g, ''); // Elimina cualquier bloque de código restante
      botText = botText.replace(/###/g, ''); // Elimina hashtags grandes
      botText = botText.replace(/##/g, ''); // Elimina hashtags medianos
      botText = botText.replace(/#/g, ''); // Elimina hashtags pequeños
      botText = botText.replace(/\*\*/g, ''); // Elimina asteriscos de negrita crudos
      botText = botText.replace(/\{"text":\s*"/g, ''); // Por si Claude alucina formato JSON crudo
      botText = botText.replace(/"\}/g, '');
      botText = botText.trim();

      setChatHistory(prev => [...prev, { role: 'assistant', content: botText }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: '🥀 Error de conexión. Intenta de nuevo.' }]);
    } finally { 
      setIsLoading(false); 
    }
  };

  const guardarEnJardin = () => {
    if (!plantaActiva) return;
    const nuevoJardin = [...misPlantas, plantaActiva];
    setMisPlantas(nuevoJardin);
    localStorage.setItem('flora_jardin', JSON.stringify(nuevoJardin));
    setGuardadoExitoso(true);
  };

  return (
    <div className="flex h-[100dvh] w-full bg-[#f8f4e8] text-[#20352b] font-sans overflow-hidden">
      
      {/* 1. SIDEBAR IZQUIERDO */}
      <div className="hidden md:flex w-1/4 max-w-[280px] bg-[#1a3d2f] text-[#f8f4e8] flex-col shadow-2xl z-20">
        <div className="p-6 border-b border-[#2a6b4f]">
          <h1 className="text-2xl font-bold text-[#c9a96e]">🌿 Flora</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {misPlantas.map((p, i) => (
            <button key={i} onClick={() => {setPlantaActiva(p); setGuardadoExitoso(true)}} className="w-full text-left p-3 rounded-2xl bg-[#234f3d] border-l-4 border-[#c9a96e] hover:bg-[#2a6b4f] transition flex items-center gap-3 shadow-md">
              <span className="text-xl">🪴</span>
              <div className="overflow-hidden">
                <p className="font-bold text-sm text-white truncate">{p.nombre}</p>
                <p className="text-[10px] text-[#c9a96e] uppercase font-bold truncate">{p.jardin}</p>
              </div>
            </button>
          ))}
        </div>
        {/* LINK A GITHUB MEJORADO */}
        <div className="p-4 border-t border-[#2a6b4f] text-center">
          <a href="https://github.com/asxyDev" target="_blank" rel="noreferrer" className="text-xs text-[#c9a96e] hover:text-white transition font-semibold tracking-wider">
            Made by asxyDev
          </a>
        </div>
      </div>

      {/* 2. CHAT CENTRAL */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-[#e8e0c9] to-[#f8f4e8] relative">
        <div className="px-6 py-4 bg-white/60 border-b border-[#e8e0c9] flex justify-between items-center z-10 backdrop-blur-md">
          <h2 className="font-bold">Consultorio Botánico</h2>
          <span className="text-[10px] bg-[#1a3d2f] text-[#c9a96e] px-3 py-1 rounded-full font-bold shadow-sm">IA ACTIVA</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {chatHistory.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 animate-fade-in">
              <div className="w-24 h-24 bg-[#1a3d2f] rounded-full flex items-center justify-center text-5xl shadow-xl mb-6">🌱</div>
              <h2 className="text-3xl font-bold text-[#1a3d2f] mb-3">Conoce a Flora</h2>
              <p className="text-gray-600 max-w-md mx-auto mb-8">Tu experta botánica impulsada por Inteligencia Artificial. Diagnostica plagas, aprende de cuidados y crea tu jardín virtual.</p>
              <div className="flex flex-wrap justify-center gap-3">
                <button onClick={() => fileInputRef.current.click()} className="px-5 py-3 bg-white border border-[#c9a96e] text-[#1a3d2f] rounded-xl font-bold shadow-sm hover:bg-[#f0eade] transition flex items-center gap-2">
                  📷 Diagnosticar Foto
                </button>
                <button onClick={() => setChatInput('¿Cómo cuido una Monstera?')} className="px-5 py-3 bg-[#1a3d2f] text-[#c9a96e] rounded-xl font-bold shadow-md hover:bg-[#234f3d] transition">
                  🌿 Aprender de Especies
                </button>
              </div>
            </div>
          )}

          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-4 rounded-2xl shadow-sm max-w-[85%] md:max-w-[70%] text-sm leading-relaxed ${msg.role === 'user' ? 'bg-[#1a3d2f] text-white rounded-tr-none' : 'bg-white text-gray-800 border border-[#e8e0c9] rounded-tl-none'}`}>
                {msg.img && <img src={msg.img} alt="Planta adjunta" className="w-full max-w-[200px] rounded-xl mb-3 border border-gray-200" />}
                {/* Texto limpio renderizado normalmente, sin formateadores raros */}
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}
          {isLoading && <div className="text-[#2a6b4f] text-xs font-bold italic animate-pulse flex gap-2 items-center"><span className="text-xl">✨</span> Analizando raíces...</div>}
          <div ref={chatEndRef} />
        </div>

        {/* INPUT DE CHAT Y SUBIDA DE IMAGEN */}
        <div className="p-4 bg-white border-t border-[#e8e0c9]">
          <div className="max-w-4xl mx-auto flex flex-col gap-2">
            {imagenBase64 && (
              <div className="relative w-16 h-16 rounded-xl border-2 border-[#2a6b4f] overflow-hidden shadow-sm">
                <img src={imagenBase64} alt="preview" className="w-full h-full object-cover" />
                <button onClick={() => setImagenBase64(null)} className="absolute top-0 right-0 bg-red-500 text-white w-5 h-5 flex items-center justify-center text-xs rounded-bl-lg">x</button>
              </div>
            )}
            
            <div className="flex gap-2 items-end">
              <input type="file" accept="image/*" ref={fileInputRef} onChange={(e) => procesarImagen(e.target.files[0])} className="hidden" />
              <button onClick={() => fileInputRef.current.click()} className="p-4 text-gray-400 hover:text-[#2a6b4f] bg-gray-50 rounded-2xl border border-gray-200 transition text-xl h-[56px] flex items-center justify-center">
                📎
              </button>
              <textarea
                placeholder="Escribe un mensaje..."
                className="flex-1 p-4 rounded-2xl border border-gray-200 outline-none focus:border-[#2a6b4f] bg-gray-50 resize-none min-h-[56px] max-h-[120px]"
                rows="1"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensaje(); } }}
              />
              <button onClick={enviarMensaje} disabled={isLoading || (!chatInput && !imagenBase64)} className="px-6 bg-[#2a6b4f] text-white rounded-2xl font-bold hover:bg-[#1a3d2f] disabled:opacity-50 transition h-[56px]">
                Enviar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. PANEL DERECHO (Diseño UI Mejorado) */}
      <div className="hidden lg:flex w-1/4 max-w-[360px] bg-white border-l border-[#e8e0c9] shadow-2xl flex-col z-20 overflow-y-auto custom-scrollbar relative">
        {!plantaActiva ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center space-y-4">
            <div className="w-32 h-32 bg-gray-50 border-2 border-dashed border-gray-200 rounded-full flex items-center justify-center text-5xl">🪴</div>
            <p className="text-sm font-medium">El panel despertará cuando analices una planta.</p>
          </div>
        ) : (
          <div className="p-6 space-y-6 pb-12 animate-fade-in">
            <div className="text-center relative">
               <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-3 ${plantaActiva.esGeneral ? 'bg-amber-100 text-amber-700' : 'bg-[#e8f3ee] text-[#2a6b4f]'}`}>
                {plantaActiva.esGeneral ? '📚 Ficha Especie' : '🩺 Paciente'}
              </span>
              <h3 className="text-3xl font-black text-[#1a3d2f] leading-tight">{plantaActiva.nombre}</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100 flex flex-col gap-1 relative overflow-hidden">
                <span className="text-gray-400 text-[10px] font-bold uppercase z-10">{plantaActiva.esGeneral ? 'Dificultad' : 'Salud'}</span>
                <span className={`text-2xl font-black z-10 ${plantaActiva.salud < 40 ? 'text-red-500' : 'text-[#1a3d2f]'}`}>{plantaActiva.salud || 0}%</span>
                <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-red-400 to-[#2a6b4f]" style={{ width: `${plantaActiva.salud || 0}%` }}></div>
              </div>
              <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100 flex flex-col gap-1 relative overflow-hidden">
                <span className="text-gray-400 text-[10px] font-bold uppercase z-10">{plantaActiva.esGeneral ? 'Humedad' : 'Agua'}</span>
                <span className="text-2xl font-black text-blue-500 z-10">{plantaActiva.agua || 0}%</span>
                <div className="absolute bottom-0 left-0 h-full bg-blue-50 opacity-50" style={{ width: `${plantaActiva.agua || 0}%` }}></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-orange-50 p-3 rounded-2xl flex items-center gap-3">
                <span className="text-2xl">☀️</span>
                <div className="flex flex-col"><span className="text-[9px] text-orange-400 font-bold uppercase">Luz</span><span className="text-xs font-black text-orange-900">{plantaActiva.luz || '-'}</span></div>
              </div>
              <div className="bg-emerald-50 p-3 rounded-2xl flex items-center gap-3">
                <span className="text-2xl">🧪</span>
                <div className="flex flex-col"><span className="text-[9px] text-emerald-500 font-bold uppercase">Abono</span><span className="text-xs font-black text-emerald-900">{plantaActiva.nutrientes || '-'}</span></div>
              </div>
            </div>

            {plantaActiva.curiosidad && (
              <div className="bg-gradient-to-br from-[#1a3d2f] to-[#2a6b4f] text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
                <span className="absolute -bottom-4 -right-2 text-8xl opacity-10 font-serif">?</span>
                <h4 className="text-[#c9a96e] text-[10px] font-bold uppercase tracking-widest mb-2">Curiosidad</h4>
                <p className="text-sm font-medium leading-relaxed">"{plantaActiva.curiosidad}"</p>
              </div>
            )}

            {!plantaActiva.esGeneral && (
              <button onClick={guardarEnJardin} disabled={guardadoExitoso} className={`w-full py-4 rounded-2xl font-black uppercase tracking-wider text-xs transition shadow-md ${guardadoExitoso ? 'bg-gray-100 text-gray-400' : 'bg-[#c9a96e] text-[#1a3d2f] hover:bg-[#b59862]'}`}>
                {guardadoExitoso ? '✓ Guardado' : '+ Guardar Planta'}
              </button>
            )}

            <div className="border-l-4 border-[#2a6b4f] pl-4 py-1">
               <span className="font-black text-[#1a3d2f] block text-xs uppercase tracking-widest mb-1">Diagnóstico</span>
               <p className="text-sm text-gray-600 leading-relaxed">{plantaActiva.diagnostico || '-'}</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}