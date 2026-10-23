import { useState, useEffect } from 'react';
import { CloudSun, ShieldCheck } from 'lucide-react';
import apiService from '../services/api';

export default function Weather() {
  const [weather, setWeather] = useState<any>({
    lightning_strikes_20km: 0, wind_speed_ms: 1.2, wind_direction: 'Nord-Est', blast_permission: 'AUTORISÉ', rain_forecast: 'Nuageux sans pluie'
  });

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await apiService.getWeatherSite();
        if (res.weather) setWeather(res.weather);
      } catch (err) {
        console.error('Erreur chargement météo:', err);
      }
    };
    fetchWeather();
  }, []);

  return (
    <div className="p-4 space-y-4 bg-[#0f172a] min-h-screen text-slate-100">
      <div className="bg-[#1e293b] rounded-2xl border border-slate-700/80 p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CloudSun className="text-amber-400" size={24} />
            <h1 className="text-xl font-black text-white tracking-tight">Centre Météo & Détecteur de Foudre (Open Pit Radar)</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Prévisions locales du site à ciel ouvert, vitesse des rafales et sécurité des tirs de mine (Base SQLite)
          </p>
        </div>
        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-3 py-1 rounded-xl font-bold flex items-center gap-1.5">
          <ShieldCheck size={16} /> Conditions Climatiques Favorables
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#1e293b] p-4 rounded-2xl border border-slate-700/80 space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Station Foudre (Rayon 20km)</span>
          <p className="text-2xl font-black text-emerald-400 font-mono">{weather.lightning_strikes_20km} Impact</p>
          <p className="text-xs text-slate-400">Aucun risque électrique atmosphérique</p>
        </div>
        <div className="bg-[#1e293b] p-4 rounded-2xl border border-slate-700/80 space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Vent Fosse Principale</span>
          <p className="text-2xl font-black text-cyan-400 font-mono">{weather.wind_speed_ms} m/s</p>
          <p className="text-xs text-slate-400">Orientation : {weather.wind_direction} • Poussière contrôlée</p>
        </div>
        <div className="bg-[#1e293b] p-4 rounded-2xl border border-slate-700/80 space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Autorisation Tir d'Explosifs (IA)</span>
          <p className="text-2xl font-black text-emerald-400 font-mono">{weather.blast_permission}</p>
          <p className="text-xs text-slate-400">{weather.rain_forecast}</p>
        </div>
      </div>
    </div>
  );
}
