import { useState, useEffect } from 'react';
import { Activity, Radio, CheckCircle2, RefreshCw } from 'lucide-react';
import apiService from '../services/api';
import { useStore } from '../store/useStore';

export default function Geotech() {
  const { setGeotechSensors } = useStore();
  const [sensors, setSensors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSensors = async () => {
    setLoading(true);
    try {
      const res = await apiService.getGeotechSensors();
      const list = res.sensors || [];
      setSensors(list);
      setGeotechSensors(list);
    } catch (err) {
      console.error('Erreur chargement géotech:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSensors();
  }, []);

  const allStable = sensors.every((s) => s.status === 'normal' || !s.status);

  return (
    <div className="p-6 space-y-6 bg-[#0f172a] text-slate-100 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-500/20 text-red-400 rounded-xl border border-red-500/30">
            <Activity size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">Géotechnique & Sécurité des Infrastructures</h1>
            <p className="text-xs text-slate-400 mt-0.5">Surveillance microsismique (rockbursts) et radars de stabilité des digues de résidus (Tailings Dams)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadSensors}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualiser
          </button>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border ${
            allStable
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40'
              : 'bg-red-950/60 text-red-300 border-red-800/40'
          }`}>
            <CheckCircle2 size={16} /> {allStable ? 'Digues & Talus 100% Stables' : 'Alerte géotechnique'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {sensors.map((s) => {
          const displayVal =
            s.last_microseism_hz != null && String(s.sensor_type || '').toLowerCase().includes('sism')
              ? `${s.last_microseism_hz} Hz`
              : s.dam_displacement_mm != null && Number(s.dam_displacement_mm) > 0
                ? `${s.dam_displacement_mm} mm`
                : s.value != null
                  ? `${s.value}`
                  : '—';
          const ok = s.status === 'normal' || !s.status;
          return (
            <div key={s.id} className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono bg-slate-800 text-blue-400 px-2 py-0.5 rounded font-bold">{s.id}</span>
                <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  <Radio size={12} /> {ok ? 'ACTIF' : 'ALERTE'}
                </span>
              </div>
              <h3 className="text-base font-bold text-white">{s.sensor_type}</h3>
              <p className="text-xs text-slate-400">Emplacement: <strong className="text-slate-200">{s.zone}</strong></p>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">Mesure:</span>
                <span className={`text-xl font-black ${ok ? 'text-emerald-400' : 'text-red-400'}`}>{displayVal}</span>
              </div>
            </div>
          );
        })}
        {sensors.length === 0 && (
          <div className="col-span-3 text-center py-10 text-slate-500 text-sm">
            {loading ? 'Chargement des capteurs…' : 'Aucun capteur géotechnique'}
          </div>
        )}
      </div>
    </div>
  );
}
