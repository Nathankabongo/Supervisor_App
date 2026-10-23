import { useState, useEffect } from 'react';
import { Brain, RefreshCw } from 'lucide-react';
import apiService from '../services/api';
import { useStore } from '../store/useStore';

export default function AiCenter() {
  const { setAiPredictions } = useStore();
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadPredictions = async (showMsg = false) => {
    setLoading(true);
    try {
      const res = await apiService.getAiPredictions();
      const list = res.predictions || [];
      setPredictions(list);
      setAiPredictions(list);
      if (showMsg) setMessage(`${list.length} prédictions rechargées depuis la base`);
    } catch (err) {
      console.error('Erreur chargement IA:', err);
      setMessage('Impossible de charger les prédictions IA');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPredictions();
  }, []);

  return (
    <div className="p-6 space-y-6 bg-[#0f172a] text-slate-100 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/30">
            <Brain size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">Centre d'Intelligence Artificielle & IA Prédictive</h1>
            <p className="text-xs text-slate-400 mt-0.5">Modèles d'IA pour la prédiction des pannes, l'optimisation énergétique et les recommandations de sécurité</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadPredictions(true)}
          disabled={loading}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-purple-600/20"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Ré-entraîner les Modèles IA
        </button>
      </div>

      {message && (
        <div className="text-xs bg-purple-950/50 border border-purple-800/40 text-purple-300 px-4 py-2 rounded-xl">{message}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {predictions.map((p) => (
          <div key={p.id} className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3 hover:border-purple-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono bg-purple-950/60 border border-purple-800/40 text-purple-300 px-2 py-0.5 rounded font-bold">{p.id}</span>
              <span className="text-xs text-slate-400 font-semibold">{p.category || p.cat}</span>
            </div>
            <h3 className="text-base font-bold text-white">{p.target}</h3>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">Probabilité d'Incident:</span>
              <span className="text-xl font-black text-purple-400">{p.risk_percentage ?? p.risk}%</span>
            </div>
            <p className="text-xs text-slate-300 bg-purple-950/30 p-2.5 rounded-xl border border-purple-800/20">
              <strong className="text-purple-400">Action recommandée :</strong> {p.recommendation || p.rec}
            </p>
            <p className="text-[10px] text-slate-500">Horizon : {p.estimated_timeframe || p.time}</p>
          </div>
        ))}
        {predictions.length === 0 && (
          <div className="col-span-3 text-center py-10 text-slate-500 text-sm">
            {loading ? 'Chargement des modèles…' : 'Aucune prédiction disponible'}
          </div>
        )}
      </div>
    </div>
  );
}
