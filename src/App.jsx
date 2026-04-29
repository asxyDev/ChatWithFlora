import React, { useState, useRef, useEffect } from 'react';

export default function App() {
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [plantaActiva, setPlantaActiva] = useState(null);
  const [misPlantas, setMisPlantas] = useState([]);
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);
  const [imagenBase64, setImagenBase64] = useState(null);
  
  // NUEVO: Estados para controlar los paneles en celular
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  
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

      const regexFlora = /<floradata>([\s\S]*?)<\/floradata>/;
      const regexJson = /```json\s*([\s\S]*?)\s*```/;
      
      let match = botText.match(regexFlora) || botText.match(regexJson);

      if (match && match[1]) {
        try {
          const jsonLimpio = match[1].replace(/```json/g, '').replace(/```/g, '').trim();
          setPlantaActiva(JSON.parse(jsonLimpio));
          botText = botText.replace(match[0], '').trim();
          
          // NUEVO: Auto-abrir el panel derecho en celular al recibir diagnóstico
          if (window.innerWidth < 1024) {
             setIsRightPanelOpen(true);
          }
        } catch (e) { console.error("Error al leer JSON:", e); }
      }

      // LIMPIEZA EXTREMA
      botText = botText.replace(/```[\s\S]*?```/g, '');
      botText = botText.replace(/###/g, '');
      botText = botText.replace(/##/g, '');
      botText = botText.replace(/#/g, '');
      botText = botText.replace(/\*\*/g, '');
      botText = botText.replace(/\{"text":\s*"/g, '');
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

  // Función al abrir una planta guardada en móvil
  const abrirPlantaGuardada = (p) => {
    setPlantaActiva(p);
    setGuardadoExitoso(true);
    setIsLeftPanelOpen(false); // Cierra el menú izquierdo
    setIsRightPanelOpen(true); // Abre el panel derecho
  };

  return (
    <div className="flex h-[100dvh] w-full bg-[#f8f4e8] text-[#20352b] font-sans overflow-hidden relative">
      
      {/* OVERLAYS OSCUROS PARA MÓVIL (Al hacer clic fuera del panel, se cierra) */}
      {isLeftPanelOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsLeftPanelOpen(false)}></div>}
      {isRightPanelOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsRightPanelOpen(false)}></div>}

      {/* 1. SIDEBAR IZQUIERDO (Tus Jardines) */}
      <div className={`fixed md:relative inset-y-0 left-0 z-50 w-[80%] md:w-1/4 max-w-[280px] bg-[#1a3d2f] text-[#f8f4e8] flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${isLeftPanelOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 border-b border-[#2a6b4f] flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#c9a96e]">🌿 Flora</h1>
          <button className="md:hidden text-white text-2xl" onClick={() => setIsLeftPanelOpen(false)}>×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {misPlantas.map((p, i) => (
            <button key={i} onClick={() => abrirPlantaGuardada(p)} className="w-full text-left p-3 rounded-2xl bg-[#234f3d] border-l-4 border-[#c9a96e] hover:bg-[#2a6b4f] transition flex items-center gap-3 shadow-md">
              <span className="text-xl">🪴</span>
              <div className="overflow-hidden">
                <p className="font-bold text-sm text-white truncate">{p.nombre}</p>
                <p className="text-[10px] text-[#c9a96e] uppercase font-bold truncate">{p.jardin}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 2. CHAT CENTRAL */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-[#e8e0c9] to-[#f8f4e8] relative w-full h-full">
        
        {/* HEADER MEJORADO */}
        <div className="px-4 py-3 bg-white/70 border-b border-[#e8e0c9] flex justify-between items-center z-10 backdrop-blur-md shadow-sm">
          {/* Botón menú izquierdo (Solo móvil) */}
          <button className="md:hidden p-2 text-[#1a3d2f] hover:bg-[#e8e0c9] rounded-lg transition flex items-center gap-2" onClick={() => setIsLeftPanelOpen(true)}>
            <span className="text-xl">🌿</span>
            <span className="text-xs font-bold uppercase hidden sm:block">Mi Jardín</span>
          </button>

          {/* Título y Autor */}
          <div className="flex items-baseline gap-2 text-center flex-1 justify-center md:justify-start md:ml-4">
            <h2 className="font-black text-[#1a3d2f] text-lg sm:text-xl">Consultorio</h2>
            <a href="https://github.com/asxyDev" target="_blank" rel="noreferrer" className="text-[10px] text-[#c9a96e] hover:text-[#1a3d2f] transition font-bold uppercase tracking-wider hidden sm:block">
              by asxyDev
            </a>
          </div>

          {/* Botón panel derecho (Solo móvil) */}
          <button className="lg:hidden p-2 text-white bg-[#2a6b4f] hover:bg-[#1a3d2f] rounded-lg shadow-md transition flex items-center gap-2 text-xs font-bold uppercase px-3" onClick={() => setIsRightPanelOpen(true)}>
            <span>🩺</span>
            <span className="hidden sm:block">Estado</span>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {chatHistory.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 animate-fade-in">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#1a3d2f] rounded-full flex items-center justify-center text-4xl sm:text-5xl shadow-xl mb-4 sm:mb-6">🌱</div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#1a3d2f] mb-2 sm:mb-3">Conoce a Flora</h2>
              <p className="text-gray-600 max-w-md mx-auto mb-6 sm:mb-8 text-sm sm:text-base">Tu experta botánica impulsada por IA. Diagnostica plagas, aprende de cuidados y crea tu jardín virtual.</p>
              <div className="flex flex-col sm:flex-row justify-center gap-3 w-full sm:w-auto">
                <button onClick={() => fileInputRef.current.click()} className="w-full sm:w-auto px-5 py-3 bg-white border border-[#c9a96e] text-[#1a3d2f] rounded-xl font-bold shadow-sm hover:bg-[#f0eade] transition flex items-center justify-center gap-2">
                  📷 Foto
                </button>
                <button onClick={() => setChatInput('¿Cómo cuido una Monstera?')} className="w-full sm:w-auto px-5 py-3 bg-[#1a3d2f] text-[#c9a96e] rounded-xl font-bold shadow-md hover:bg-[#234f3d] transition">
                  🌿 Aprender
                </button>
              </div>
            </div>
          )}

          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-4 rounded-2xl shadow-sm max-w-[85%] md:max-w-[70%] text-[13px] sm:text-sm leading-relaxed ${msg.role === 'user' ? 'bg-[#1a3d2f] text-white rounded-tr-none' : 'bg-white text-gray-800 border border-[#e8e0c9] rounded-tl-none'}`}>
                {msg.img && <img src={msg.img} alt="Planta adjunta" className="w-full max-w-[200px] rounded-xl mb-3 border border-gray-200" />}
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}
          {isLoading && <div className="text-[#2a6b4f] text-xs font-bold italic animate-pulse flex gap-2 items-center"><span className="text-xl">✨</span> Analizando...</div>}
          <div ref={chatEndRef} />
        </div>

        {/* INPUT DE CHAT */}
        <div className="p-3 sm:p-4 bg-white border-t border-[#e8e0c9]">
          <div className="max-w-4xl mx-auto flex flex-col gap-2">
            {imagenBase64 && (
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 border-[#2a6b4f] overflow-hidden shadow-sm">
                <img src={imagenBase64} alt="preview" className="w-full h-full object-cover" />
                <button onClick={() => setImagenBase64(null)} className="absolute top-0 right-0 bg-red-500 text-white w-5 h-5 flex items-center justify-center text-xs rounded-bl-lg">x</button>
              </div>
            )}
            
            <div className="flex gap-2 items-end">
              <input type="file" accept="image/*" ref={fileInputRef} onChange={(e) => procesarImagen(e.target.files[0])} className="hidden" />
              <button onClick={() => fileInputRef.current.click()} className="p-3 sm:p-4 text-gray-400 hover:text-[#2a6b4f] bg-gray-50 rounded-2xl border border-gray-200 transition text-lg sm:text-xl h-[48px] sm:h-[56px] flex items-center justify-center">
                📎
              </button>
              <textarea
                placeholder="Escribe un mensaje..."
                className="flex-1 p-3 sm:p-4 rounded-2xl border border-gray-200 outline-none focus:border-[#2a6b4f] bg-gray-50 resize-none min-h-[48px] sm:min-h-[56px] max-h-[100px] text-sm"
                rows="1"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensaje(); } }}
              />
              <button onClick={enviarMensaje} disabled={isLoading || (!chatInput && !imagenBase64)} className="px-4 sm:px-6 bg-[#2a6b4f] text-white rounded-2xl font-bold hover:bg-[#1a3d2f] disabled:opacity-50 transition h-[48px] sm:h-[56px] text-sm sm:text-base">
                ➤
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. PANEL DERECHO (Dashboard Dinámico) */}
      <div className={`fixed lg:relative inset-y-0 right-0 z-50 w-[85%] lg:w-1/4 max-w-[360px] bg-white border-l border-[#e8e0c9] shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${isRightPanelOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
        <div className="lg:hidden p-4 border-b border-[#e8e0c9] flex justify-between items-center bg-[#f8f4e8]">
          <span className="font-bold text-[#1a3d2f] text-sm uppercase tracking-widest">Información</span>
          <button className="text-gray-500 text-2xl" onClick={() => setIsRightPanelOpen(false)}>×</button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {!plantaActiva ? (
            <div className="flex flex-col items-center justify-center text-gray-400 p-8 text-center space-y-4 h-full">
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-50 border-2 border-dashed border-gray-200 rounded-full flex items-center justify-center text-4xl sm:text-5xl">🪴</div>
              <p className="text-xs sm:text-sm font-medium">El panel despertará cuando analices una planta.</p>
            </div>
          ) : (
            <div className="p-5 sm:p-6 space-y-5 sm:space-y-6 pb-12 animate-fade-in">
              <div className="text-center relative">
                 <span className={`inline-block px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mb-2 sm:mb-3 ${plantaActiva.esGeneral ? 'bg-amber-100 text-amber-700' : 'bg-[#e8f3ee] text-[#2a6b4f]'}`}>
                  {plantaActiva.esGeneral ? '📚 Ficha Especie' : '🩺 Paciente'}
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-[#1a3d2f] leading-tight">{plantaActiva.nombre}</h3>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="bg-gray-50 p-3 sm:p-4 rounded-3xl border border-gray-100 flex flex-col gap-1 relative overflow-hidden">
                  <span className="text-gray-400 text-[9px] sm:text-[10px] font-bold uppercase z-10">{plantaActiva.esGeneral ? 'Dificultad' : 'Salud'}</span>
                  <span className={`text-xl sm:text-2xl font-black z-10 ${plantaActiva.salud < 40 ? 'text-red-500' : 'text-[#1a3d2f]'}`}>{plantaActiva.salud || 0}%</span>
                  <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-red-400 to-[#2a6b4f]" style={{ width: `${plantaActiva.salud || 0}%` }}></div>
                </div>
                <div className="bg-gray-50 p-3 sm:p-4 rounded-3xl border border-gray-100 flex flex-col gap-1 relative overflow-hidden">
                  <span className="text-gray-400 text-[9px] sm:text-[10px] font-bold uppercase z-10">{plantaActiva.esGeneral ? 'Humedad' : 'Agua'}</span>
                  <span className="text-xl sm:text-2xl font-black text-blue-500 z-10">{plantaActiva.agua || 0}%</span>
                  <div className="absolute bottom-0 left-0 h-full bg-blue-50 opacity-50" style={{ width: `${plantaActiva.agua || 0}%` }}></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="bg-orange-50 p-3 rounded-2xl flex items-center gap-2 sm:gap-3">
                  <span className="text-xl sm:text-2xl">☀️</span>
                  <div className="flex flex-col"><span className="text-[8px] sm:text-[9px] text-orange-400 font-bold uppercase">Luz</span><span className="text-[10px] sm:text-xs font-black text-orange-900 leading-tight">{plantaActiva.luz || '-'}</span></div>
                </div>
                <div className="bg-emerald-50 p-3 rounded-2xl flex items-center gap-2 sm:gap-3">
                  <span className="text-xl sm:text-2xl">🧪</span>
                  <div className="flex flex-col"><span className="text-[8px] sm:text-[9px] text-emerald-500 font-bold uppercase">Abono</span><span className="text-[10px] sm:text-xs font-black text-emerald-900 leading-tight">{plantaActiva.nutrientes || '-'}</span></div>
                </div>
              </div>

              {plantaActiva.curiosidad && (
                <div className="bg-gradient-to-br from-[#1a3d2f] to-[#2a6b4f] text-white p-5 sm:p-6 rounded-3xl shadow-lg relative overflow-hidden">
                  <span className="absolute -bottom-4 -right-2 text-7xl sm:text-8xl opacity-10 font-serif">?</span>
                  <h4 className="text-[#c9a96e] text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mb-1 sm:mb-2">Curiosidad</h4>
                  <p className="text-xs sm:text-sm font-medium leading-relaxed">"{plantaActiva.curiosidad}"</p>
                </div>
              )}

              {!plantaActiva.esGeneral && (
                <button onClick={guardarEnJardin} disabled={guardadoExitoso} className={`w-full py-3 sm:py-4 rounded-2xl font-black uppercase tracking-wider text-[10px] sm:text-xs transition shadow-md ${guardadoExitoso ? 'bg-gray-100 text-gray-400' : 'bg-[#c9a96e] text-[#1a3d2f] hover:bg-[#b59862]'}`}>
                  {guardadoExitoso ? '✓ Guardado' : '+ Guardar Planta'}
                </button>
              )}

              <div className="border-l-4 border-[#2a6b4f] pl-3 sm:pl-4 py-1">
                 <span className="font-black text-[#1a3d2f] block text-[10px] sm:text-xs uppercase tracking-widest mb-1">Diagnóstico</span>
                 <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{plantaActiva.diagnostico || '-'}</p>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}