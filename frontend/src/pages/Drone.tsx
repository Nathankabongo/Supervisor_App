import { useNavigate } from 'react-router-dom';
import { Navigation, Camera, Map } from 'lucide-react';

const drones = [
  { id: 'DRONE-01', name: 'Drone Skydio 2+ Autonome', status: 'En Mission', battery: 88, mission: 'Inspection Photogrammétrie Talus Nord' },
  { id: 'DRONE-02', name: 'Elios 3 (Spécial Galerie Confinée)', status: 'En Station Base', battery: 100, mission: 'Prêt pour inspection poste-tir' },
];

export default function Drone() {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6 bg-[#0f172a] text-slate-100 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
            <Navigation size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">Inspection par Drones Autonomes</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Shell UI — pas d&apos;API drone ; liens vers Vision IA et carte site
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate('/vision-ai')}
            className="flex items-center gap-1.5 px-3 py-2 bg-cyan-700 hover:bg-cyan-600 text-white rounded-xl text-xs font-bold"
          >
            <Camera size={14} /> Vision IA
          </button>
          <button
            type="button"
            onClick={() => navigate('/localisation?tab=carte')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700"
          >
            <Map size={14} /> Carte
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {drones.map((d) => (
          <div key={d.id} className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono bg-slate-800 text-blue-400 px-2 py-0.5 rounded font-bold">{d.id}</span>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-0.5 rounded-full">{d.status}</span>
            </div>
            <h3 className="text-lg font-bold text-white">{d.name}</h3>
            <p className="text-xs text-slate-300">Mission: <strong className="text-white">{d.mission}</strong></p>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Batterie Drone:</span>
              <span className="font-bold text-emerald-400">{d.battery}%</span>
            </div>
            <p className="text-[10px] text-amber-400/90">Télémétrie drone non connectée — données illustratives</p>
          </div>
        ))}
      </div>
    </div>
  );
}
