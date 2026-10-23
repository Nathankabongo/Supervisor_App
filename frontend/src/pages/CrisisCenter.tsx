import { useState, useEffect } from 'react';
import { Siren, ShieldCheck } from 'lucide-react';
import apiService from '../services/api';

export default function CrisisCenter() {
  const [crisis, setCrisis] = useState<any>({
    status: 'NORMAL',
    emergency_plan: "Aucun plan d'urgence actif",
    rescue_teams_count: 2,
    survival_refuges_count: 4,
    oxygen_hours: 48,
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const fetchCrisis = async () => {
    try {
      const res = await apiService.getCrisisStatus();
      if (res.crisis) setCrisis(res.crisis);
    } catch (err) {
      console.error('Erreur chargement statut crise:', err);
    }
  };

  useEffect(() => {
    fetchCrisis();
  }, []);

  const isEmergency = crisis.status && crisis.status !== 'NORMAL';

  const handleTrigger = async () => {
    setBusy(true);
    setMessage('');
    try {
      if (isEmergency) {
        const res = await apiService.triggerCrisis('reset');
        if (res.crisis) setCrisis(res.crisis);
        setMessage('Plan d\'urgence désactivé — retour au statut NORMAL');
      } else {
        const confirmed = window.confirm(
          "Déclencher le plan d'évacuation / confinement ?\nLes brigades de secours seront notifiées.",
        );
        if (!confirmed) {
          setBusy(false);
          return;
        }
        const res = await apiService.triggerCrisis('evacuate');
        if (res.crisis) setCrisis(res.crisis);
        setMessage('Plan d\'évacuation activé — brigades déployées');
      }
    } catch (err: any) {
      setMessage(err.message || 'Erreur lors du déclenchement');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 space-y-4 bg-[#0f172a] min-h-screen text-slate-100">
      <div className="bg-[#1e293b] rounded-2xl border border-slate-700/80 p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Siren className={`text-red-500 ${isEmergency ? 'animate-pulse' : ''}`} size={24} />
            <h1 className="text-xl font-black text-white tracking-tight">Centre de Crise & Secours Minier (Crisis Management)</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Calcul automatique des itinéraires d'évacuation, localisation des personnes isolées & déploiement des brigades de secours (Base SQLite)
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={handleTrigger}
          className={`font-black text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-lg disabled:opacity-50 ${
            isEmergency
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
              : 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/30'
          }`}
        >
          {isEmergency ? <ShieldCheck size={16} /> : <Siren size={16} />}
          {isEmergency ? 'Réintégrer le Mode Normal' : 'Déclencher Plan de Confinement / Évacuation'}
        </button>
      </div>

      {message && (
        <div className={`text-xs px-4 py-2 rounded-xl border ${
          isEmergency
            ? 'bg-red-950/40 border-red-800/40 text-red-300'
            : 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300'
        }`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#1e293b] p-4 rounded-2xl border border-slate-700/80 space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Statut Sécurité Site</span>
          <p className={`text-2xl font-black font-mono ${isEmergency ? 'text-red-400' : 'text-emerald-400'}`}>
            {crisis.status}
          </p>
          <p className="text-xs text-slate-400">{crisis.emergency_plan}</p>
        </div>

        <div className="bg-[#1e293b] p-4 rounded-2xl border border-slate-700/80 space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Brigade de Secours Miniers</span>
          <p className="text-2xl font-black text-cyan-400 font-mono">{crisis.rescue_teams_count} Équipes Prêtes</p>
          <p className="text-xs text-slate-400">Temps estimé d'intervention : 3 min</p>
        </div>

        <div className="bg-[#1e293b] p-4 rounded-2xl border border-slate-700/80 space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Refuges de Survie Sous Terre</span>
          <p className="text-2xl font-black text-emerald-400 font-mono">{crisis.survival_refuges_count} / 4 Opérationnels</p>
          <p className="text-xs text-slate-400">Autonomie en oxygène : {crisis.oxygen_hours} Heures</p>
        </div>
      </div>
    </div>
  );
}
