import { useState, useEffect } from 'react';
import { Zap, Sun, Flame, BatteryCharging } from 'lucide-react';
import apiService from '../services/api';

export default function Energy() {
  const [energy, setEnergy] = useState<any>({
    hydro_kw: 1420, diesel_lph: 850, solar_kw: 480, battery_pct: 92, cost_per_kwh: 0.082
  });

  useEffect(() => {
    const fetchEnergy = async () => {
      try {
        const res = await apiService.getEnergyMetrics();
        if (res.energy) setEnergy(res.energy);
      } catch (err) {
        console.error('Erreur chargement énergie:', err);
      }
    };
    fetchEnergy();
  }, []);

  return (
    <div className="p-4 space-y-4 bg-[#0f172a] min-h-screen text-slate-100">
      <div className="bg-[#1e293b] rounded-2xl border border-slate-700/80 p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="text-amber-400" size={24} />
            <h1 className="text-xl font-black text-white tracking-tight">Gestion Énergétique & Mix kW (Energy Optimizer)</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Supervision temps réel de l'électricité, du diesel, du solaire, des batteries et du rendement industriel (Base SQLite)
          </p>
        </div>
        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs px-3 py-1 rounded-xl font-mono font-bold">
          Coût kWh : {energy.cost_per_kwh} €/kWh
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#1e293b] p-4 rounded-2xl border border-slate-700/80 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <Zap className="text-amber-400" size={20} />
            <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold">Réseau Hydro</span>
          </div>
          <span className="text-2xl font-black text-white font-mono">{energy.hydro_kw} kW</span>
          <p className="text-[10px] text-slate-400 mt-1">Consommation Électrique active</p>
        </div>

        <div className="bg-[#1e293b] p-4 rounded-2xl border border-slate-700/80 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <Flame className="text-orange-400" size={20} />
            <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold">Diesel</span>
          </div>
          <span className="text-2xl font-black text-white font-mono">{energy.diesel_lph} L/h</span>
          <p className="text-[10px] text-slate-400 mt-1">Consommation Carburant Flotte</p>
        </div>

        <div className="bg-[#1e293b] p-4 rounded-2xl border border-slate-700/80 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <Sun className="text-yellow-400" size={20} />
            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">Solaire</span>
          </div>
          <span className="text-2xl font-black text-emerald-400 font-mono">{energy.solar_kw} kW</span>
          <p className="text-[10px] text-slate-400 mt-1">Production Photovoltaïque Site</p>
        </div>

        <div className="bg-[#1e293b] rounded-2xl p-4 border border-slate-700/80 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <BatteryCharging className="text-emerald-400" size={20} />
            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">BESS</span>
          </div>
          <span className="text-2xl font-black text-emerald-400 font-mono">{energy.battery_pct} %</span>
          <p className="text-[10px] text-slate-400 mt-1">Stockage Batteries Tampon</p>
        </div>
      </div>
    </div>
  );
}
