import { useState, useEffect } from 'react';
import { Leaf, Droplets, Wind, ShieldCheck, CheckCircle2, TrendingDown, RefreshCw } from 'lucide-react';
import apiService from '../services/api';
import { useStore } from '../store/useStore';

export default function Esg() {
  const { setEsgMetrics } = useStore();
  const [esg, setEsg] = useState({
    co2Emissions: 0,
    waterUsage: 0,
    waterRecycled: 0,
    pm25: 0,
    pm10: 0,
    airQualityStatus: 'Chargement…',
  });
  const [loading, setLoading] = useState(false);

  const loadEsg = async () => {
    setLoading(true);
    try {
      const res = await apiService.getEsgMetrics();
      const e = res.esg;
      if (e) {
        const mapped = {
          co2Emissions: e.co2_emissions,
          waterUsage: e.water_usage,
          waterRecycled: e.water_recycled,
          pm25: e.pm25,
          pm10: e.pm10,
          airQualityStatus: e.air_quality_status,
        };
        setEsg(mapped);
        setEsgMetrics(e);
      }
    } catch (err) {
      console.error('Erreur chargement ESG:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEsg();
  }, []);

  const recycledPercent = esg.waterUsage
    ? Math.round((esg.waterRecycled / esg.waterUsage) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6 bg-[#0f172a] text-slate-100 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <Leaf size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">Environnement, RSE & ESG (Mine Durable)</h1>
            <p className="text-xs text-slate-400 mt-0.5">Suivi en temps réel de l'empreinte CO₂, recyclage des eaux et particules fines PM2.5/PM10</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadEsg}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualiser
          </button>
          <div className="flex items-center gap-2 bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 px-4 py-2 rounded-xl text-xs font-bold">
            <ShieldCheck size={16} /> Standards ISO 14001 Certifié
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Émissions Carbone (CO₂)</span>
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <TrendingDown size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-white">{esg.co2Emissions} <span className="text-sm font-normal text-slate-400">t/jour</span></p>
          <p className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
            <CheckCircle2 size={12} /> Données SQLite temps réel
          </p>
        </div>

        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recyclage des Eaux usées</span>
            <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg">
              <Droplets size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-cyan-400">{recycledPercent}% <span className="text-sm font-normal text-slate-400">Recyclé</span></p>
          <p className="text-xs text-slate-300">
            {esg.waterRecycled} m³ recyclés sur {esg.waterUsage} m³ utilisés.
          </p>
        </div>

        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Particules Fines (PM10 / PM2.5)</span>
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <Wind size={18} />
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>PM2.5: <strong className="text-emerald-400">{esg.pm25} µg/m³</strong></span>
            <span>PM10: <strong className="text-emerald-400">{esg.pm10} µg/m³</strong></span>
          </div>
          <p className="text-xs text-emerald-400 font-bold bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/30">
            {esg.airQualityStatus}
          </p>
        </div>
      </div>
    </div>
  );
}
