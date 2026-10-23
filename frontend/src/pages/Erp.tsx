import { useNavigate } from 'react-router-dom';
import { Building, CheckCircle2, FileText, TrendingUp } from 'lucide-react';

export default function Erp() {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6 bg-[#0f172a] text-slate-100 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <Building size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">ERP Minier & Finance</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Pas d&apos;intégration SAP/Dynamics configurée — utilisez le cockpit direction pour les KPIs locaux
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/director-dashboard')}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold"
          >
            <TrendingUp size={14} /> Cockpit Direction
          </button>
          <button
            type="button"
            onClick={() => navigate('/reports')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700"
          >
            <FileText size={14} /> Rapports
          </button>
        </div>
      </div>

      <div className="bg-amber-950/30 border border-amber-800/40 text-amber-200 text-xs px-4 py-3 rounded-xl">
        Module ERP externe non branché. Les cartes ci-dessous sont des indicateurs de placeholder ; les chiffres opérationnels réels sont dans Direction / Dispatch / Flotte.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-2 opacity-70">
          <span className="text-xs text-slate-400 font-bold uppercase">Coût d'Opération/Tonne</span>
          <p className="text-2xl font-black text-white">—</p>
          <p className="text-[10px] text-slate-500">Nécessite sync ERP</p>
        </div>
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-2 opacity-70">
          <span className="text-xs text-slate-400 font-bold uppercase">Commandes d'Achats</span>
          <p className="text-2xl font-black text-slate-400">Non connecté</p>
        </div>
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-2 opacity-70">
          <span className="text-xs text-slate-400 font-bold uppercase">Masse Salariale</span>
          <p className="text-2xl font-black text-slate-400">Non connecté</p>
        </div>
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-2">
          <span className="text-xs text-slate-400 font-bold uppercase flex items-center gap-1">
            <CheckCircle2 size={12} className="text-emerald-400" /> Auth locale
          </span>
          <p className="text-2xl font-black text-emerald-400">Active</p>
          <p className="text-[10px] text-slate-400">Comptes SupervisorApp opérationnels</p>
        </div>
      </div>
    </div>
  );
}
