import { useState, useEffect } from 'react';
import { Truck, Cpu, Radio, ShieldCheck, Fuel, Battery, Play, Square, RefreshCw } from 'lucide-react';
import apiService from '../services/api';
import { useStore } from '../store/useStore';

type FleetVehicle = {
  id: string;
  name: string;
  type: string;
  status: string;
  battery: number;
  fuel: number;
  hours: number;
  operator: string;
  zone: string;
  isAutonomous: boolean;
  collisionRisk: string;
};

function mapVehicle(v: any): FleetVehicle {
  const risk = String(v.collision_risk || v.collisionRisk || 'low');
  const riskLabel =
    risk === 'medium' || risk === 'Attention - Angle Mort'
      ? 'Attention - Angle Mort'
      : risk === 'high'
        ? 'Risque élevé'
        : risk.includes('Attention') || risk.includes('Hors')
          ? risk
          : risk === 'Sécurisé' || risk === 'Hors Service'
            ? risk
            : 'Faible';

  return {
    id: v.id,
    name: v.name,
    type: v.type,
    status: v.status,
    battery: v.battery ?? 0,
    fuel: v.fuel ?? 0,
    hours: v.engine_hours ?? v.hours ?? 0,
    operator: v.operator,
    zone: v.zone,
    isAutonomous: !!(v.is_autonomous ?? v.isAutonomous),
    collisionRisk: riskLabel,
  };
}

export default function Fleet() {
  const { setVehicles } = useStore();
  const [activeTab, setActiveTab] = useState<'all' | 'ahs' | 'tele-remote'>('all');
  const [remoteEngaged, setRemoteEngaged] = useState<string | null>(null);
  const [vehicles, setLocalVehicles] = useState<FleetVehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadFleet = async () => {
    setLoading(true);
    try {
      const res = await apiService.getFleet();
      const list = (res.vehicles || []).map(mapVehicle);
      setLocalVehicles(list);
      setVehicles(res.vehicles || []);
    } catch (err) {
      console.error('Erreur chargement flotte:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFleet();
  }, []);

  const filteredVehicles = vehicles.filter((v) => {
    if (activeTab === 'ahs') return v.isAutonomous;
    if (activeTab === 'tele-remote') return v.type.toLowerCase().includes('tele') || v.type.toLowerCase().includes('télé');
    return true;
  });

  const autonomousCount = vehicles.filter((v) => v.isAutonomous).length;

  const handleTeleRemote = async (v: FleetVehicle) => {
    const engaging = remoteEngaged !== v.id;
    try {
      await apiService.setFleetTeleRemote(v.id, engaging ? 'tele-remote' : 'ahs');
      setRemoteEngaged(engaging ? v.id : null);
      setMessage(engaging ? `Télé-commande active sur ${v.id}` : `Mode AHS rétabli sur ${v.id}`);
      await loadFleet();
    } catch (err: any) {
      setMessage(err.message || 'Erreur télé-commande');
    }
  };

  return (
    <div className="p-6 space-y-6 bg-[#0f172a] text-slate-100 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Truck size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">Gestion de Flotte & Engins Autonomes (AHS)</h1>
              <p className="text-xs text-slate-400 mt-0.5">Supervision des camions sans pilote, foreuses autonomes et télé-commande LHD</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadFleet}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualiser
          </button>
          <div className="bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700 text-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Flotte Totale</p>
            <p className="text-lg font-black text-white">{vehicles.length}</p>
          </div>
          <div className="bg-emerald-950/60 px-4 py-2 rounded-xl border border-emerald-800/40 text-center">
            <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">Engins Autonomes (AHS)</p>
            <p className="text-lg font-black text-emerald-400">{autonomousCount} Engins</p>
          </div>
          <div className="bg-amber-950/60 px-4 py-2 rounded-xl border border-amber-800/40 text-center">
            <p className="text-[10px] uppercase tracking-wider text-amber-400 font-bold">Anti-Collision CAS</p>
            <p className="text-lg font-black text-amber-400">Actif (5G Privée)</p>
          </div>
        </div>
      </div>

      {message && (
        <div className="text-xs bg-blue-950/50 border border-blue-800/40 text-blue-300 px-4 py-2 rounded-xl">{message}</div>
      )}

      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'all' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-800/60 text-slate-400 hover:text-white'
          }`}
        >
          Tous les Engins ({vehicles.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ahs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'ahs' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800/60 text-slate-400 hover:text-white'
          }`}
        >
          <Cpu size={14} /> Engins Autonomes (AHS/ADS)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tele-remote')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'tele-remote' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-800/60 text-slate-400 hover:text-white'
          }`}
        >
          <Radio size={14} /> Télécommande LHD (Surface)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredVehicles.map((v) => (
          <div key={v.id} className="bg-slate-900/80 rounded-2xl p-5 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase bg-slate-800 text-blue-400 px-2 py-0.5 rounded font-bold">{v.id}</span>
                  <h3 className="text-base font-bold text-white mt-1">{v.name}</h3>
                  <p className="text-xs text-slate-400">{v.type}</p>
                </div>
                {v.isAutonomous && (
                  <span className="flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    <Cpu size={12} /> AHS AUTONOME
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50">
                  <p className="text-[10px] text-slate-400">Opérateur / Pilote</p>
                  <p className="font-semibold text-slate-200 mt-0.5 truncate">{v.operator}</p>
                </div>
                <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50">
                  <p className="text-[10px] text-slate-400">Zone d'exploitation</p>
                  <p className="font-semibold text-slate-200 mt-0.5 truncate">{v.zone}</p>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1"><Fuel size={12} className="text-amber-400" /> Carburant/Réservoir</span>
                  <span className="font-bold text-slate-200">{v.fuel}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${v.fuel}%` }}></div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1"><Battery size={12} className="text-emerald-400" /> Batterie IoT</span>
                  <span className="font-bold text-slate-200">{v.battery}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${v.battery}%` }}></div>
                </div>
              </div>

              <div className="mt-4 p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Proximité Piéton (CAS) :</span>
                <span className={`font-bold ${v.collisionRisk.includes('Attention') ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                  {v.collisionRisk}
                </span>
              </div>
            </div>

            <div className="pt-2">
              {v.type.toLowerCase().includes('tele') || v.type.toLowerCase().includes('télé') || v.type.toLowerCase().includes('lhd') ? (
                <button
                  type="button"
                  onClick={() => handleTeleRemote(v)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    remoteEngaged === v.id
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30'
                  }`}
                >
                  {remoteEngaged === v.id ? <Square size={14} /> : <Play size={14} />}
                  {remoteEngaged === v.id ? 'Arrêter la Télé-commande' : 'Prendre le Contrôle (Télé-remote)'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setMessage(`Télémétrie ${v.id} : ${v.status} · ${v.hours} h moteur · zone ${v.zone}`)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck size={14} className="text-blue-400" /> Télémétrie 5G & Diagnostics
                </button>
              )}
            </div>
          </div>
        ))}
        {filteredVehicles.length === 0 && (
          <div className="col-span-full text-center py-10 text-slate-500 text-sm">
            {loading ? 'Chargement de la flotte…' : 'Aucun engin pour ce filtre'}
          </div>
        )}
      </div>
    </div>
  );
}
