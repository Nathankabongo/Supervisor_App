import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bomb, MapPin, Siren } from 'lucide-react';
import { useStore } from '../store/useStore';

const plans = [
  { id: 'BLAST-01', title: 'Tir Nappe Galerie 4', zone: 'ZONE C', time: 'Demain à 14:00', status: 'Planifié', kg: 250, radius: 300 },
  { id: 'BLAST-02', title: "Tir d'Abattage Front 2", zone: 'ZONE B', time: "Aujourd'hui 18:00", status: 'Zone Évacuée', kg: 400, radius: 500 },
];

export default function Blasting() {
  const navigate = useNavigate();
  const { miners } = useStore();

  const occupancy = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of plans) {
      map[p.zone] = miners.filter((m) => (m.currentZone || '').toUpperCase().includes(p.zone.replace('ZONE ', ''))).length;
    }
    return map;
  }, [miners]);

  return (
    <div className="p-6 space-y-6 bg-[#0f172a] text-slate-100 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-500/20 text-red-400 rounded-xl border border-red-500/30">
            <Bomb size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">Planification des Tirs d'Explosifs</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Plans locaux + occupation live des zones (pas d&apos;API blasting dédiée)
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/crisis-center')}
          className="flex items-center gap-1.5 bg-red-700 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-xl"
        >
          <Siren size={14} /> Centre de Crise
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {plans.map((p) => (
          <div key={p.id} className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono bg-red-950 text-red-400 border border-red-800/40 px-2 py-0.5 rounded font-bold">{p.id}</span>
              <span className="text-xs bg-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-full font-bold">{p.status}</span>
            </div>
            <h3 className="text-lg font-bold text-white">{p.title}</h3>
            <p className="text-xs text-slate-400">
              Zone d&apos;impact: <strong className="text-slate-200">{p.zone}</strong> · Horaire: {p.time}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-400">Explosifs (kg):</span>
                <p className="font-bold text-white mt-0.5">{p.kg} kg</p>
              </div>
              <div>
                <span className="text-slate-400">Rayon Sécurité:</span>
                <p className="font-bold text-white mt-0.5">{p.radius} mètres</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Mineurs actuellement en zone:{' '}
                <strong className={(occupancy[p.zone] || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                  {occupancy[p.zone] || 0}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => navigate('/localisation?tab=carte')}
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-bold"
              >
                <MapPin size={12} /> Voir carte
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
