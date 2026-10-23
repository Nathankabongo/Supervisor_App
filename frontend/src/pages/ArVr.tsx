import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Glasses, Play, ShieldCheck, Square, Box } from 'lucide-react';

export default function ArVr() {
  const navigate = useNavigate();
  const [vrSession, setVrSession] = useState(false);
  const [arSession, setArSession] = useState(false);

  return (
    <div className="p-6 space-y-6 bg-[#0f172a] text-slate-100 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <Glasses size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">Réalité Augmentée (AR) & Virtuelle (VR)</h1>
            <p className="text-xs text-slate-400 mt-0.5">Formations virtuelles aux urgences et maintenance assistée en superposition AR (WebXR API)</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/digital-twin')}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700"
        >
          <Box size={14} /> Jumeau Numérique
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Glasses className="text-indigo-400" /> Formation d'Urgence Immersive (VR)
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Simulateur d'entraînement aux incendies et éboulements sous-terrains dans le Jumeau Numérique 3D répliqué de la mine.
          </p>
          {vrSession && (
            <div className="text-xs bg-indigo-950/50 border border-indigo-800/40 text-indigo-300 px-3 py-2 rounded-xl">
              Session VR démarrée — scénario urgence actif. Casque HMD non détecté : mode desktop simulation.
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setVrSession((v) => !v)}
              className={`font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg ${
                vrSession
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
              }`}
            >
              {vrSession ? <Square size={14} /> : <Play size={14} />}
              {vrSession ? 'Arrêter la Session VR' : 'Démarrer la Session VR (Casque HMD)'}
            </button>
            {vrSession && (
              <button
                type="button"
                onClick={() => navigate('/crisis-center')}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-2 rounded-xl text-xs border border-slate-700"
              >
                Ouvrir Centre de Crise
              </button>
            )}
          </div>
        </div>

        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="text-emerald-400" /> Maintenance Assistée (AR Lunettes/Tablettes)
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Affichage en superposition de la télémétrie, schéma de démontage et température lors de l'inspection des pompes et concasseurs.
          </p>
          {arSession && (
            <div className="text-xs bg-emerald-950/50 border border-emerald-800/40 text-emerald-300 px-3 py-2 rounded-xl">
              Flux AR activé — superposition télémétrie prête. Reliez un équipement via GMAO.
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setArSession((v) => !v)}
              className={`font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg ${
                arSession
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
              }`}
            >
              {arSession ? <Square size={14} /> : <Play size={14} />}
              {arSession ? 'Désactiver le Mode AR' : 'Activer le Mode Flux AR'}
            </button>
            {arSession && (
              <button
                type="button"
                onClick={() => navigate('/maintenance')}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-2 rounded-xl text-xs border border-slate-700"
              >
                Ouvrir GMAO
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
