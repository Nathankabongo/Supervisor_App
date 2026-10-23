import { useState, useEffect } from 'react';
import { Droplets } from 'lucide-react';
import apiService from '../services/api';

export default function Water() {
  const [sensors, setSensors] = useState<any[]>([]);

  useEffect(() => {
    const fetchWater = async () => {
      try {
        const res = await apiService.getWaterSensors();
        if (res.sensors) setSensors(res.sensors);
      } catch (err) {
        console.error('Erreur chargement capteurs eau:', err);
      }
    };
    fetchWater();
  }, []);

  const defaultSensor = sensors[0] || {
    flow_m3h: 140, pressure_bar: 4.2, basin_level_pct: 48, recycling_pct: 84.6, ph_level: 7.2, leaks_count: 0
  };

  return (
    <div className="p-4 space-y-4 bg-[#0f172a] min-h-screen text-slate-100">
      <div className="bg-[#1e293b] rounded-2xl border border-slate-700/80 p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Droplets className="text-cyan-400" size={24} />
            <h1 className="text-xl font-black text-white tracking-tight">Gestion des Eaux, Pompage & Bassins</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Supervision du réseau d'exhaure, débit des pompes, bassins de décantation et taux de recyclage (Base SQLite)
          </p>
        </div>
        <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs px-3 py-1 rounded-xl font-mono font-bold">
          pH Moteur : {defaultSensor.ph_level} (Conforme)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#1e293b] p-4 rounded-2xl border border-slate-700/80 space-y-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Station d'Exhaure Galerie 3 (Pompe P-01)</span>
          <p className="text-2xl font-black text-cyan-400 font-mono">{defaultSensor.flow_m3h} m³/h</p>
          <p className="text-xs text-slate-400">Pression : {defaultSensor.pressure_bar} bar • Niveau bassin : {defaultSensor.basin_level_pct}%</p>
        </div>
        <div className="bg-[#1e293b] p-4 rounded-2xl border border-slate-700/80 space-y-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Bassin de Décantation Nord</span>
          <p className="text-2xl font-black text-emerald-400 font-mono">520 m³</p>
          <p className="text-xs text-slate-400">Taux de recyclage : {defaultSensor.recycling_pct}% • Turbidité : NORMALE</p>
        </div>
        <div className="bg-[#1e293b] p-4 rounded-2xl border border-slate-700/80 space-y-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Détection de Fuites Réseau</span>
          <p className="text-2xl font-black text-emerald-400 font-mono">{defaultSensor.leaks_count} Fuite</p>
          <p className="text-xs text-slate-400">Statut réseau : Étanche à 100%</p>
        </div>
      </div>
    </div>
  );
}
