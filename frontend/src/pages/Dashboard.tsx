import { useState, useEffect } from 'react';
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
  Layers,
  ZoomIn,
  ZoomOut,
  Home,
  Thermometer,
  Droplets,
  Wind,
  Cloud,
  Volume2,
  Watch,
  Activity,
  Navigation,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import apiService from '../services/api';
import MiningMap from '../components/map/MiningMap';
import MinerIcon from '../components/map/MinerIcon';
import TrajectoryLayer from '../components/map/TrajectoryLayer';

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
  const {
    miners,
    alerts,
    selectedMiner,
    setSelectedMiner,
    filters,
    setFilters,
    showTrajectories,
    setShowTrajectories,
  } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [zoom, setZoom] = useState(1);
  const [viewMode, setViewMode] = useState<'zone' | 'gallery' | 'level'>('zone');
  const [envConditions, setEnvConditions] = useState<EnvCondition[]>([]);

  useEffect(() => {
    const fetchEnv = async () => {
      try {
        const res = await apiService.getEnvConditions();
        if (res.conditions) setEnvConditions(res.conditions);
      } catch {}
    };
    fetchEnv();
    const interval = setInterval(fetchEnv, 30000);
    return () => clearInterval(interval);
  }, []);

  const totalMiners = miners.length;
  const activeMiners = miners.filter((m) => m.status !== 'danger').length;
  const activeAlerts = alerts.filter((a) => !a.resolved).length;
  const selectedMinerAlert = selectedMiner ? alerts.find((a) => a.minerId === selectedMiner.id && !a.resolved) : null;

  // Filter miners for the list
  const filteredMiners = miners.filter((miner) => {
    if (
      searchQuery &&
      !miner.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !miner.matricule.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  // Sort and select exactly 3 miners prioritizing alert status and displacement activity
  const activeTrackedMiners = [...filteredMiners]
    .sort((a, b) => {
      if (a.status === 'danger' && b.status !== 'danger') return -1;
      if (b.status === 'danger' && a.status !== 'danger') return 1;
      if (a.status === 'warning' && b.status !== 'warning') return -1;
      if (b.status === 'warning' && a.status !== 'warning') return 1;
      return b.activityLevel - a.activityLevel;
    })
    .slice(0, 3);

  // Helper to calculate total displacement distance
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

  const handleMinerClick = (miner: (typeof miners)[0]) => {
    setSelectedMiner(miner);
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => setZoom(1);
  const handleViewModeChange = (mode: 'zone' | 'gallery' | 'level') => setViewMode(mode);

  return (
    <div className="p-4 space-y-4 bg-[#0f172a] min-h-screen">
      {/* Header with Logo */}
      <div className="bg-[#1e293b] rounded-lg border border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={`/Logo-with-text.png`} alt="SupervisorApp" className="h-12 w-auto" />
            <div>
              <h1 className="text-xl font-bold text-white">Tableau de Bord</h1>
              <p className="text-sm text-gray-400">Vue d'ensemble du site minier</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 rounded text-green-400 text-xs">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Système actif
            </div>
            <div className="flex items-center gap-1 px-3 py-1.5 bg-[#0b1a2a] rounded text-gray-400 text-xs border border-gray-700">
              <Wifi size={14} />
              LoRa: 98%
            </div>
          </div>
        </div>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Site Director */}
        <div className="bg-[#1e293b] rounded-lg p-3 border border-gray-700 col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
              <Shield className="text-green-500" size={20} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400">Directeur du site</p>
              <h3 className="text-sm font-bold text-white">Jean Dupont</h3>
              <p className="text-xs text-gray-400">+33 6 12 34 56 78</p>
            </div>
          </div>
        </div>

        {/* Miners Present */}
        <div className="bg-[#1e293b] rounded-lg p-3 border border-gray-700">
          <div className="flex items-center justify-between mb-1">
            <Users className="text-green-500" size={18} />
            <span className="text-[10px] text-gray-400">Actifs maintenant</span>
          </div>
          <p className="text-xl font-bold text-white">
            {activeMiners} / {totalMiners}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Mineurs présents</p>
        </div>

        {/* Security Status */}
        <div className="bg-[#1e293b] rounded-lg p-3 border border-gray-700">
          <div className="flex items-center justify-between mb-1">
            <Shield className="text-green-500" size={18} />
            <span className="text-[10px] text-gray-400">Aucun danger</span>
          </div>
          <p className="text-xl font-bold text-green-500">NORMAL</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Statut sécurité</p>
        </div>

        {/* Active Alerts */}
        <div className="bg-[#1e293b] rounded-lg p-3 border border-gray-700">
          <div className="flex items-center justify-between mb-1">
            <AlertTriangle className="text-red-500" size={18} />
            <span className="text-[10px] text-red-500">Voir les détails</span>
          </div>
          <p className="text-xl font-bold text-red-500">{activeAlerts}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Alertes actives</p>
        </div>

        {/* Active Zones */}
        <div className="bg-[#1e293b] rounded-lg p-3 border border-gray-700">
          <div className="flex items-center justify-between mb-1">
            <MapPin className="text-green-500" size={18} />
            <span className="text-[10px] text-gray-400">Zones opérationnelles</span>
          </div>
          <p className="text-xl font-bold text-white">5 / 8</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Zones actives</p>
        </div>

        {/* LoRa Gateways */}
        <div className="bg-[#1e293b] rounded-lg p-3 border border-gray-700">
          <div className="flex items-center justify-between mb-1">
            <Wifi className="text-green-500" size={18} />
            <span className="text-[10px] text-green-400">En ligne</span>
          </div>
          <p className="text-xl font-bold text-white">6</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Passerelles LoRa</p>
        </div>
      </div>

      {/* Conditions Environnementales */}
      <div className="bg-[#1e293b] rounded-lg border border-gray-700">
        <div className="p-3 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Thermometer size={16} className="text-orange-400" />
            CONDITIONS ENVIRONNEMENTALES
          </h3>
          <span className="text-[10px] text-gray-400">
            {envConditions.length > 0
              ? `Dernière MAJ: ${new Date(envConditions[0].updated_at).toLocaleTimeString('fr-FR')}`
              : 'Chargement...'}
          </span>
        </div>
        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {envConditions.map((env) => (
            <div
              key={env.zone}
              className={`bg-[#0f172a] rounded-lg border p-2.5 ${env.status === 'warning' ? 'border-orange-500/50' : 'border-gray-700'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-white">{env.zone}</span>
                <span
                  className={`w-2 h-2 rounded-full ${env.status === 'warning' ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Thermometer
                      size={10}
                      className={env.temperature > 33 ? 'text-red-400' : 'text-gray-400'}
                    />
                    <span className="text-[9px] text-gray-400">Temp</span>
                  </div>
                  <span
                    className={`text-[10px] font-medium ${env.temperature > 33 ? 'text-red-400' : 'text-white'}`}
                  >
                    {env.temperature}°C
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Droplets size={10} className="text-blue-400" />
                    <span className="text-[9px] text-gray-400">Hum</span>
                  </div>
                  <span className="text-[10px] text-white">{env.humidity}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Cloud
                      size={10}
                      className={env.co2_level > 500 ? 'text-orange-400' : 'text-gray-400'}
                    />
                    <span className="text-[9px] text-gray-400">CO₂</span>
                  </div>
                  <span
                    className={`text-[10px] ${env.co2_level > 500 ? 'text-orange-400 font-medium' : 'text-white'}`}
                  >
                    {env.co2_level}ppm
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Wind size={10} className="text-cyan-400" />
                    <span className="text-[9px] text-gray-400">Vent</span>
                  </div>
                  <span className="text-[10px] text-white">{env.wind_speed}m/s</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Volume2 size={10} className="text-gray-400" />
                    <span className="text-[9px] text-gray-400">Bruit</span>
                  </div>
                  <span className="text-[10px] text-white">{env.noise_level}dB</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Cloud
                      size={10}
                      className={env.dust_level > 1.5 ? 'text-orange-400' : 'text-gray-400'}
                    />
                    <span className="text-[9px] text-gray-400">Poussière</span>
                  </div>
                  <span
                    className={`text-[10px] ${env.dust_level > 1.5 ? 'text-orange-400 font-medium' : 'text-white'}`}
                  >
                    {env.dust_level}mg/m³
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Wind size={10} className="text-purple-400" />
                    <span className="text-[9px] text-gray-400">Pression</span>
                  </div>
                  <span className="text-[10px] text-white">{env.pressure}hPa</span>
                </div>
              </div>
            </div>
          ))}
          {envConditions.length === 0 && (
            <div className="col-span-6 text-center py-4 text-gray-500 text-xs">
              Aucune donnée environnementale disponible
            </div>
          )}
        </div>
      </div>

      {/* Main Content: Map and Miners List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Mining Map */}
        <div className="col-span-1 lg:col-span-2 bg-[#1e293b] rounded-lg border border-gray-700 overflow-hidden">
          {/* Map Controls */}
          <div className="p-3 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-xs">Vue par:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => handleViewModeChange('zone')}
                  className={`px-2 py-1 rounded text-xs font-medium ${viewMode === 'zone' ? 'bg-green-500 text-white' : 'bg-[#334155] text-gray-300 hover:bg-gray-600'}`}
                >
                  Zone
                </button>
                <button
                  onClick={() => handleViewModeChange('gallery')}
                  className={`px-2 py-1 rounded text-xs font-medium ${viewMode === 'gallery' ? 'bg-green-500 text-white' : 'bg-[#334155] text-gray-300 hover:bg-gray-600'}`}
                >
                  Galerie
                </button>
                <button
                  onClick={() => handleViewModeChange('level')}
                  className={`px-2 py-1 rounded text-xs font-medium ${viewMode === 'level' ? 'bg-green-500 text-white' : 'bg-[#334155] text-gray-300 hover:bg-gray-600'}`}
                >
                  Niveau
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-300">
              <input
                type="checkbox"
                checked={showTrajectories}
                onChange={(e) => setShowTrajectories(e.target.checked)}
                className="w-3 h-3 rounded"
              />
              Afficher trajectoires
            </label>
          </div>

          {/* Map Container */}
          <div className="relative" style={{ height: '350px' }}>
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
            >
              <svg width="1000" height="500" viewBox="0 0 1000 500" className="bg-[#0f172a]">
                <foreignObject width="1000" height="500">
                  <MiningMap width={1000} height={500} />
                </foreignObject>

                <TrajectoryLayer
                  miners={
                    selectedMiner && !activeTrackedMiners.some((m) => m.id === selectedMiner.id)
                      ? [...activeTrackedMiners, selectedMiner]
                      : activeTrackedMiners
                  }
                  showTrajectories={showTrajectories}
                  timelinePosition={100}
                />

                {miners.map((miner) => (
                  <MinerIcon
                    key={miner.id}
                    miner={miner}
                    onClick={() => handleMinerClick(miner)}
                    isSelected={selectedMiner?.id === miner.id}
                  />
                ))}
              </svg>
            </div>

            {/* Zoom Controls */}
            <div className="absolute right-3 top-3 flex flex-col gap-1">
              <button
                onClick={handleZoomIn}
                className="p-1.5 bg-[#1e293b] rounded text-gray-300 hover:bg-[#334155] border border-gray-700"
              >
                <ZoomIn size={16} />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-1.5 bg-[#1e293b] rounded text-gray-300 hover:bg-[#334155] border border-gray-700"
              >
                <ZoomOut size={16} />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-1.5 bg-[#1e293b] rounded text-gray-300 hover:bg-[#334155] border border-gray-700"
              >
                <Home size={16} />
              </button>
              <button className="p-1.5 bg-[#1e293b] rounded text-gray-300 hover:bg-[#334155] border border-gray-700" onClick={() => alert('Fonctionnalité en cours de développement')}>
                <Layers size={16} />
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          <div className="p-3 border-t border-gray-700 flex gap-3">
            <div className="flex-1">
              <label className="block text-[10px] text-gray-400 mb-0.5">Zone</label>
              <select
                value={filters.zone}
                onChange={(e) => setFilters({ zone: e.target.value })}
                className="w-full bg-[#0f172a] border border-gray-700 rounded px-2 py-1 text-white text-xs"
              >
                <option value="all">Toutes les zones</option>
                <option value="ZONE A">Zone A</option>
                <option value="ZONE B">Zone B</option>
                <option value="ZONE C">Zone C</option>
                <option value="ZONE D">Zone D</option>
                <option value="ZONE E">Zone E</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-[10px] text-gray-400 mb-0.5">Statut</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ status: e.target.value })}
                className="w-full bg-[#0f172a] border border-gray-700 rounded px-2 py-1 text-white text-xs"
              >
                <option value="all">Tous</option>
                <option value="safe">Safe</option>
                <option value="warning">Warning</option>
                <option value="danger">Danger</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-[10px] text-gray-400 mb-0.5">Fonction</label>
              <select
                value={filters.role}
                onChange={(e) => setFilters({ role: e.target.value })}
                className="w-full bg-[#0f172a] border border-gray-700 rounded px-2 py-1 text-white text-xs"
              >
                <option value="all">Tous</option>
                <option value="Foreur">Foreur</option>
                <option value="Opérateur">Opérateur</option>
                <option value="Technicien">Technicien</option>
                <option value="Ingénieur">Ingénieur</option>
                <option value="Sécurité">Sécurité</option>
              </select>
            </div>
            <button className="px-3 py-1 bg-green-500 text-white rounded text-xs font-medium hover:bg-green-600 self-end" onClick={() => alert('Fonctionnalité en cours de développement')}>
              Appliquer
            </button>
          </div>

          {/* Legend */}
          <div className="p-3 border-t border-gray-700 flex gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-gray-300">Mineur actif</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-0.5 bg-green-500"></div>
              <span className="text-gray-300">Déplacement</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-0.5 bg-blue-500"></div>
              <span className="text-gray-300">Trajectoire</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <span className="text-gray-300">Avertissement</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-gray-300">Danger</span>
            </div>
          </div>
        </div>

        {/* Live Displacement Track - Max 3 */}
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
              const speed = isMoving ? (miner.activityLevel * 0.22).toFixed(1) : "0.0";
              const distance = getMinerDistance(miner);

              return (
                <div
                  key={miner.id}
                  onClick={() => handleMinerClick(miner)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all duration-300 relative group ${
                    isSelected
                      ? 'bg-green-500/10 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.15)]'
                      : 'bg-[#0f172a]/60 border-gray-700 hover:border-gray-500 hover:bg-[#334155]/20'
                  }`}
                >
                  {/* Top Header Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {/* Custom Avatar with Pulsing Status */}
                      <div className="relative shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold transition-all duration-300 ${
                          miner.status === 'danger' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]' :
                          miner.status === 'warning' ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]' :
                          'bg-green-500'
                        }`}>
                          {miner.name.split(' ').map((n) => n[0]).join('')}
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

                    {/* Displacement Status Badge */}
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

                  {/* Telemetry Stats Grid */}
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

                  {/* Vitals & Action Footer */}
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-700/40">
                    <div className="flex items-center gap-1 bg-red-500/5 px-2 py-0.5 rounded-full border border-red-500/10 shrink-0">
                      <Heart
                        size={10}
                        className="text-red-500 animate-heartbeat"
                        style={{ animationDuration: `${60 / miner.heartRate}s` }}
                      />
                      <span className="text-[10px] font-mono font-bold text-red-400">{miner.heartRate} bpm</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMinerClick(miner);
                      }}
                      className={`px-3 py-1 rounded text-[10px] font-semibold transition-all duration-300 ${
                        isSelected
                          ? 'bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                          : 'bg-[#334155]/60 hover:bg-[#334155] text-gray-300 border border-gray-700/50'
                      }`}
                    >
                      {isSelected ? 'Suivi Actif' : 'Tracer'}
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
            <button className="w-full flex items-center justify-center gap-1 text-green-500 text-xs font-semibold hover:text-green-400 transition-colors" onClick={() => alert('Fonctionnalité en cours de développement')}>
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
            {/* Trajectory Info */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Activity size={16} className="text-green-400" />
                DÉPLACEMENT (GPS T-WATCH) - {selectedMiner.name.toUpperCase()}
              </h3>
              <div className="bg-[#334155] rounded-lg p-3 mb-3 border border-blue-500/30">
                <p className="text-xs text-blue-400 mb-2 flex items-center gap-1"><Watch size={12}/> Suivi T-Watch du jour</p>
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
                        ? Math.round((selectedMiner.trajectory[selectedMiner.trajectory.length - 1].timestamp - selectedMiner.trajectory[0].timestamp) / 60000)
                        : 0} m
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Zones</p>
                    <p className="text-white font-medium">1</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-1 mb-3">
                <button className="px-3 py-1 bg-green-500 text-white rounded text-xs font-medium" onClick={() => alert('Fonctionnalité en cours de développement')}>
                  Carte
                </button>
                <button className="px-3 py-1 bg-[#334155] text-gray-300 rounded text-xs font-medium" onClick={() => alert('Fonctionnalité en cours de développement')}>
                  Chronologie
                </button>
              </div>

              <div className="space-y-1 text-xs">
                {selectedMiner.trajectory?.slice(-5).map((pos, i) => (
                  <div key={i} className="flex items-center gap-2 text-gray-300">
                    <span className="text-gray-500 w-16">
                      {new Date(pos.timestamp).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    <span>X: {pos.x.toFixed(1)}, Y: {pos.y.toFixed(1)}</span>
                  </div>
                ))}
                {(!selectedMiner.trajectory || selectedMiner.trajectory.length === 0) && (
                  <div className="text-gray-500 text-center py-2">
                    Aucune trajectoire récente
                  </div>
                )}
              </div>
            </div>

            {/* Miner Detail */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Watch size={16} className="text-blue-400" />
                DONNÉES EN DIRECT T-WATCH
              </h3>
              <div className="bg-[#334155] rounded-lg p-3 space-y-3 border border-blue-500/30">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg transition-all duration-300 ${
                    selectedMiner.status === 'danger' ? 'bg-red-500 shadow-red-500/50' :
                    selectedMiner.status === 'warning' ? 'bg-orange-500 shadow-orange-500/50' :
                    'bg-green-500 shadow-green-500/30'
                  }`}>
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

                {/* Alarm Cause Prediction Banner */}
                {selectedMinerAlert && (
                  <div className="bg-red-950/80 border border-red-500 rounded-lg p-3 text-white space-y-1.5 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse">
                    <div className="flex items-center gap-1.5 text-red-400 font-extrabold text-[10px] uppercase tracking-wider">
                      <AlertTriangle size={12} />
                      DANGER IMMÉDIAT
                    </div>
                    <p className="text-xs font-bold text-slate-100">{selectedMinerAlert.message}</p>
                    {selectedMinerAlert.predictedCause && (
                      <div className="text-[10px] bg-black/40 border border-red-500/25 text-red-300 p-2 rounded mt-1 leading-relaxed">
                        <span className="font-semibold text-red-400 text-[9px] uppercase tracking-wide block mb-0.5">Cause d'incident prédite (IA) :</span>
                        {selectedMinerAlert.predictedCause}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#1e293b] p-2 rounded border border-gray-700">
                    <p className="text-gray-400 flex items-center gap-1"><MapPin size={10} className="text-cyan-400"/> Zone d'affectation</p>
                    <p className="text-white font-medium">{selectedMiner.currentZone}</p>
                  </div>
                  <div className="bg-[#1e293b] p-2 rounded border border-gray-700">
                    <p className="text-gray-400 flex items-center gap-1"><Watch size={10} className="text-blue-400"/> Galerie de travail</p>
                    <p className="text-white font-medium">{selectedMiner.currentGallery}</p>
                  </div>
                  <div className="bg-[#1e293b] p-2 rounded border border-gray-700">
                    <p className="text-gray-400 flex items-center gap-1"><User size={10} className="text-green-400"/> Travail / Poste</p>
                    <p className="text-white font-medium">{selectedMiner.role}</p>
                  </div>
                  <div className="bg-[#1e293b] p-2 rounded border border-gray-700">
                    <p className="text-gray-400 flex items-center gap-1"><Navigation size={10} className="text-purple-400"/> Position GPS 2D</p>
                    <p className="text-white font-mono font-medium truncate">X: {selectedMiner.position.x.toFixed(1)}, Y: {selectedMiner.position.y.toFixed(1)}</p>
                  </div>
                  <div className="bg-[#1e293b] p-2 rounded border border-gray-700">
                    <p className="text-gray-400 flex items-center gap-1"><Heart size={10} className="text-red-400"/> Pouls cardiaque</p>
                    <p className="text-white font-medium">{selectedMiner.heartRate} bpm</p>
                  </div>
                  <div className="bg-[#1e293b] p-2 rounded border border-gray-700">
                    <p className="text-gray-400 flex items-center gap-1"><Shield size={10} className="text-yellow-400"/> Statut T-Watch</p>
                    <p className={`font-bold uppercase ${selectedMiner.status === 'danger' ? 'text-red-500' : selectedMiner.status === 'warning' ? 'text-orange-500' : 'text-green-500'}`}>
                      {selectedMiner.status === 'danger' ? '⚠️ DANGER' : selectedMiner.status === 'warning' ? '⚠️ ALERTE' : '✅ CORRECT'}
                    </p>
                  </div>
                  <div className="bg-[#1e293b] p-2 rounded border border-gray-700">
                    <p className="text-gray-400 flex items-center gap-1"><Wifi size={10} className="text-blue-400"/> Connexion</p>
                    <p className="text-white font-medium uppercase">{selectedMiner.connectionType || 'lora'}</p>
                  </div>
                  <div className="bg-[#1e293b] p-2 rounded border border-gray-700">
                    <p className="text-gray-400 flex items-center gap-1"><Cloud size={10} className="text-orange-400"/> Gaz toxique</p>
                    <p className="text-white font-medium">{selectedMiner.toxicGasLevel !== undefined ? selectedMiner.toxicGasLevel + ' ppm' : 'N/A'}</p>
                  </div>
                  <div className="bg-[#1e293b] p-2 rounded border border-gray-700">
                    <p className="text-gray-400 flex items-center gap-1"><Activity size={10} className="text-red-400"/> Sismicité</p>
                    <p className="text-white font-medium">{selectedMiner.seismicHz !== undefined ? selectedMiner.seismicHz + ' Hz' : 'N/A'}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 bg-green-500 text-white py-1.5 rounded text-xs font-medium hover:bg-green-600" onClick={() => alert('Fonctionnalité en cours de développement')}>
                    Voir trajectoire
                  </button>
                  <button className="flex-1 bg-[#334155] text-white py-1.5 rounded text-xs font-medium hover:bg-gray-600 border border-gray-700" onClick={() => alert('Fonctionnalité en cours de développement')}>
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
