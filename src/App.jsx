import React, { useState, useRef, useEffect } from 'react';

export default function App() {
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', content: '¡Bienvenido! Somos Flora. ¿Quieres analizar una planta o aprender sobre alguna especie hoy?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [plantaActiva, setPlantaActiva] = useState(null);
  const [misPlantas, setMisPlantas] = useState([]);
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const plantasGuardadas = localStorage.getItem('flora_jardin');
    if (plantasGuardadas) setMisPlantas(JSON.parse(plantasGuardadas));
  }, []);

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
      let botText = data.text || "";

      const regex = /<floradata>([\s\S]*?)<\/floradata>/;
      const match = botText.match(regex);

      if (match && match[1]) {
        try {
          let jsonLimpio = match[1].replace(/```json/g, '').replace(/```/g, '').trim();
          const datos = JSON.parse(jsonLimpio);
          setPlantaActiva(datos);
          botText = botText.replace(regex, '').trim();
        } catch (e) { console.error("Error JSON:", e); }
      }
      setChatHistory(prev => [...prev, { role: 'assistant', content: botText }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Error de conexión con las raíces.' }]);
    } finally { setIsLoading(false); }
  };

  const guardarEnJardin = () => {
    if (!plantaActiva) return;
    const nuevoJardin = [...misPlantas, plantaActiva];
    setMisPlantas(nuevoJardin);
    localStorage.setItem('flora_jardin', JSON.stringify(nuevoJardin));
    setGuardadoExitoso(true);
  };

  return (
    <div className="flex h-screen w-full bg-[#f8f4e8] text-[#20352b] font-sans overflow-hidden">
      
      {/* 1. SIDEBAR IZQUIERDO */}
      <div className="w-1/4 max-w-[300px] bg-[#1a3d2f] text-[#f8f4e8] flex flex-col shadow-2xl z-20">
        <div className="p-6 border-b border-[#2a6b4f]">
          <h1 className="text-2xl font-bold text-[#c9a96e]">🌿 Flora</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {misPlantas.map((p, i) => (
            <button key={i} onClick={() => {setPlantaActiva(p); setGuardadoExitoso(true)}} className="w-full text-left p-3 rounded-xl bg-[#234f3d] border-l-4 border-[#c9a96e] flex items-center gap-3 shadow-md">
              <span className="text-xl">🪴</span>
              <div><p className="font-bold text-sm text-white">{p.nombre}</p><p className="text-[10px] text-[#c9a96e] uppercase font-bold">{p.jardin}</p></div>
            </button>
          ))}
        </div>
      </div>

      {/* 2. CHAT CENTRAL */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-[#e8e0c9] to-[#f8f4e8]">
        <div className="px-8 py-5 bg-white/60 border-b border-[#e8e0c9] flex justify-between items-center">
          <h2 className="font-bold">Consultorio Botánico</h2>
          <span className="text-[10px] bg-[#1a3d2f] text-[#c9a96e] px-3 py-1 rounded-full font-bold">CLAUDE 4.5</span>
        </div>
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-4 rounded-2xl shadow-sm max-w-[80%] ${msg.role === 'user' ? 'bg-[#2a6b4f] text-white' : 'bg-white border border-[#e8e0c9]'}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && <div className="text-center animate-pulse text-[#2a6b4f] text-sm font-bold italic">Sintonizando frecuencias naturales...</div>}
          <div ref={chatEndRef} />
        </div>
        <div className="p-6 bg-white/80 border-t border-[#e8e0c9]">
          <div className="max-w-4xl mx-auto flex gap-3">
            <input type="text" placeholder="¿Qué planta quieres conocer hoy?" className="flex-1 p-4 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#2a6b4f]" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && enviarMensaje()} />
            <button onClick={enviarMensaje} className="px-6 py-4 bg-[#2a6b4f] text-white rounded-xl font-bold hover:bg-[#1a3d2f] transition">Enviar</button>
          </div>
        </div>
      </div>

      {/* 3. PANEL DERECHO DINÁMICO */}
      <div className="w-1/4 max-w-[380px] bg-[#fdfbf5] border-l border-[#e8e0c9] shadow-2xl flex flex-col z-20 overflow-y-auto">
        {!plantaActiva ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center space-y-4 italic">
            <span className="text-6xl">🌿</span>
            <p className="text-sm">Menciona una especie o sube una foto para activar la Ficha Botánica.</p>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Título adaptable */}
            <div className="text-center border-b border-[#e8e0c9] pb-6">
              <span className="text-[10px] font-bold text-[#c9a96e] uppercase tracking-widest">
                {plantaActiva.esGeneral ? '📚 Ficha Botánica' : '🩺 Análisis de Salud'}
              </span>
              <h3 className="text-2xl font-bold text-[#1a3d2f] mt-1">{plantaActiva.nombre}</h3>
            </div>

            {/* Barras con etiquetas adaptables */}
            <div className="bg-white p-4 rounded-xl border border-[#e8e0c9] shadow-sm space-y-4">
              <div>
                <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase mb-2">
                  <span>{plantaActiva.esGeneral ? 'Dificultad de Cuidado' : 'Salud General'}</span>
                  <span className="text-[#1a3d2f]">{plantaActiva.salud}%</span>
                </div>
                <div className="flex gap-1 h-2">
                  {[1, 2, 3, 4, 5].map(s => (
                    <div key={s} className={`flex-1 rounded-full ${s * 20 <= plantaActiva.salud ? (plantaActiva.esGeneral ? 'bg-amber-400' : 'bg-[#2a6b4f]') : 'bg-gray-100'}`}></div>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase mb-2">
                  <span>{plantaActiva.esGeneral ? 'Humedad Ideal' : 'Nivel de Agua'}</span>
                  <span className="text-blue-500">{plantaActiva.agua}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-blue-400 rounded-full transition-all duration-1000" style={{ width: `${plantaActiva.agua}%` }}></div>
                </div>
              </div>
            </div>

            {/* Sabías que... (Solo en modo general) */}
            {plantaActiva.curiosidad && (
              <div className="bg-[#1a3d2f] text-white p-5 rounded-xl shadow-md relative overflow-hidden">
                <span className="absolute -top-2 -right-2 text-6xl opacity-10 font-serif">?</span>
                <h4 className="text-[#c9a96e] text-[10px] font-bold uppercase mb-2 tracking-widest">¿Sabías que...?</h4>
                <p className="text-xs font-light leading-relaxed italic">"{plantaActiva.curiosidad}"</p>
              </div>
            )}

            {/* Info Técnica */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded-xl border border-[#e8e0c9] text-center shadow-sm">
                <span className="text-xs text-gray-400 font-bold block uppercase mb-1">☀️ Luz</span>
                <span className="font-bold text-[#1a3d2f] text-sm">{plantaActiva.luz}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-[#e8e0c9] text-center shadow-sm">
                <span className="text-xs text-gray-400 font-bold block uppercase mb-1">🧪 Abono</span>
                <span className="font-bold text-amber-600 text-sm">{plantaActiva.nutrientes}</span>
              </div>
            </div>

            {/* Botón de Guardado (Solo si no está guardada) */}
            {!plantaActiva.esGeneral && (
              <button onClick={guardarEnJardin} disabled={guardadoExitoso} className={`w-full py-3 rounded-xl font-bold uppercase text-xs transition ${guardadoExitoso ? 'bg-gray-200 text-gray-400' : 'bg-[#c9a96e] text-[#1a3d2f]'}`}>
                {guardadoExitoso ? '✓ Planta en tu Jardín' : '+ Guardar esta Planta'}
              </button>
            )}

            <div className="bg-white p-5 rounded-xl border border-[#e8e0c9] shadow-sm italic text-xs leading-relaxed text-gray-600">
               <span className="font-bold text-[#1a3d2f] block not-italic mb-1 uppercase tracking-tighter">Resumen Botánico</span>
               {plantaActiva.diagnostico}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}