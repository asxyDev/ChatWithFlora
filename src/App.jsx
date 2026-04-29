import React, { useState, useRef, useEffect } from 'react';

export default function App() {
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', content: '¡Bienvenido! Somos Flora. Sube una foto o descríbenos a tu planta para analizar sus hojas y raíces.' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [plantaActiva, setPlantaActiva] = useState(null);
  
  // NUEVO: Estado para guardar tus jardines usando la memoria de tu navegador
  const [misPlantas, setMisPlantas] = useState([]);
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);
  
  const chatEndRef = useRef(null);

  // Al abrir la página, buscamos si ya tenías plantas guardadas antes
  useEffect(() => {
    const plantasGuardadas = localStorage.getItem('flora_jardin');
    if (plantasGuardadas) {
      setMisPlantas(JSON.parse(plantasGuardadas));
    }
  }, []);

  // Auto-scroll del chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const enviarMensaje = async () => {
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);
    setGuardadoExitoso(false);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });

      const data = await response.json();
      
      // 1. Extraer el texto bruto
      let botText = data.text || (data.candidates && data.candidates[0]?.content?.parts[0]?.text) || "";

      // 2. FILTRO DE LIMPIEZA: Si Claude manda el texto envuelto en código JSON por error, lo extraemos.
      if (botText.trim().startsWith('{"text":')) {
        try { botText = JSON.parse(botText).text; } catch(e) {}
      }

      // 3. EL TRUCO DE MAGIA: Extraer y borrar <floradata>
      const regex = /<floradata>([\s\S]*?)<\/floradata>/;
      const match = botText.match(regex);

      if (match && match[1]) {
        try {
          // Limpiamos basura adicional y activamos el Panel Derecho
          let jsonLimpio = match[1].replace(/```json/g, '').replace(/```/g, '').trim();
          setPlantaActiva(JSON.parse(jsonLimpio));
          
          // Borramos los datos ocultos para que el usuario solo lea el saludo
          botText = botText.replace(regex, '').trim();
        } catch (e) {
          console.error("Error al leer los datos mágicos:", e);
        }
      }

      // Mostramos la respuesta limpia
      setChatHistory(prev => [...prev, { role: 'assistant', content: botText }]);

    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Nuestras hojas están marchitas hoy (Error de red).' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // NUEVO: Función para guardar la planta en tu jardín
  const guardarEnJardin = () => {
    if (!plantaActiva) return;
    const nuevoJardin = [...misPlantas, plantaActiva];
    setMisPlantas(nuevoJardin);
    localStorage.setItem('flora_jardin', JSON.stringify(nuevoJardin));
    setGuardadoExitoso(true);
  };

  // NUEVO: Función para abrir una planta que ya tenías guardada
  const verPlantaGuardada = (planta) => {
    setPlantaActiva(planta);
    setGuardadoExitoso(true); // Ya está guardada
  };

  return (
    <div className="flex h-screen w-full bg-[#f8f4e8] text-[#20352b] font-sans overflow-hidden">

      {/* 1. MENÚ LATERAL IZQUIERDO (Tus Jardines Dinámicos) */}
      <div className="w-1/4 max-w-[300px] bg-[#1a3d2f] text-[#f8f4e8] flex flex-col shadow-2xl z-20">
        <div className="p-6 border-b border-[#2a6b4f]">
          <h1 className="text-2xl font-bold text-[#c9a96e] flex items-center gap-2">🌿 Flora</h1>
          <p className="text-sm opacity-80 mt-1 font-light">La susurradora de hojas</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-xs uppercase tracking-widest text-[#c9a96e] mb-4 font-semibold mt-2">Mis Jardines</h2>
          <div className="space-y-3">
            {misPlantas.length === 0 ? (
              <p className="text-xs text-gray-400 mt-4 text-center">Tu jardín está vacío. Analiza una planta para empezar.</p>
            ) : (
              misPlantas.map((planta, index) => (
                <button 
                  key={index}
                  onClick={() => verPlantaGuardada(planta)}
                  className={`w-full text-left p-3 rounded-xl transition shadow-md flex items-center gap-3 border-l-4 
                  ${plantaActiva?.nombre === planta.nombre ? 'bg-[#2a6b4f] border-[#c9a96e]' : 'bg-[#234f3d] border-transparent hover:bg-[#2a6b4f]'}`}
                >
                  <span className="text-2xl drop-shadow-md">🪴</span>
                  <div className="overflow-hidden">
                    <p className="font-semibold text-white truncate">{planta.nombre}</p>
                    <p className="text-xs text-[#c9a96e] truncate">{planta.jardin}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 2. ÁREA CENTRAL (Chat) */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-[#e8e0c9] to-[#f8f4e8] relative">
        <div className="px-8 py-5 bg-white/60 backdrop-blur-md border-b border-[#e8e0c9] flex justify-between items-center z-10">
          <h2 className="text-lg font-bold text-[#1a3d2f]">Consultorio Botánico</h2>
          <span className="text-xs font-bold bg-[#1a3d2f] text-[#c9a96e] px-4 py-1 rounded-full shadow-inner">Conectado a Claude</span>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {chatHistory.map((msg, index) => (
            <div key={index} className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className="text-2xl mt-2">{msg.role === 'user' ? '👤' : '🌱'}</div>
              <div className={`p-4 rounded-2xl shadow-md max-w-[80%] whitespace-pre-wrap ${msg.role === 'user' ? 'bg-[#2a6b4f] text-white rounded-tr-none' : 'bg-white text-[#20352b] border border-[#e8e0c9] rounded-tl-none'}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && <p className="text-center text-sm font-bold text-[#2a6b4f] animate-pulse">Flora está conectando con sus raíces...</p>}
          <div ref={chatEndRef} />
        </div>

        <div className="p-6 bg-white/80 backdrop-blur-lg border-t border-[#e8e0c9]">
          <div className="max-w-4xl mx-auto flex gap-3">
            <input
              type="text"
              placeholder="Ej: Mi potus tiene las hojas amarillas..."
              className="flex-1 p-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2a6b4f]"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && enviarMensaje()}
            />
            <button onClick={enviarMensaje} disabled={isLoading} className="px-8 py-4 bg-[#2a6b4f] text-white rounded-xl hover:bg-[#1a3d2f] disabled:opacity-50 transition shadow-md font-bold">
              Enviar
            </button>
          </div>
        </div>
      </div>

      {/* 3. PANEL DERECHO (Dashboard Dinámico) */}
      <div className="w-1/4 max-w-[380px] bg-[#fdfbf5] border-l border-[#e8e0c9] shadow-2xl flex flex-col z-20">
        <div className="p-6 border-b border-[#e8e0c9] bg-white">
          <h2 className="text-lg font-bold text-[#1a3d2f]">🩺 Análisis en vivo</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!plantaActiva ? (
            <div className="p-8 flex flex-col items-center justify-center text-center text-gray-400 h-full space-y-4">
              <span className="text-5xl opacity-50">🥀</span>
              <p className="text-sm px-4">El panel despertará cuando Flora diagnostique tu planta.</p>
            </div>
          ) : (
            <div className="p-6 space-y-5 animate-fade-in pb-10">
              
              <div className="text-center mb-6">
                <div className="text-6xl mb-3 drop-shadow-md">🪴</div>
                <h3 className="text-2xl font-bold text-[#1a3d2f]">{plantaActiva.nombre}</h3>
                <p className="text-[#c9a96e] text-sm font-semibold uppercase">{plantaActiva.jardin}</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-[#e8e0c9] shadow-sm space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold text-gray-500 uppercase mb-2"><span>Salud</span><span className="text-[#1a3d2f]">{plantaActiva.salud}%</span></div>
                  <div className="flex gap-1 h-2">{[1, 2, 3, 4, 5].map((s) => <div key={s} className={`flex-1 rounded-full ${s * 20 <= (plantaActiva.salud || 0) ? 'bg-[#2a6b4f]' : 'bg-gray-200'}`}></div>)}</div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold text-gray-500 uppercase mb-2"><span>Agua</span><span className={(plantaActiva.agua||0) < 50 ? 'text-amber-500' : 'text-blue-500'}>{plantaActiva.agua}%</span></div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden"><div className={`h-full rounded-full transition-all duration-1000 ${(plantaActiva.agua||0) < 50 ? 'bg-amber-400' : 'bg-blue-400'}`} style={{ width: `${plantaActiva.agua}%` }}></div></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-xl border border-[#e8e0c9] shadow-sm flex flex-col items-center"><span className="text-2xl mb-1">☀️</span><span className="text-[10px] text-gray-400 font-bold uppercase">Luz</span><span className="text-sm font-bold text-[#1a3d2f]">{plantaActiva.luz}</span></div>
                <div className="bg-white p-4 rounded-xl border border-[#e8e0c9] shadow-sm flex flex-col items-center"><span className="text-2xl mb-1">🧪</span><span className="text-[10px] text-gray-400 font-bold uppercase">Nutrientes</span><span className="text-sm font-bold text-amber-600">{plantaActiva.nutrientes}</span></div>
              </div>

              {/* BOTÓN DE GUARDADO */}
              <button 
                onClick={guardarEnJardin}
                disabled={guardadoExitoso}
                className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider transition shadow-sm
                  ${guardadoExitoso ? 'bg-[#e8e0c9] text-gray-500 cursor-not-allowed' : 'bg-[#c9a96e] text-[#1a3d2f] hover:bg-[#b0935d]'}`}
              >
                {guardadoExitoso ? '✓ Guardado en tu Jardín' : '+ Guardar en mi Jardín'}
              </button>

              <div className="bg-[#1a3d2f] text-white p-5 rounded-xl shadow-md"><h4 className="text-[#c9a96e] text-[10px] font-bold uppercase mb-2">Veredicto</h4><p className="text-sm font-light">{plantaActiva.diagnostico}</p></div>
              <div className="bg-[#f0eade] border border-[#c9a96e] p-5 rounded-xl"><h4 className="text-[#1a3d2f] text-[10px] font-bold uppercase mb-2 flex items-center gap-1">💡 Sugerencia Inmediata</h4><p className="text-sm font-medium mb-3">{plantaActiva.sugerencia}</p></div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}