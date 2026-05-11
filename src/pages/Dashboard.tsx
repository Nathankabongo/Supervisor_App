import { useState, useEffect } from 'react';
import { Users, Shield, AlertTriangle, MapPin, Wifi, Search, Heart, ArrowRight, Layers, ZoomIn, ZoomOut, Home, Thermometer, Droplets, Wind, Cloud, Volume2 } from 'lucide-react';
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
  const { miners, alerts, selectedMiner, setSelectedMiner, filters, setFilters, showTrajectories, setShowTrajectories } = useStore();
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
  const activeMiners = miners.filter(m => m.status !== 'danger').length;
  const activeAlerts = alerts.filter(a => !a.resolved).length;
  
  // Filter miners for the list
  const filteredMiners = miners.filter((miner) => {
    if (searchQuery && !miner.name.toLowerCase().includes(searchQuery.toLowerCase()) && !miner.matricule.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleMinerClick = (miner: typeof miners[0]) => {
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
            <img src={`/LOGO.png`} alt="SupervisorApp" className="h-12 w-auto" />
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
      <div className="grid grid-cols-5 gap-3">
        {/* Site Director */}
        <div className="bg-[#1e293b] rounded-lg p-3 border border-gray-700 col-span-5 md:col-span-1">
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
          <p className="text-xl font-bold text-white">{activeMiners} / {totalMiners}</p>
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
            {envConditions.length > 0 ? `Dernière MAJ: ${new Date(envConditions[0].updated_at).toLocaleTimeString('fr-FR')}` : 'Chargement...'}
          </span>
        </div>
        <div className="p-3 grid grid-cols-6 gap-2">
          {envConditions.map(env => (
            <div key={env.zone} className={`bg-[#0f172a] rounded-lg border p-2.5 ${env.status === 'warning' ? 'border-orange-500/50' : 'border-gray-700'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-white">{env.zone}</span>
                <span className={`w-2 h-2 rounded-full ${env.status === 'warning' ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Thermometer size={10} className={env.temperature > 33 ? 'text-red-400' : 'text-gray-400'} />
                    <span className="text-[9px] text-gray-400">Temp</span>
                  </div>
                  <span className={`text-[10px] font-medium ${env.temperature > 33 ? 'text-red-400' : 'text-white'}`}>{env.temperature}°C</span>
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
                    <Cloud size={10} className={env.co2_level > 500 ? 'text-orange-400' : 'text-gray-400'} />
                    <span className="text-[9px] text-gray-400">CO₂</span>
                  </div>
                  <span className={`text-[10px] ${env.co2_level > 500 ? 'text-orange-400 font-medium' : 'text-white'}`}>{env.co2_level}ppm</span>
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
                    <Cloud size={10} className={env.dust_level > 1.5 ? 'text-orange-400' : 'text-gray-400'} />
                    <span className="text-[9px] text-gray-400">Poussière</span>
                  </div>
                  <span className={`text-[10px] ${env.dust_level > 1.5 ? 'text-orange-400 font-medium' : 'text-white'}`}>{env.dust_level}mg/m³</span>
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
            <div className="col-span-6 text-center py-4 text-gray-500 text-xs">Aucune donnée environnementale disponible</div>
          )}
        </div>
      </div>

      {/* Main Content: Map and Miners List */}
      <div className="grid grid-cols-3 gap-4">
        {/* Mining Map */}
        <div className="col-span-2 bg-[#1e293b] rounded-lg border border-gray-700 overflow-hidden">
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
                  miners={miners}
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
              <button className="p-1.5 bg-[#1e293b] rounded text-gray-300 hover:bg-[#334155] border border-gray-700">
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
            <button className="px-3 py-1 bg-green-500 text-white rounded text-xs font-medium hover:bg-green-600 self-end">
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

        {/* Miners List */}
        <div className="bg-[#1e293b] rounded-lg border border-gray-700 flex flex-col">
          <div className="p-3 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-white mb-2">MINEURS PRÉSENTS ({filteredMiners.length})</h3>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un mineur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0f172a] border border-gray-700 rounded-lg pl-8 pr-2 py-1.5 text-white text-xs placeholder-gray-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-[280px]">
            {filteredMiners.slice(0, 6).map((miner) => (
              <div
                key={miner.id}
                onClick={() => handleMinerClick(miner)}
                className={`p-2 rounded border cursor-pointer transition-colors ${
                  selectedMiner?.id === miner.id
                    ? 'bg-green-500/20 border-green-500'
                    : 'bg-[#334155] border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="text-white font-medium text-xs">{miner.name}</p>
                    <p className="text-[10px] text-gray-400">{miner.matricule}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart size={12} className="text-gray-400" />
                    <span className="text-[10px] text-gray-400">{miner.heartRate}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-gray-400">{miner.role}</span>
                  <span className="text-gray-400">{miner.currentZone}</span>
                </div>
                {miner.status === 'danger' && (
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-red-500">
                    <AlertTriangle size={10} />
                    <span>Alerte: Danger détecté</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-gray-700">
            <button className="w-full flex items-center justify-center gap-1 text-green-500 text-xs font-medium hover:text-green-400">
              Voir tous les mineurs
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Selected Miner Detail */}
      {selectedMiner && (
        <div className="bg-[#1e293b] rounded-lg border border-gray-700 p-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Trajectory Info */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">TRAJECTOIRE - {selectedMiner.name.toUpperCase()} ({selectedMiner.matricule})</h3>
              <div className="bg-[#334155] rounded-lg p-3 mb-3">
                <p className="text-xs text-gray-400 mb-2">Parcours du jour</p>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <p className="text-gray-400">Date</p>
                    <p className="text-white font-medium">{new Date().toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Distance</p>
                    <p className="text-white font-medium">2.45 km</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Temps actif</p>
                    <p className="text-white font-medium">5h 32m</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Zones</p>
                    <p className="text-white font-medium">4</p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-1 mb-3">
                <button className="px-3 py-1 bg-green-500 text-white rounded text-xs font-medium">Carte</button>
                <button className="px-3 py-1 bg-[#334155] text-gray-300 rounded text-xs font-medium">Chronologie</button>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="text-gray-500 w-16">09:00</span>
                  <span>Entrée site</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="text-gray-500 w-16">09:15</span>
                  <span>Galerie A1</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="text-gray-500 w-16">10:30</span>
                  <span>Galerie A2</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="text-gray-500 w-16">11:45</span>
                  <span>Galerie B1</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="text-gray-500 w-16">13:00</span>
                  <span>Galerie B3</span>
                </div>
              </div>
            </div>

            {/* Miner Detail */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">DÉTAIL MINEUR SÉLECTIONNÉ</h3>
              <div className="bg-[#334155] rounded-lg p-3 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
                    {selectedMiner.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{selectedMiner.name}</p>
                    <p className="text-xs text-gray-400">{selectedMiner.matricule} • {selectedMiner.role}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-400">Zone actuelle</p>
                    <p className="text-white font-medium">{selectedMiner.currentZone}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Galerie</p>
                    <p className="text-white font-medium">{selectedMiner.currentGallery}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Niveau</p>
                    <p className="text-white font-medium">-120m</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Depuis</p>
                    <p className="text-white font-medium">09:15</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Fréquence cardiaque</p>
                    <p className="text-white font-medium">{selectedMiner.heartRate} bpm</p>
                  </div>
                  <div>
                    <p className="text-gray-400">État</p>
                    <p className="text-white font-medium">Actif</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 bg-green-500 text-white py-1.5 rounded text-xs font-medium hover:bg-green-600">
                    Voir trajectoire
                  </button>
                  <button className="flex-1 bg-[#334155] text-white py-1.5 rounded text-xs font-medium hover:bg-gray-600 border border-gray-700">
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
