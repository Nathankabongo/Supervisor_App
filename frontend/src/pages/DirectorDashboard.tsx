import { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import apiService from '../services/api';

export default function DirectorDashboard() {
  const [kpis, setKpis] = useState<any>({
    oee_pct: 88.4, cost_per_ton: 24.50, ltifr: 0.00, monthly_prod_tons: 42500, ebitda_margin_pct: 42.6, accident_free_days: 450
  });

  useEffect(() => {
    const fetchKpis = async () => {
      try {
        const res = await apiService.getDirectorKpis();
        if (res.kpis) setKpis(res.kpis);
      } catch (err) {
        console.error('Erreur chargement KPIs direction:', err);
      }
    };
    fetchKpis();
  }, []);

  return (
    <div className="p-4 space-y-4 bg-[#0f172a] min-h-screen text-slate-100">
      <div className="bg-[#1e293b] rounded-2xl border border-slate-700/80 p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="text-emerald-400" size={24} />
            <h1 className="text-xl font-black text-white tracking-tight">Cockpit Direction & KPIs Minier (Executive Dashboard)</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tableau de bord stratégique pour la direction : OEE / TRS, Coût par tonne, LTIFR, EBITDA & ROI (Base SQLite)
          </p>
        </div>
        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-3 py-1 rounded-xl font-mono font-bold">
          EBITDA Marge : {kpis.ebitda_margin_pct}%
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1e293b] p-4 rounded-2xl border border-slate-700/80 shadow-md">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">OEE / TRS Synthétique</span>
          <p className="text-3xl font-black text-emerald-400 font-mono mt-1">{kpis.oee_pct} %</p>
          <p className="text-[10px] text-emerald-400 mt-1 font-bold">+3.2% vs objectif</p>
        </div>

        <div className="bg-[#1e293b] p-4 rounded-2xl border border-slate-700/80 shadow-md">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Coût d'Extraction / Tonne</span>
          <p className="text-3xl font-black text-cyan-400 font-mono mt-1">{kpis.cost_per_ton} $</p>
          <p className="text-[10px] text-cyan-400 mt-1 font-bold">-1.80 $ d'économie IA</p>
        </div>

        <div className="bg-[#1e293b] p-4 rounded-2xl border border-slate-700/80 shadow-md">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Taux d'Accident LTIFR</span>
          <p className="text-3xl font-black text-emerald-400 font-mono mt-1">{kpis.ltifr}</p>
          <p className="text-[10px] text-slate-400 mt-1">{kpis.accident_free_days} Jours sans accident</p>
        </div>

        <div className="bg-[#1e293b] p-4 rounded-2xl border border-slate-700/80 shadow-md">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Production Cumulée du Mois</span>
          <p className="text-3xl font-black text-purple-400 font-mono mt-1">{kpis.monthly_prod_tons} t</p>
          <p className="text-[10px] text-purple-400 mt-1 font-bold">102% de l'objectif</p>
        </div>
      </div>
    </div>
  );
}
