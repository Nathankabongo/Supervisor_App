import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  User,
  Shield,
  AlertTriangle,
  MapPin,
  Wifi,
  Search,
  Heart,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Home,
  Thermometer,
  Cloud,
  Watch,
  Activity,
  Navigation,
  Truck,
  Wrench,
  Leaf,
  Map,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import apiService from '../services/api';
import MiningMap from '../components/map/MiningMap';
import MinerIcon from '../components/map/MinerIcon';
import TrajectoryLayer from '../components/map/TrajectoryLayer';
import { findWatchUrgencyAlert } from '../components/localisation/evacuationRoutes';

const SITE_ZONES = [
  { id: 'ZONE A', short: 'A', label: 'Extraction', color: '#f97316' },
  { id: 'ZONE B', short: 'B', label: 'Transport', color: '#3b82f6' },
  { id: 'ZONE C', short: 'C', label: 'Ventilation', color: '#22c55e' },
  { id: 'ZONE D', short: 'D', label: 'Stockage', color: '#a855f7' },
  { id: 'ZONE E', short: 'E', label: 'Maintenance', color: '#ef4444' },
  { id: 'ZONE F', short: 'F', label: 'Services', color: '#06b6d4' },
] as const;

interface EnvCondition {
  zone: string;
  temperature: number;
  humidity: number;
  co2_level: number;
  dust_level: number;
  noise_level: number;
  wind_speed: number;
  pressure: number;
  status: string;
  updated_at: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    miners,
    alerts,
    selectedMiner,
    setSelectedMiner,
    filters,
    setFilters,
    showTrajectories,
    setShowTrajectories,
    vehicles,
    esgMetrics,
  } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [zoom, setZoom] = useState(1);
  const [viewMode, setViewMode] = useState<'zone' | 'gallery' | 'level'>('zone');
  const [envConditions, setEnvConditions] = useState<EnvCondition[]>([]);
  const [fleetCount, setFleetCount] = useState(vehicles.length);

  useEffect(() => {
    const fetchEnv = async () => {
      try {
        const res = await apiService.getEnvConditions();
        if (res.conditions) setEnvConditions(res.conditions);
      } catch {}
    };
    const fetchFleet = async () => {
      try {
        const res = await apiService.getFleet();
        if (res.vehicles) setFleetCount(res.vehicles.length);
      } catch {}
    };
    fetchEnv();
    fetchFleet();
    const interval = setInterval(fetchEnv, 30000);
    return () => clearInterval(interval);
  }, []);

  const totalMiners = miners.length;
  const activeMiners = miners.filter((m) => m.status !== 'danger').length;
  const activeAlerts = alerts.filter((a) => !a.resolved).length;
  const selectedMinerAlert = selectedMiner
    ? alerts.find((a) => a.minerId === selectedMiner.id && !a.resolved)
    : null;
  const dangerCount = miners.filter((m) => m.status === 'danger').length;

  const filteredMiners = miners.filter((miner) => {
    if (
      searchQuery &&
      !miner.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !miner.matricule.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const mapMiners = miners.filter((miner) => {
    if (filters.zone !== 'all' && miner.currentZone !== filters.zone) return false;
    if (filters.status !== 'all' && miner.status !== filters.status) return false;
    if (filters.role !== 'all' && miner.role !== filters.role) return false;
    return true;
  });

  const activeTrackedMiners = [...filteredMiners]
    .sort((a, b) => {
      if (a.status === 'danger' && b.status !== 'danger') return -1;
      if (b.status === 'danger' && a.status !== 'danger') return 1;
      if (a.status === 'warning' && b.status !== 'warning') return -1;
      if (b.status === 'warning' && a.status !== 'warning') return 1;
      return b.activityLevel - a.activityLevel;
    })
    .slice(0, 3);

  const getMinerDistance = (miner: (typeof miners)[0]) => {
    if (!miner.trajectory || miner.trajectory.length < 2) return 0;
    let dist = 0;
    for (let i = 1; i < miner.trajectory.length; i++) {
      const dx = miner.trajectory[i].x - miner.trajectory[i - 1].x;
      const dy = miner.trajectory[i].y - miner.trajectory[i - 1].y;
      dist += Math.sqrt(dx * dx + dy * dy);
    }
    return Math.round(dist);
  };

  const openLocalisation = (
    miner?: (typeof miners)[0] | null,
    tab: 'carte' | 'trajectoires' | 'tracabilite' | 'evacuation' = 'carte',
  ) => {
    if (miner) setSelectedMiner(miner);
    // Urgence uniquement si alerte SOS/chute montre non résolue
    if (tab === 'evacuation') {
      const urgency = miner ? findWatchUrgencyAlert(alerts, miner.id) : null;
      const hasWatch = miner
        ? !!(miner.watchId || (miner as { watch_id?: string }).watch_id)
        : false;
      if (!urgency || !hasWatch) {
        navigate('/localisation?tab=carte');
        return;
      }
    }
    navigate(`/localisation?tab=${tab}`);
  };

  const minerHasWatchUrgency = (minerId: string) => {
    const urgency = findWatchUrgencyAlert(alerts, minerId);
    const miner = miners.find((m) => m.id === minerId);
    const hasWatch = miner
      ? !!(miner.watchId || (miner as { watch_id?: string }).watch_id)
      : false;
    return !!(urgency && hasWatch);
  };

  const handleMinerClick = (miner: (typeof miners)[0]) => {
    setSelectedMiner(miner);
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => setZoom(1);

  return (
    <div className="p-4 space-y-4 bg-[#0f172a] min-h-screen">
      {/* Header */}
      <div className="bg-[#1e293b] rounded-2xl border border-gray-700/80 px-6 py-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src={`/Logo-with-text.png`} alt="SupervisorApp" className="h-12 w-auto" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white tracking-tight">
                  Centre de Contrôle & Supervision
                </h1>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase">
                  SALLE DE COMMANDEMENT
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Vue globale consolidée : Sécurité HSE, Flotte AHS, Production, IA & ESG
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold border border-emerald-500/30">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              5G & LoRa En Ligne
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0b1a2a] rounded-xl text-slate-300 text-xs font-semibold border border-gray-700">
              <Wifi size={14} className="text-emerald-400" />
              Réseau: 98%
            </div>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          type="button"
          onClick={() => navigate('/miners')}
          className="bg-[#1e293b] rounded-xl p-3.5 border border-gray-700/80 shadow-md text-left hover:border-emerald-500/50 transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <Users className="text-emerald-400" size={18} />
            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
              HSE
            </span>
          </div>
          <p className="text-xl font-black text-white">
            {activeMiners} / {totalMiners}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Mineurs sous terre</p>
        </button>

        <button
          type="button"
          onClick={() => navigate('/fleet')}
          className="bg-[#1e293b] rounded-xl p-3.5 border border-gray-700/80 shadow-md text-left hover:border-blue-500/50 transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <Truck className="text-blue-400" size={18} />
            <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-bold">
              AHS
            </span>
          </div>
          <p className="text-xl font-black text-white">{fleetCount || vehicles.length || 5} Engins</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Engins en opération</p>
        </button>

        <button
          type="button"
          onClick={() => navigate('/maintenance')}
          className="bg-[#1e293b] rounded-xl p-3.5 border border-gray-700/80 shadow-md text-left hover:border-amber-500/50 transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <Wrench className="text-amber-400" size={18} />
            <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">
              GMAO IA
            </span>
          </div>
          <p className="text-xl font-black text-amber-400">96.2%</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Disponibilité Flotte</p>
        </button>

        <button
          type="button"
          onClick={() => navigate('/alerts')}
          className="bg-[#1e293b] rounded-xl p-3.5 border border-gray-700/80 shadow-md text-left hover:border-red-500/50 transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <AlertTriangle
              className={activeAlerts > 0 ? 'text-red-500' : 'text-emerald-400'}
              size={18}
            />
            <span className="text-[9px] text-red-400 font-bold uppercase">
              {activeAlerts > 0 ? 'Urgence' : 'Normal'}
            </span>
          </div>
          <p
            className={`text-xl font-black ${activeAlerts > 0 ? 'text-red-500' : 'text-emerald-400'}`}
          >
            {activeAlerts}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Alertes d'urgence</p>
        </button>

        <button
          type="button"
          onClick={() => navigate('/esg')}
          className="bg-[#1e293b] rounded-xl p-3.5 border border-gray-700/80 shadow-md text-left hover:border-emerald-500/50 transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <Leaf className="text-emerald-400" size={18} />
            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
              ESG
            </span>
          </div>
          <p className="text-xl font-black text-white">
            {esgMetrics?.co2_emissions != null ? `${esgMetrics.co2_emissions} t` : '14.2 t'}{' '}
            <span className="text-xs font-normal text-slate-400">CO₂/j</span>
          </p>
          <p className="text-[10px] text-emerald-400 mt-0.5 font-bold">Empreinte environnementale</p>
        </button>

        <button
          type="button"
          onClick={() => navigate('/geotech')}
          className="bg-[#1e293b] rounded-xl p-3.5 border border-gray-700/80 shadow-md text-left hover:border-purple-500/50 transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <Activity className="text-purple-400" size={18} />
            <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-bold">
              Géotech
            </span>
          </div>
          <p className="text-xl font-black text-white">14.2 Hz</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Stabilité Digues OK</p>
        </button>
      </div>

      {/* Environnement */}
      <div className="bg-[#1e293b] rounded-xl border border-gray-700/80 p-4 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-gray-700/60 pb-2">
          <div className="flex items-center gap-2">
            <Thermometer size={18} className="text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">
              CONDITIONS ENVIRONNEMENTALES GÉNÉRALES DU SITE
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {envConditions.length > 0
              ? `Dernière MAJ: ${new Date(envConditions[0].updated_at).toLocaleTimeString('fr-FR')}`
              : 'Dernière MAJ: En direct'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          <div className="bg-[#0f172a] rounded-lg p-2.5 border border-gray-800 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Température</span>
            <span className="text-sm font-black text-white mt-1 block">28.5°C</span>
          </div>
          <div className="bg-[#0f172a] rounded-lg p-2.5 border border-gray-800 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Humidité</span>
            <span className="text-sm font-black text-cyan-400 mt-1 block">60%</span>
          </div>
          <div className="bg-[#0f172a] rounded-lg p-2.5 border border-gray-800 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">CO₂ (Niveau)</span>
            <span className="text-sm font-black text-emerald-400 mt-1 block">420 ppm</span>
          </div>
          <div className="bg-[#0f172a] rounded-lg p-2.5 border border-gray-800 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Vent (Débit)</span>
            <span className="text-sm font-black text-blue-400 mt-1 block">1.2 m/s</span>
          </div>
          <div className="bg-[#0f172a] rounded-lg p-2.5 border border-gray-800 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Bruit Sonore</span>
            <span className="text-sm font-black text-amber-400 mt-1 block">75 dB</span>
          </div>
          <div className="bg-[#0f172a] rounded-lg p-2.5 border border-gray-800 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Poussière</span>
            <span className="text-sm font-black text-slate-200 mt-1 block">0.5 mg/m³</span>
          </div>
          <div className="bg-[#0f172a] rounded-lg p-2.5 border border-gray-800 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Pression Atmo.</span>
            <span className="text-sm font-black text-purple-400 mt-1 block">1015 hPa</span>
          </div>
        </div>
      </div>

      {/* Carte + suivi mineurs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="col-span-1 lg:col-span-2 bg-[#1e293b] rounded-xl border border-gray-700 overflow-hidden flex flex-col">
          {/* Toolbar: title + Vue par + actions */}
          <div className="px-4 py-3 border-b border-gray-700 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Map size={16} className="text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                  Carte du site
                </h3>
                {dangerCount > 0 && (
                  <span className="text-[10px] font-bold uppercase bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full">
                    {dangerCount} en danger
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Vue par
                  </span>
                  <div className="inline-flex bg-[#0f172a] p-0.5 rounded-lg border border-gray-700">
                    {(
                      [
                        { id: 'zone' as const, label: 'Zone' },
                        { id: 'gallery' as const, label: 'Galerie' },
                        { id: 'level' as const, label: 'Niveau' },
                      ]
                    ).map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setViewMode(mode.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                          viewMode === mode.id
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showTrajectories}
                    onChange={(e) => setShowTrajectories(e.target.checked)}
                    className="w-3 h-3 rounded border-gray-600 bg-[#0f172a] text-emerald-500 focus:ring-emerald-500/40"
                  />
                  Trajectoires
                </label>

                <button
                  type="button"
                  onClick={() => openLocalisation(selectedMiner, 'carte')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-[11px] font-semibold transition-colors"
                >
                  <Map size={12} />
                  Plein écran
                </button>
              </div>
            </div>

            {/* Zone chips — primary spatial filter */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 w-10 shrink-0">
                Zone
              </span>
              <button
                type="button"
                onClick={() => setFilters({ zone: 'all' })}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                  filters.zone === 'all'
                    ? 'bg-slate-100 text-slate-900 border-slate-100'
                    : 'bg-[#0f172a] text-slate-400 border-gray-700 hover:border-gray-500 hover:text-white'
                }`}
              >
                Toutes
              </button>
              {SITE_ZONES.map((zone) => {
                const active = filters.zone === zone.id;
                return (
                  <button
                    key={zone.id}
                    type="button"
                    title={`${zone.id} — ${zone.label}`}
                    onClick={() => setFilters({ zone: active ? 'all' : zone.id })}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                      active
                        ? 'text-white border-transparent'
                        : 'bg-[#0f172a] text-slate-300 border-gray-700 hover:border-gray-500'
                    }`}
                    style={
                      active
                        ? { backgroundColor: zone.color, borderColor: zone.color }
                        : undefined
                    }
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: active ? '#fff' : zone.color }}
                    />
                    {zone.short}
                    <span className={`hidden sm:inline font-normal ${active ? 'text-white/80' : 'text-slate-500'}`}>
                      {zone.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Map canvas */}
          <div className="relative bg-[#0f172a]" style={{ height: '350px' }}>
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
            >
              <svg width="1000" height="500" viewBox="0 0 1000 500" className="bg-[#0f172a]">
                <foreignObject width="1000" height="500">
                  <MiningMap
                    width={1000}
                    height={500}
                    viewMode={viewMode}
                    onZoneClick={(zoneId) => setFilters({ zone: zoneId })}
                  />
                </foreignObject>

                <TrajectoryLayer
                  miners={
                    selectedMiner && !mapMiners.some((m) => m.id === selectedMiner.id)
                      ? [...mapMiners, selectedMiner]
                      : mapMiners
                  }
                  showTrajectories={showTrajectories}
                  timelinePosition={100}
                />

                {mapMiners.map((miner) => (
                  <MinerIcon
                    key={miner.id}
                    miner={miner}
                    onClick={() => handleMinerClick(miner)}
                    isSelected={selectedMiner?.id === miner.id}
                  />
                ))}
              </svg>
            </div>

            <div className="absolute right-3 top-3 flex flex-col gap-1 z-10">
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1.5 bg-[#1e293b] rounded text-gray-300 hover:bg-[#334155] border border-gray-700"
              >
                <ZoomIn size={16} />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1.5 bg-[#1e293b] rounded text-gray-300 hover:bg-[#334155] border border-gray-700"
              >
                <ZoomOut size={16} />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="p-1.5 bg-[#1e293b] rounded text-gray-300 hover:bg-[#334155] border border-gray-700"
              >
                <Home size={16} />
              </button>
            </div>
          </div>

          {/* Secondary filters + legend */}
          <div className="px-4 py-3 border-t border-gray-700 space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[140px] flex-1">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Statut
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ status: e.target.value })}
                  className="w-full bg-[#0f172a] border border-gray-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">Tous</option>
                  <option value="safe">Normal</option>
                  <option value="warning">Avertissement</option>
                  <option value="danger">Danger</option>
                </select>
              </div>
              <div className="min-w-[140px] flex-1">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Fonction
                </label>
                <select
                  value={filters.role}
                  onChange={(e) => setFilters({ role: e.target.value })}
                  className="w-full bg-[#0f172a] border border-gray-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">Toutes</option>
                  <option value="Creuseur">Creuseur</option>
                  <option value="Transporteur">Transporteur</option>
                  <option value="Technicien">Technicien</option>
                  <option value="Superviseur">Superviseur</option>
                  <option value="Médecin">Médecin</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => setFilters({ zone: 'all', status: 'all', role: 'all' })}
                className="px-3 py-1.5 bg-[#334155] hover:bg-slate-600 border border-gray-600 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Réinitialiser
              </button>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                Mineur actif
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0.5 bg-emerald-500" />
                Déplacement
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0.5 bg-blue-500" />
                Trajectoire
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                Avertissement
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                Danger
              </div>
            </div>
          </div>
        </div>

        {/* Live Displacement Track */}
        <div className="col-span-1 bg-[#1e293b] rounded-lg border border-gray-700 flex flex-col">
          <style>{`
            @keyframes heartbeat {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.25); }
            }
            .animate-heartbeat {
              animation: heartbeat 0.8s infinite ease-in-out;
            }
            @keyframes pulse-ring {
              0% { transform: scale(0.9); opacity: 0.8; }
              100% { transform: scale(1.4); opacity: 0; }
            }
            .animate-pulse-ring {
              animation: pulse-ring 2s cubic-bezier(0.215, 0.610, 0.355, 1) infinite;
            }
          `}</style>

          <div className="p-3 border-b border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Activity size={16} className="text-green-500" />
                SUIVI DES DÉPLACEMENTS
              </h3>
              <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded-full font-bold">
                LIVE (3)
              </span>
            </div>

            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Rechercher un mineur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0f172a] border border-gray-700 rounded-lg pl-8 pr-2 py-1.5 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-green-500"
              />
            </div>
          </div>

          <div className="flex-1 p-2 space-y-2.5 overflow-y-auto">
            {activeTrackedMiners.map((miner) => {
              const isSelected = selectedMiner?.id === miner.id;
              const isMoving = miner.activityLevel > 4;
              const speed = isMoving ? (miner.activityLevel * 0.22).toFixed(1) : '0.0';
              const distance = getMinerDistance(miner);

              return (
                <div
                  key={miner.id}
                  onClick={() => setSelectedMiner(miner)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all duration-300 relative group ${
                    isSelected
                      ? 'bg-green-500/10 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.15)]'
                      : 'bg-[#0f172a]/60 border-gray-700 hover:border-gray-500 hover:bg-[#334155]/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="relative shrink-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold transition-all duration-300 ${
                            miner.status === 'danger'
                              ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                              : miner.status === 'warning'
                                ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]'
                                : 'bg-green-500'
                          }`}
                        >
                          {miner.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </div>
                        {isMoving && (
                          <div className="absolute inset-0 rounded-full border-2 border-green-400 animate-pulse-ring pointer-events-none" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-white font-bold text-xs truncate group-hover:text-green-400 transition-colors">
                          {miner.name}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[9px] text-gray-400 font-mono">{miner.matricule}</span>
                          <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                          <span className="text-[9px] text-green-400 font-medium px-1 bg-green-500/10 rounded">
                            {miner.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {isMoving ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping"></span>
                          MOUVEMENT
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-gray-500/10 text-gray-400 border border-gray-700">
                          STATIQUE
                        </span>
                      )}
                      <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{speed} m/s</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 mt-3">
                    <div className="flex flex-col bg-[#0f172a]/80 p-1.5 rounded border border-gray-800">
                      <span className="text-[8px] text-gray-400 flex items-center gap-0.5 font-semibold uppercase tracking-wider">
                        <MapPin size={8} className="text-cyan-400" /> Zone
                      </span>
                      <span className="text-[10px] text-white font-medium mt-0.5 truncate">
                        {miner.currentZone}
                      </span>
                    </div>
                    <div className="flex flex-col bg-[#0f172a]/80 p-1.5 rounded border border-gray-800">
                      <span className="text-[8px] text-gray-400 flex items-center gap-0.5 font-semibold uppercase tracking-wider">
                        <Watch size={8} className="text-blue-400" /> Galerie
                      </span>
                      <span className="text-[10px] text-white font-medium mt-0.5 truncate">
                        {miner.currentGallery}
                      </span>
                    </div>
                    <div className="flex flex-col bg-[#0f172a]/80 p-1.5 rounded border border-gray-800">
                      <span className="text-[8px] text-gray-400 flex items-center gap-0.5 font-semibold uppercase tracking-wider">
                        <Activity size={8} className="text-purple-400" /> Trajet
                      </span>
                      <span className="text-[10px] text-white font-medium mt-0.5 font-mono">
                        {distance} m
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-700/40">
                    <div className="flex items-center gap-1 bg-red-500/5 px-2 py-0.5 rounded-full border border-red-500/10 shrink-0">
                      <Heart
                        size={10}
                        className="text-red-500 animate-heartbeat"
                        style={{ animationDuration: `${60 / Math.max(miner.heartRate, 1)}s` }}
                      />
                      <span className="text-[10px] font-mono font-bold text-red-400">
                        {miner.heartRate} bpm
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openLocalisation(
                          miner,
                          minerHasWatchUrgency(miner.id) ? 'evacuation' : 'carte',
                        );
                      }}
                      className="px-3 py-1 rounded text-[10px] font-semibold transition-all duration-300 bg-cyan-600 hover:bg-cyan-500 text-white"
                    >
                      Localiser
                    </button>
                  </div>
                </div>
              );
            })}
            {activeTrackedMiners.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-xs">
                Aucun déplacement détecté pour la recherche.
              </div>
            )}
          </div>

          <div className="p-3 border-t border-gray-700 shrink-0">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-1 text-green-500 text-xs font-semibold hover:text-green-400 transition-colors"
              onClick={() => navigate('/miners')}
            >
              Gérer tous les mineurs
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Selected Miner Detail */}
      {selectedMiner && (
        <div className="bg-[#1e293b] rounded-lg border border-gray-700 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Activity size={16} className="text-green-400" />
                DÉPLACEMENT (GPS T-WATCH) - {selectedMiner.name.toUpperCase()}
              </h3>
              <div className="bg-[#334155] rounded-lg p-3 mb-3 border border-blue-500/30">
                <p className="text-xs text-blue-400 mb-2 flex items-center gap-1">
                  <Watch size={12} /> Suivi T-Watch du jour
                </p>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <p className="text-gray-400">Date</p>
                    <p className="text-white font-medium">
                      {new Date().toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Distance</p>
                    <p className="text-white font-medium">{getMinerDistance(selectedMiner)} m</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Tps. mvt</p>
                    <p className="text-white font-medium">
                      {selectedMiner.trajectory?.length > 1
                        ? Math.round(
                            (selectedMiner.trajectory[selectedMiner.trajectory.length - 1].timestamp -
                              selectedMiner.trajectory[0].timestamp) /
                              60000,
                          )
                        : 0}{' '}
                      m
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Zones</p>
                    <p className="text-white font-medium">1</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-1 mb-3">
                <button
                  type="button"
                  className="px-3 py-1 bg-green-500 text-white rounded text-xs font-medium hover:bg-green-600"
                  onClick={() => openLocalisation(selectedMiner, 'carte')}
                >
                  Carte
                </button>
                <button
                  type="button"
                  className="px-3 py-1 bg-[#334155] text-gray-300 rounded text-xs font-medium hover:bg-slate-600"
                  onClick={() => openLocalisation(selectedMiner, 'trajectoires')}
                >
                  Chronologie
                </button>
                {selectedMiner && minerHasWatchUrgency(selectedMiner.id) && (
                  <button
                    type="button"
                    className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-500"
                    onClick={() => openLocalisation(selectedMiner, 'evacuation')}
                  >
                    Urgence
                  </button>
                )}
              </div>

              <div className="space-y-1 text-xs">
                {selectedMiner.trajectory?.slice(-5).map((pos, i) => (
                  <div key={i} className="flex items-center gap-2 text-gray-300">
                    <span className="text-gray-500 w-16">
                      {new Date(pos.timestamp).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span>
                      X: {pos.x.toFixed(1)}, Y: {pos.y.toFixed(1)}
                    </span>
                  </div>
                ))}
                {(!selectedMiner.trajectory || selectedMiner.trajectory.length === 0) && (
                  <div className="text-gray-500 text-center py-2">
                    Aucun déplacement reçu de la montre
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Watch size={16} className="text-blue-400" />
                DONNÉES EN DIRECT T-WATCH
              </h3>
              <div className="bg-[#334155] rounded-lg p-3 space-y-3 border border-blue-500/30">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg transition-all duration-300 ${
                      selectedMiner.status === 'danger'
                        ? 'bg-red-500 shadow-red-500/50'
                        : selectedMiner.status === 'warning'
                          ? 'bg-orange-500 shadow-orange-500/50'
                          : 'bg-green-500 shadow-green-500/30'
                    }`}
                  >
                    {selectedMiner.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{selectedMiner.name}</p>
                    <p className="text-xs text-gray-400">
                      {selectedMiner.matricule} • {selectedMiner.role}
                    </p>
                  </div>
                </div>

                {selectedMinerAlert && (
                  <div className="bg-red-950/80 border border-red-500 rounded-lg p-3 text-white space-y-1.5 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse">
                    <div className="flex items-center gap-1.5 text-red-400 font-extrabold text-[10px] uppercase tracking-wider">
                      <AlertTriangle size={12} />
                      DANGER IMMÉDIAT
                    </div>
                    <p className="text-xs font-bold text-slate-100">{selectedMinerAlert.message}</p>
                    {selectedMinerAlert.predictedCause && (
                      <div className="text-[10px] bg-black/40 border border-red-500/25 text-red-300 p-2 rounded mt-1 leading-relaxed">
                        <span className="font-semibold text-red-400 text-[9px] uppercase tracking-wide block mb-0.5">
                          Cause d'incident prédite (IA) :
                        </span>
                        {selectedMinerAlert.predictedCause}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#1e293b] p-2 rounded border border-gray-700">
                    <p className="text-gray-400 flex items-center gap-1">
                      <MapPin size={10} className="text-cyan-400" /> Zone d'affectation
                    </p>
                    <p className="text-white font-medium">{selectedMiner.currentZone}</p>
                  </div>
                  <div className="bg-[#1e293b] p-2 rounded border border-gray-700">
                    <p className="text-gray-400 flex items-center gap-1">
                      <Watch size={10} className="text-blue-400" /> Galerie de travail
                    </p>
                    <p className="text-white font-medium">{selectedMiner.currentGallery}</p>
                  </div>
                  <div className="bg-[#1e293b] p-2 rounded border border-gray-700">
                    <p className="text-gray-400 flex items-center gap-1">
                      <User size={10} className="text-green-400" /> Travail / Poste
                    </p>
                    <p className="text-white font-medium">{selectedMiner.role}</p>
                  </div>
                  <div className="bg-[#1e293b] p-2 rounded border border-gray-700">
                    <p className="text-gray-400 flex items-center justify-between">
                      <span className="flex items-center gap-1"><Navigation size={10} className="text-purple-400" /> Position GPS</span>
                      <span className="text-[9px] text-slate-500 font-mono">X:{selectedMiner.position.x.toFixed(0)} Y:{selectedMiner.position.y.toFixed(0)}</span>
                    </p>
                    <p className="text-white font-mono font-medium text-[11px] truncate mt-0.5">
                      {selectedMiner.latitude != null && selectedMiner.longitude != null && (selectedMiner.latitude !== 0 || selectedMiner.longitude !== 0)
                        ? `${Number(selectedMiner.latitude).toFixed(5)}, ${Number(selectedMiner.longitude).toFixed(5)}`
                        : selectedMiner.position?.lat != null && selectedMiner.position?.lng != null && (selectedMiner.position.lat !== 0 || selectedMiner.position.lng !== 0)
                        ? `${Number(selectedMiner.position.lat).toFixed(5)}, ${Number(selectedMiner.position.lng).toFixed(5)}`
                        : `X:${selectedMiner.position.x.toFixed(0)} Y:${selectedMiner.position.y.toFixed(0)}`}
                    </p>
                  </div>
                  <div className="bg-[#1e293b] p-2 rounded border border-gray-700">
                    <p className="text-gray-400 flex items-center gap-1">
                      <Heart size={10} className="text-red-400" /> Pouls cardiaque
                    </p>
                    <p className="text-white font-medium">{selectedMiner.heartRate} bpm</p>
                  </div>
                  <div className="bg-[#1e293b] p-2 rounded border border-gray-700">
                    <p className="text-gray-400 flex items-center gap-1">
                      <Shield size={10} className="text-yellow-400" /> Statut T-Watch
                    </p>
                    <p
                      className={`font-bold uppercase ${
                        selectedMiner.status === 'danger'
                          ? 'text-red-500'
                          : selectedMiner.status === 'warning'
                            ? 'text-orange-500'
                            : 'text-green-500'
                      }`}
                    >
                      {selectedMiner.status === 'danger'
                        ? '⚠️ DANGER'
                        : selectedMiner.status === 'warning'
                          ? '⚠️ ALERTE'
                          : '✅ CORRECT'}
                    </p>
                  </div>
                  <div className="bg-[#1e293b] p-2 rounded border border-gray-700">
                    <p className="text-gray-400 flex items-center gap-1">
                      <Wifi size={10} className="text-blue-400" /> Connexion
                    </p>
                    <p className="text-white font-medium uppercase">
                      {selectedMiner.connectionType || 'lora'}
                    </p>
                  </div>
                  <div className="bg-[#1e293b] p-2 rounded border border-gray-700">
                    <p className="text-gray-400 flex items-center gap-1">
                      <Cloud size={10} className="text-orange-400" /> Gaz toxique
                    </p>
                    <p className="text-white font-medium">
                      {selectedMiner.toxicGasLevel !== undefined
                        ? selectedMiner.toxicGasLevel + ' ppm'
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="bg-[#1e293b] p-2 rounded border border-gray-700">
                    <p className="text-gray-400 flex items-center gap-1">
                      <Activity size={10} className="text-red-400" /> Sismicité
                    </p>
                    <p className="text-white font-medium">
                      {selectedMiner.seismicHz !== undefined
                        ? selectedMiner.seismicHz + ' Hz'
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 bg-green-500 text-white py-1.5 rounded text-xs font-medium hover:bg-green-600"
                    onClick={() => openLocalisation(selectedMiner, 'trajectoires')}
                  >
                    Voir trajectoire
                  </button>
                  <button
                    type="button"
                    className="flex-1 bg-[#334155] text-white py-1.5 rounded text-xs font-medium hover:bg-gray-600 border border-gray-700"
                    onClick={() => navigate('/miners')}
                  >
                    Voir profil
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
