import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Wind, Flame, Cpu, Users, Map } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function DigitalTwin() {
  const navigate = useNavigate();
  const { miners, vehicles } = useStore();
  const [simMode, setSimMode] = useState<'normal' | 'fire' | 'ventilation'>('normal');
  const [immersive, setImmersive] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!immersive) return;
    const id = setInterval(() => setTick((t) => t + 1), 1200);
    return () => clearInterval(id);
  }, [immersive]);

  const underground = miners.filter((m) => m.isUnderground !== false).length;
  const activeFleet = vehicles.length || 5;

  return (
    <div className="p-6 space-y-6 bg-[#0f172a] text-slate-100 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <Box size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">Jumeau Numérique 3D (Digital Twin)</h1>
            <p className="text-xs text-slate-400 mt-0.5">Modélisation 3D dynamique de la mine, simulation de ventilation et scénarios d'évacuation</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setSimMode('normal')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              simMode === 'normal' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Vue Normale 3D
          </button>
          <button
            type="button"
            onClick={() => setSimMode('ventilation')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              simMode === 'ventilation' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Wind size={14} /> Flux Ventilation (VoD)
          </button>
          <button
            type="button"
            onClick={() => setSimMode('fire')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              simMode === 'fire' ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Flame size={14} /> Simulation Incendie/Gaz
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1"><Users size={12} /> Mineurs live</span>
          <p className="text-xl font-black text-white mt-1">{underground || miners.length}</p>
        </div>
        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-bold">Engins synchronisés</span>
          <p className="text-xl font-black text-cyan-400 mt-1">{activeFleet}</p>
        </div>
        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-bold">Mode simulation</span>
          <p className="text-sm font-bold text-indigo-300 mt-1 capitalize">{simMode}</p>
        </div>
        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-bold">Session WebXR</span>
          <p className={`text-sm font-bold mt-1 ${immersive ? 'text-emerald-400' : 'text-slate-400'}`}>
            {immersive ? `Active · frame ${tick}` : 'Inactive'}
          </p>
        </div>
      </div>

      <div className="relative w-full h-[520px] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col items-center justify-center p-6 text-center shadow-2xl">
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
          <Cpu size={14} className="text-indigo-400" />
          <span>{immersive ? 'Moteur simulation actif (données live mineurs/flotte)' : 'Moteur 3D — prêt'}</span>
        </div>

        {simMode === 'fire' && (
          <div className="absolute inset-0 bg-gradient-to-t from-red-950/40 via-transparent to-orange-950/20 pointer-events-none" />
        )}
        {simMode === 'ventilation' && (
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-950/30 via-transparent to-cyan-950/20 pointer-events-none" />
        )}

        <div className="max-w-md space-y-4 relative z-10">
          <div className={`w-20 h-20 bg-indigo-500/10 border border-indigo-500/30 rounded-3xl mx-auto flex items-center justify-center text-indigo-400 ${immersive ? 'animate-pulse' : 'animate-bounce'}`}>
            <Box size={40} />
          </div>

          <h3 className="text-xl font-bold text-white">
            {simMode === 'normal' && 'Jumeau Numérique 3D — Rendu des Galeries'}
            {simMode === 'ventilation' && "Simulation des Flux d'Air (Ventilation à la Demande)"}
            {simMode === 'fire' && "Simulation d'Urgence : Propagation Gaz & Évacuation"}
          </h3>

          <p className="text-xs text-slate-400 leading-relaxed">
            {simMode === 'normal' &&
              `Navigation synchronisée avec ${miners.length} mineurs et ${activeFleet} engins. Le rendu WebGL complet n'est pas embarqué — utilisez la carte live.`}
            {simMode === 'ventilation' &&
              "Analyse dynamique de l'injection d'air pulsé selon la position des mineurs et véhicules diesel."}
            {simMode === 'fire' &&
              "Modélisation des chemins d'évacuation optimisés. Activez le Centre de Crise pour un plan réel."}
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setImmersive((v) => !v)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/30"
            >
              {immersive ? 'Arrêter la Session Simulation' : "Lancer l'Immersion WebVR / AR"}
            </button>
            <button
              type="button"
              onClick={() => navigate('/localisation?tab=carte')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 border border-slate-700"
            >
              <Map size={14} /> Ouvrir la Carte Live
            </button>
            {simMode === 'fire' && (
              <button
                type="button"
                onClick={() => navigate('/crisis-center')}
                className="bg-red-700 hover:bg-red-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs"
              >
                Centre de Crise
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/ar-vr')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-2.5 rounded-xl text-xs border border-slate-700"
            >
              Module AR/VR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
