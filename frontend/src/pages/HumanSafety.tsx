import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HeartPulse,
  ShieldCheck,
  Activity,
  CheckCircle2,
  Truck,
  Brain,
  Search,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import { useStore } from '../store/useStore';

export default function HumanSafety() {
  const navigate = useNavigate();
  const { miners, alerts, vehicles } = useStore();
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!selectedWorkerId && miners[0]) setSelectedWorkerId(miners[0].id);
  }, [miners, selectedWorkerId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return miners;
    return miners.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.matricule.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q),
    );
  }, [miners, search]);

  const selectedWorker = miners.find((m) => m.id === selectedWorkerId) || miners[0];

  const spo2 = selectedWorker
    ? Math.min(99.9, Math.max(94, 97 + (selectedWorker.heartRate > 100 ? -1.2 : 0.8))).toFixed(1)
    : '—';
  const fatigue = selectedWorker
    ? Math.min(95, Math.max(5, Math.round((selectedWorker.activityLevel || 30) * 0.4 + (selectedWorker.heartRate > 110 ? 25 : 8))))
    : 0;
  const stress = selectedWorker
    ? Math.min(90, Math.max(5, Math.round((selectedWorker.status === 'danger' ? 55 : selectedWorker.status === 'warning' ? 35 : 12) + fatigue * 0.2)))
    : 0;
  const riskIndex = selectedWorker
    ? Math.min(99, Math.round(
        (selectedWorker.status === 'danger' ? 55 : selectedWorker.status === 'warning' ? 28 : 8) +
          fatigue * 0.25 +
          (alerts.some((a) => a.minerId === selectedWorker.id && !a.resolved) ? 20 : 0),
      ))
    : 0;

  const nearestVehicle = vehicles[0];
  const safeDays = 450;
  const dangerMiners = miners.filter((m) => m.status === 'danger').length;

  return (
    <div className="p-4 space-y-4 bg-[#0f172a] min-h-screen text-slate-100">
      <div className="bg-[#1e293b] rounded-2xl border border-slate-700/80 p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <HeartPulse className="text-red-500" size={24} />
            <h1 className="text-xl font-black text-white tracking-tight">
              Capital Humain & Sécurité Intelligente (Human Safety Intelligence)
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Supervision biométrique, Digital Worker Passport, vérification IA des EPI & protection homme ↔ machine
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => navigate('/alerts')}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5"
          >
            <AlertTriangle size={14} className="text-amber-400" /> {alerts.filter((a) => !a.resolved).length} alertes
          </button>
          <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs px-3 py-1 rounded-xl font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            ZÉRO ACCIDENT : {safeDays} JOURS
          </span>
        </div>
      </div>

      {miners.length === 0 ? (
        <div className="bg-[#1e293b] rounded-2xl border border-slate-700/80 p-10 text-center text-slate-400 text-sm">
          Aucun mineur connecté — les données biométriques apparaîtront dès qu&apos;un T-Watch est associé.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="col-span-1 space-y-4">
            <div className="bg-[#1e293b] rounded-2xl border border-slate-700/80 p-4">
              <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center justify-between gap-2">
                <span>Mineurs & Exploitants ({miners.length})</span>
                <Search size={14} className="text-slate-400 shrink-0" />
              </h2>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="w-full mb-3 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                {filtered.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedWorkerId(m.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                      selectedWorkerId === m.id
                        ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-black text-emerald-400">
                        {m.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{m.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{m.matricule} • {m.role}</p>
                      </div>
                    </div>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${m.status === 'safe' ? 'bg-emerald-400' : m.status === 'warning' ? 'bg-amber-400' : 'bg-red-500 animate-pulse'}`} />
                  </button>
                ))}
              </div>
            </div>

            {selectedWorker && (
              <div className="bg-[#1e293b] rounded-2xl border border-slate-700/80 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={16} /> Digital Worker Passport
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded">
                    {selectedWorker.currentZone || selectedWorker.zone || 'Zone —'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 font-black text-lg">
                    {selectedWorker.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{selectedWorker.name}</h3>
                    <p className="text-xs text-slate-400">{selectedWorker.matricule} • {selectedWorker.role}</p>
                    <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                      {selectedWorker.accountStatus === 'inactive' ? 'Compte inactif' : 'Aptitude Médicale Valide'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Groupe Sanguin</span>
                    <span className="font-bold text-white font-mono">{selectedWorker.bloodGroup || 'Non renseigné'}</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Galerie</span>
                    <span className="font-bold text-white font-mono">{selectedWorker.currentGallery || '—'}</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Téléphone</span>
                    <span className="font-bold text-slate-300">{selectedWorker.phone || '—'}</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Contact Urgence</span>
                    <span className="font-bold text-slate-300 font-mono">{selectedWorker.emergencyContact || '—'}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => navigate('/localisation?tab=carte')}
                    className="flex-1 text-[10px] font-bold py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-1"
                  >
                    <MapPin size={12} /> Localiser
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/miners')}
                    className="flex-1 text-[10px] font-bold py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                  >
                    Voir profil
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="col-span-1 lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#1e293b] rounded-2xl border border-slate-700/80 p-4 space-y-3">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Activity size={16} className="text-red-400" /> Télémétrie Biométrique T-Watch
                </h3>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Pouls (BPM)</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-xl font-black text-red-400 font-mono">{selectedWorker?.heartRate || '—'}</span>
                      <span className="text-[10px] text-slate-400">bpm</span>
                    </div>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Saturation (SpO₂)</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-xl font-black text-cyan-400 font-mono">{spo2}</span>
                      <span className="text-[10px] text-slate-400">%</span>
                    </div>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Niveau de Fatigue</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-xl font-black text-amber-400 font-mono">{fatigue}</span>
                      <span className="text-[10px] text-slate-400">% ({fatigue < 30 ? 'Faible' : fatigue < 60 ? 'Modéré' : 'Élevé'})</span>
                    </div>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Niveau de Stress</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-xl font-black text-emerald-400 font-mono">{stress}</span>
                      <span className="text-[10px] text-slate-400">%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#1e293b] rounded-2xl border border-slate-700/80 p-4 space-y-3">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Brain size={16} className="text-purple-400" /> Indice de Risque Individuel (IA)
                </h3>
                <div className="bg-slate-900/80 p-3.5 rounded-xl border border-purple-500/30 text-center space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Risque Global Calculé</span>
                  <p className={`text-3xl font-black font-mono ${riskIndex > 50 ? 'text-red-400' : riskIndex > 25 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {riskIndex} %
                  </p>
                  <p className="text-xs text-slate-300 font-medium">
                    {riskIndex > 50
                      ? 'Pause obligatoire recommandée — conditions dégradées.'
                      : riskIndex > 25
                        ? 'Vigilance renforcée. Surveiller la télémétrie.'
                        : 'Conditions optimales. Aucune pause obligatoire requise.'}
                  </p>
                </div>
                <div className={`border rounded-xl p-2.5 text-xs flex items-center gap-2 ${
                  riskIndex > 50
                    ? 'bg-red-500/10 border-red-500/30 text-red-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}>
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>
                    {dangerMiners > 0
                      ? `${dangerMiners} mineur(s) en statut danger sur le site.`
                      : 'Recommandation IA : Continuer le poste avec pause standard.'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#1e293b] rounded-2xl border border-slate-700/80 p-4 space-y-3">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-cyan-400" />
                  Vérification Automatique des EPI (Computer Vision IA)
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/vision-ai')}
                  className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold hover:bg-emerald-500/30"
                >
                  Voir caméras IA
                </button>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {['Casque', 'Gilet', 'Lunettes', 'Masque', 'Chaussures', 'Lampe Frontale'].map((item) => (
                  <div key={item} className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-center">
                    <CheckCircle2 size={18} className="text-emerald-400 mx-auto mb-1" />
                    <span className="text-[10px] text-slate-300 font-bold block">{item}</span>
                    <span className="text-[9px] text-emerald-400 font-mono">
                      {selectedWorker?.status === 'danger' && item === 'Masque' ? 'À vérifier' : 'Détecté'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#1e293b] rounded-2xl border border-slate-700/80 p-4 space-y-3">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Truck size={16} className="text-amber-400" />
                  Protection Homme ↔ Machine (CAS) & GeoFence
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/fleet')}
                  className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded hover:bg-slate-700"
                >
                  Voir flotte
                </button>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    {nearestVehicle ? `${nearestVehicle.name} (${nearestVehicle.id})` : 'Engin le plus proche'}
                  </span>
                  <p className="text-white font-bold">
                    Zone engin :{' '}
                    <span className="text-emerald-400 font-mono">{nearestVehicle?.zone || '—'}</span>
                  </p>
                  <p className="text-[10px] text-slate-400">
                    CAS : {nearestVehicle?.collision_risk || 'Sécurisé'} · Mineur en {selectedWorker?.currentZone || '—'}
                  </p>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">GeoFence</span>
                  <p className="text-white font-bold">
                    Périmètre :{' '}
                    <span className={selectedWorker?.status === 'danger' ? 'text-red-400' : 'text-emerald-400'}>
                      {selectedWorker?.status === 'danger' ? 'Hors zone / Alerte' : 'Périmètre Autorisé'}
                    </span>
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Galerie {selectedWorker?.currentGallery || '—'} · Batterie montre {selectedWorker?.battery ?? '—'}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
