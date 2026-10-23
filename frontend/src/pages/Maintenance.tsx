import { useState, useEffect } from 'react';
import { Wrench, AlertOctagon, Brain, Clock, CheckCircle, RefreshCw } from 'lucide-react';
import apiService from '../services/api';
import { useStore } from '../store/useStore';

export default function Maintenance() {
  const { setMaintenanceLogs } = useStore();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await apiService.getMaintenanceLogs();
      const list = res.logs || [];
      setLogs(list);
      setMaintenanceLogs(list);
    } catch (err) {
      console.error('Erreur chargement maintenance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const criticalCount = logs.filter((l) => (l.risk_score ?? 0) > 80 || l.status === 'critical').length;
  const availability = logs.length
    ? Math.max(70, 100 - Math.round(logs.reduce((s, l) => s + (l.risk_score || 0), 0) / logs.length / 3))
    : 96;

  return (
    <div className="p-6 space-y-6 bg-[#0f172a] text-slate-100 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <Wrench size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">GMAO & Maintenance Prédictive (IA)</h1>
            <p className="text-xs text-slate-400 mt-0.5">Analyse en temps réel des vibrations, températures et pressions pour prévenir les pannes</p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadLogs}
          disabled={loading}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-amber-600/20"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Relancer l'Analyse IA
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-red-500/20 text-red-400 rounded-xl">
            <AlertOctagon size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Pannes Élevées Imminentes (&lt; 48h)</p>
            <p className="text-2xl font-black text-red-400 mt-0.5">{criticalCount} Machine{criticalCount > 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl">
            <Brain size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Précision des Modèles IA</p>
            <p className="text-2xl font-black text-amber-400 mt-0.5">94.8% Précis</p>
          </div>
        </div>

        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Disponibilité Globale Flotte</p>
            <p className="text-2xl font-black text-emerald-400 mt-0.5">{availability}%</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-sm text-white">Diagnostic & Prédictions d'Arrêt par l'IA</h3>
          <span className="text-xs text-slate-400 font-mono">{logs.length} Équipements Analysés</span>
        </div>

        <div className="divide-y divide-slate-800">
          {logs.map((log) => {
            const riskScore = log.risk_score ?? 0;
            const status = log.status || (riskScore > 80 ? 'critical' : riskScore > 50 ? 'warning' : 'normal');
            return (
              <div key={log.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono bg-slate-800 text-amber-400 px-2 py-0.5 rounded font-bold">{log.id}</span>
                    <h4 className="text-base font-bold text-white">{log.machine_name || log.machine}</h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      status === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : status === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {log.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">Composant ciblé: <strong className="text-slate-100">{log.component}</strong></p>
                  <p className="text-xs text-amber-300/90 bg-amber-950/40 p-2 rounded-lg border border-amber-800/30 mt-2">
                    <strong className="text-amber-400">Recommandation IA :</strong>{' '}
                    {log.recommendation || `Surveiller ${log.component} — score de risque ${riskScore}%.`}
                  </p>
                </div>

                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 justify-end">
                      <Clock size={14} /> Est. Panne
                    </div>
                    <p className="font-bold text-sm text-slate-200 mt-0.5">{log.breakdown_date || log.timeframe || '—'}</p>
                  </div>

                  <div className="text-center bg-slate-950 p-3 rounded-xl border border-slate-800 min-w-[90px]">
                    <p className="text-[10px] uppercase text-slate-400 font-bold">Risque Panne</p>
                    <p className={`text-xl font-black ${riskScore > 80 ? 'text-red-400' : riskScore > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {riskScore}%
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          {logs.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-sm">
              {loading ? 'Analyse IA en cours…' : 'Aucun journal de maintenance'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
