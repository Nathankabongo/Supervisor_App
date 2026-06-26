import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import MiningMap from '../components/map/MiningMap';
import TrajectoryLayer from '../components/map/TrajectoryLayer';
import MinerIcon from '../components/map/MinerIcon';
import MinerDetail from '../components/MinerDetail';
import SummaryCards from '../components/map/SummaryCards';
import MapLegend from '../components/map/MapLegend';
import MinersList from '../components/map/MinersList';
import { ZoomIn, ZoomOut, Home, Eye, EyeOff, Sun, Search, MapPin } from 'lucide-react';
import Interactive3DMap from '../components/map/Interactive3DMap';
import SatelliteMap from '../components/map/SatelliteMap';

export default function MapView() {
  const {
    miners,
    selectedMiner,
    setSelectedMiner,
    filters,
    setFilters,
    showTrajectories,
    timelinePosition,
    alerts,
  } = useStore();

  const [zoom, setZoom] = useState(1);
  const [showMiners, setShowMiners] = useState(true);
  const [showGateways, setShowGateways] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const [viewBy, setViewBy] = useState<'zone' | 'gallery' | 'level'>('zone');
  const [mapMode, setMapMode] = useState<'satellite' | 'industrial' | 'isometric' | 'timeline'>('satellite');
  const [selectedSite, setSelectedSite] = useState<
    'all' | 'open_pit' | 'underground' | 'galleries'
  >('all');
  const [gisConfig, setGisConfig] = useState<any>(null);

  useEffect(() => {
    import('../services/api').then(({ default: apiService }) => {
      apiService.getGisConfig().then((data) => {
        setGisConfig(data);
      }).catch(console.error);
    });
  }, []);

  // Filter miners based on current filters
  const filteredMiners = miners.filter((miner) => {
    if (filters.zone !== 'all' && miner.currentZone !== filters.zone) return false;
    if (filters.status !== 'all' && miner.status !== filters.status) return false;
    if (filters.role !== 'all' && miner.role !== filters.role) return false;
    if (
      filters.searchQuery &&
      !miner.name.toLowerCase().includes(filters.searchQuery.toLowerCase()) &&
      !miner.matricule.toLowerCase().includes(filters.searchQuery.toLowerCase())
    )
      return false;

    // Filter based on selected site
    if (selectedSite === 'open_pit') {
      const isSurfaceZone = ['ZONE A', 'ZONE B', 'ZONE C'].includes(miner.currentZone);
      if (!isSurfaceZone) return false;
    } else if (selectedSite === 'underground' || selectedSite === 'galleries') {
      const isUndergroundZone = ['ZONE D', 'ZONE E', 'ZONE F'].includes(miner.currentZone);
      if (!isUndergroundZone) return false;
    }

    return true;
  });

  const gateways = [
    { id: 'GW-01', x: 165, y: 140, zone: 'ZONE A' },
    { id: 'GW-02', x: 425, y: 140, zone: 'ZONE B' },
    { id: 'GW-03', x: 675, y: 140, zone: 'ZONE C' },
    { id: 'GW-04', x: 165, y: 370, zone: 'ZONE D' },
    { id: 'GW-05', x: 425, y: 400, zone: 'ZONE E' },
    { id: 'GW-06', x: 675, y: 400, zone: 'ZONE F' },
  ];

  const activeAlerts = alerts.filter((a) => !a.resolved).length;
  const dangerMiners = miners.filter((m) => m.status === 'danger').length;
  const securityStatus = dangerMiners > 0 ? 'danger' : activeAlerts > 0 ? 'warning' : 'normal';

  const handleMinerClick = (miner: (typeof miners)[0]) => {
    setSelectedMiner(miner);
  };

  const handleZoneClick = (zoneId: string) => {
    setFilters({ zone: zoneId });
  };

  const handleZoneHover = (_zoneId: string | null) => {
    // Optionnel: ajouter une logique spécifique au survol de zone
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => setZoom(1);

  return (
    <div className="flex h-full bg-[#0b1a2a]">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#1e293b] border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={`/Logo-with-text.png`} alt="SupervisorApp" className="h-10 w-auto" />
              <h1 className="text-xl font-semibold text-white">Vue Globale du Site - Temps Réel</h1>
              <p className="text-sm text-gray-400 mt-1">
                Surveillance en temps réel des mineurs et des zones
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Sun
                size={20}
                className="text-gray-400 cursor-pointer hover:text-white transition-colors"
              />
              <select
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value as any)}
                className="bg-[#0b1a2a] border border-gray-700 rounded-lg px-4 py-2 text-white text-sm hover:border-gray-600 transition-colors focus:outline-none cursor-pointer"
              >
                <option value="all">Site Principal - Tout</option>
                <option value="open_pit">Site A - Mine à ciel ouvert</option>
                <option value="underground">Site A - Mine souterraine</option>
                <option value="galleries">Structure des galeries</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Summary Cards */}
          <SummaryCards
            minersCount={miners.length}
            totalMiners={150}
            securityStatus={securityStatus}
            alertsCount={activeAlerts}
            activeZones={6}
            totalZones={8}
            gatewaysCount={gateways.length}
          />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Map & Filters Column */}
            <div className="col-span-1 lg:col-span-9 space-y-4">
              {/* Horizontal Filter Bar */}
              <div className="bg-[#1e293b] rounded-xl p-4 border border-gray-700 flex flex-wrap gap-4 items-end">
                {/* Search query input */}
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs text-gray-400 block mb-1">Rechercher un mineur</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Nom, matricule..."
                      value={filters.searchQuery || ''}
                      onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                      className="w-full bg-[#0b1a2a] border border-gray-700 rounded-lg pl-9 pr-3 py-1.5 text-white text-xs placeholder-gray-500 focus:border-green-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Zone Filter */}
                <div className="w-44">
                  <label className="text-xs text-gray-400 block mb-1">Zone</label>
                  <select
                    value={filters.zone}
                    onChange={(e) => setFilters({ ...filters, zone: e.target.value })}
                    className="w-full bg-[#0b1a2a] border border-gray-700 rounded-lg px-3 py-1.5 text-white text-xs focus:border-green-500 focus:outline-none cursor-pointer"
                  >
                    <option value="all">Toutes les zones</option>
                    {gisConfig && gisConfig.zones && gisConfig.zones.map((zone: any) => (
                      <option key={zone.name} value={zone.name}>{zone.name}</option>
                    ))}
                    {!gisConfig && (
                      <>
                        <option value="ZONE A">ZONE A - Extraction</option>
                        <option value="ZONE B">ZONE B - Transport</option>
                        <option value="ZONE C">ZONE C - Raffinerie</option>
                        <option value="ZONE D">ZONE D - Stockage</option>
                        <option value="ZONE E">ZONE E - Maintenance</option>
                        <option value="ZONE F">ZONE F - Services</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="w-40">
                  <label className="text-xs text-gray-400 block mb-1">Statut de sécurité</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="w-full bg-[#0b1a2a] border border-gray-700 rounded-lg px-3 py-1.5 text-white text-xs focus:border-green-500 focus:outline-none cursor-pointer"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="safe">Normal (Sécurité)</option>
                    <option value="warning">Avertissement</option>
                    <option value="danger">Danger</option>
                  </select>
                </div>

                {/* Role Filter */}
                <div className="w-40">
                  <label className="text-xs text-gray-400 block mb-1">Fonction</label>
                  <select
                    value={filters.role}
                    onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                    className="w-full bg-[#0b1a2a] border border-gray-700 rounded-lg px-3 py-1.5 text-white text-xs focus:border-green-500 focus:outline-none cursor-pointer"
                  >
                    <option value="all">Toutes les fonctions</option>
                    <option value="Creuseur">Creuseur</option>
                    <option value="Transporteur">Transporteur</option>
                    <option value="Technicien">Technicien</option>
                    <option value="Superviseur">Superviseur</option>
                    <option value="Médecin">Médecin</option>
                  </select>
                </div>

                {/* Reset button */}
                <button
                  onClick={() => setFilters({ zone: 'all', status: 'all', role: 'all', searchQuery: '' })}
                  className="bg-[#334155] hover:bg-gray-600 border border-gray-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0"
                >
                  Réinitialiser
                </button>
              </div>

              <div className="bg-[#1e293b] rounded-xl border border-gray-700 overflow-hidden">
                {/* Map View Controls */}
                <div className="px-4 py-3 border-b border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {mapMode === 'industrial' ? (
                      <>
                        <span className="text-sm text-gray-400">Vue par:</span>
                        <button
                          onClick={() => setViewBy('zone')}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            viewBy === 'zone'
                              ? 'bg-blue-600 text-white'
                              : 'bg-[#0b1a2a] text-gray-400 hover:text-white'
                          }`}
                        >
                          Zone
                        </button>
                        <button
                          onClick={() => setViewBy('gallery')}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            viewBy === 'gallery'
                              ? 'bg-blue-600 text-white'
                              : 'bg-[#0b1a2a] text-gray-400 hover:text-white'
                          }`}
                        >
                          Galerie
                        </button>
                        <button
                          onClick={() => setViewBy('level')}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            viewBy === 'level'
                              ? 'bg-blue-600 text-white'
                              : 'bg-[#0b1a2a] text-gray-400 hover:text-white'
                          }`}
                        >
                          Niveau
                        </button>
                      </>
                    ) : mapMode === 'satellite' ? (
                      <span className="text-sm font-semibold text-green-400 flex items-center gap-1.5">
                        🛰️ Vue Satellite (Kolwezi, RDC)
                      </span>
                    ) : mapMode === 'isometric' ? (
                      <span className="text-sm font-semibold text-cyan-400">
                        📐 Vue 3D Isométrique
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-purple-400">
                        📍 Traçabilité & Chronologie
                      </span>
                    )}
                  </div>

                  {/* Mode Selector */}
                  <div className="flex items-center bg-[#0b1a2a] p-1 rounded-lg border border-gray-700 flex-wrap gap-1">
                    <button
                      onClick={() => setMapMode('satellite')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        mapMode === 'satellite' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      🛰️ Satellite
                    </button>
                    <button
                      onClick={() => setMapMode('industrial')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        mapMode === 'industrial' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      🏢 Industrielle
                    </button>
                    <button
                      onClick={() => setMapMode('isometric')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        mapMode === 'isometric' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      📐 Isométrique
                    </button>
                    <button
                      onClick={() => setMapMode('timeline')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        mapMode === 'timeline' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      📍 Parcours
                    </button>
                  </div>
                </div>

                {mapMode === 'satellite' && (
                  <SatelliteMap
                    miners={filteredMiners}
                    selectedMiner={selectedMiner}
                    onMinerClick={handleMinerClick}
                  />
                )}

                {mapMode === 'isometric' && (
                  <Interactive3DMap
                    miners={filteredMiners}
                    selectedMiner={selectedMiner}
                    onMinerClick={handleMinerClick}
                    showTrajectories={showTrajectories}
                    showAlerts={showAlerts}
                    showGateways={showGateways}
                    gateways={gateways}
                    selectedSite={selectedSite}
                  />
                )}

                {mapMode === 'timeline' && (
                  <div className="bg-[#0b1a2a] p-6 rounded-xl border border-gray-800 text-gray-300 min-h-[600px] flex flex-col">
                    {selectedMiner ? (
                      <div>
                        <div className="flex items-center gap-4 border-b border-gray-800 pb-4 mb-6">
                          <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 text-lg font-bold">
                            {selectedMiner.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-white">{selectedMiner.name}</h3>
                            <p className="text-xs text-gray-400">{selectedMiner.matricule} • {selectedMiner.role}</p>
                          </div>
                        </div>

                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Fil d'actualité des déplacements</h4>

                        {selectedMiner.trajectory && selectedMiner.trajectory.length > 0 ? (
                          <div className="relative pl-6 border-l-2 border-slate-700 space-y-6 ml-3">
                            {(() => {
                              const events: { zone: string; time: string; timestamp: number }[] = [];
                              let currentZone = '';
                              
                              const getZoneName = (x: number, y: number) => {
                                if (y < 250) {
                                  if (x < 333) return 'ZONE A - Extraction';
                                  if (x < 666) return 'ZONE B - Transport';
                                  return 'ZONE C - Raffinerie';
                                } else {
                                  if (x < 333) return 'ZONE D - Stockage';
                                  if (x < 666) return 'ZONE E - Maintenance';
                                  return 'ZONE F - Services';
                                }
                              };

                              selectedMiner.trajectory.forEach((point) => {
                                const zoneName = getZoneName(point.x, point.y);
                                if (zoneName !== currentZone) {
                                  events.push({
                                    zone: zoneName,
                                    time: new Date(point.timestamp).toLocaleTimeString('fr-FR', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      second: '2-digit'
                                    }),
                                    timestamp: point.timestamp
                                  });
                                  currentZone = zoneName;
                                }
                              });

                              return events.map((event, i, arr) => {
                                let durationStr = '';
                                if (i < arr.length - 1) {
                                  const durationMs = arr[i+1].timestamp - event.timestamp;
                                  const durationMin = Math.round(durationMs / 60000);
                                  durationStr = durationMin > 0 ? `${durationMin} min` : '< 1 min';
                                } else {
                                  durationStr = 'Actuel';
                                }

                                return (
                                  <div key={i} className="relative">
                                    <div className={`absolute -left-[30px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-[#0b1a2a] ${i === arr.length - 1 ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`} />
                                    
                                    <div className="bg-[#1e293b] p-3 rounded-lg border border-gray-700/60 max-w-md">
                                      <div className="flex items-center justify-between gap-4">
                                        <span className="text-white text-xs font-bold">{event.zone}</span>
                                        <span className="text-[10px] text-gray-400 font-mono">{event.time}</span>
                                      </div>
                                      <p className="text-[10px] text-gray-500 mt-1">
                                        {i === 0 ? 'Point de départ / Entrée' : 'Changement de zone détecté'}
                                        {durationStr && ` • Durée : ${durationStr}`}
                                      </p>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 py-6 text-center">Aucune donnée de trajectoire disponible pour ce mineur.</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                        <MapPin size={48} className="text-gray-600 mb-3" />
                        <p className="text-sm text-gray-400">Veuillez sélectionner un mineur dans la liste pour afficher la chronologie de ses déplacements.</p>
                      </div>
                    )}
                  </div>
                )}

                {mapMode === 'industrial' && (
                  /* Map Container */
                  <div
                    className="relative bg-[#0b1a2a] overflow-hidden"
                    style={{ height: '600px' }}
                  >
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                    >
                      <svg
                        width="1000"
                        height="500"
                        viewBox="0 0 1000 500"
                        className="bg-[#0b1a2a]"
                      >
                        {/* Mining Map Background with interactivity */}
                        <foreignObject width="1000" height="500">
                          <MiningMap
                            width={1000}
                            height={500}
                            onZoneClick={handleZoneClick}
                            onZoneHover={handleZoneHover}
                            viewMode={viewBy}
                          />
                        </foreignObject>

                        {/* Alert Zones */}
                        {showAlerts && dangerMiners > 0 && (
                          <circle
                            cx={miners.find((m) => m.status === 'danger')?.position.x || 500}
                            cy={miners.find((m) => m.status === 'danger')?.position.y || 250}
                            r={60}
                            fill="rgba(239, 68, 68, 0.2)"
                            stroke="#ef4444"
                            strokeWidth="2"
                            strokeDasharray="5,5"
                            className="animate-pulse"
                          />
                        )}

                        {/* Trajectory Layer */}
                        {showTrajectories && (
                          <TrajectoryLayer
                            miners={filteredMiners}
                            showTrajectories={showTrajectories}
                            timelinePosition={timelinePosition}
                          />
                        )}

                        {/* LoRa Gateways */}
                        {showGateways &&
                          gateways.map((gw) => (
                            <g key={gw.id} className="cursor-pointer">
                              <circle
                                cx={gw.x}
                                cy={gw.y}
                                r={15}
                                fill="rgba(6, 182, 212, 0.2)"
                                stroke="#06b6d4"
                                strokeWidth="2"
                              />
                              <text
                                x={gw.x}
                                y={gw.y + 4}
                                fontSize="14"
                                textAnchor="middle"
                                fill="#06b6d4"
                              >
                                📡
                              </text>
                              <text
                                x={gw.x}
                                y={gw.y + 30}
                                fontSize="10"
                                textAnchor="middle"
                                fill="#06b6d4"
                                fontWeight="bold"
                              >
                                {gw.id}
                              </text>
                            </g>
                          ))}

                        {/* Miner Icons - Using MinerIcon component */}
                        {showMiners &&
                          filteredMiners.map((miner) => (
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
                    <div className="absolute right-4 top-4 flex flex-col gap-2">
                      <button
                        onClick={handleZoomIn}
                        className="p-2 bg-[#1e293b] rounded-lg text-gray-300 hover:bg-[#334155] border border-gray-700 shadow-lg"
                      >
                        <ZoomIn size={20} />
                      </button>
                      <button
                        onClick={handleZoomOut}
                        className="p-2 bg-[#1e293b] rounded-lg text-gray-300 hover:bg-[#334155] border border-gray-700 shadow-lg"
                      >
                        <ZoomOut size={20} />
                      </button>
                      <button
                        onClick={handleResetZoom}
                        className="p-2 bg-[#1e293b] rounded-lg text-gray-300 hover:bg-[#334155] border border-gray-700 shadow-lg"
                      >
                        <Home size={20} />
                      </button>
                    </div>

                    {/* Visibility Toggles */}
                    <div className="absolute left-4 top-4 flex flex-col gap-2">
                      <button
                        onClick={() => setShowMiners(!showMiners)}
                        className={`p-2 rounded-lg border border-gray-700 shadow-lg flex items-center gap-2 ${showMiners ? 'bg-[#1e293b] text-green-400' : 'bg-[#1e293b] text-gray-500'}`}
                      >
                        {showMiners ? <Eye size={16} /> : <EyeOff size={16} />}
                        <span className="text-xs">Mineurs</span>
                      </button>
                      <button
                        onClick={() => setShowGateways(!showGateways)}
                        className={`p-2 rounded-lg border border-gray-700 shadow-lg flex items-center gap-2 ${showGateways ? 'bg-[#1e293b] text-cyan-400' : 'bg-[#1e293b] text-gray-500'}`}
                      >
                        {showGateways ? <Eye size={16} /> : <EyeOff size={16} />}
                        <span className="text-xs">Gateways</span>
                      </button>
                      <button
                        onClick={() => setShowAlerts(!showAlerts)}
                        className={`p-2 rounded-lg border border-gray-700 shadow-lg flex items-center gap-2 ${showAlerts ? 'bg-[#1e293b] text-red-400' : 'bg-[#1e293b] text-gray-500'}`}
                      >
                        {showAlerts ? <Eye size={16} /> : <EyeOff size={16} />}
                        <span className="text-xs">Alertes</span>
                      </button>
                    </div>

                    {/* Scale Bar */}
                    <div className="absolute bottom-4 left-4 bg-[#1e293b]/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-700 shadow-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1 bg-gray-400"></div>
                        <span className="text-xs text-gray-300">50 m</span>
                      </div>
                    </div>

                    {/* Floating Legend Overlay */}
                    <div className="absolute bottom-4 right-4 z-10 pointer-events-auto shadow-2xl">
                      <MapLegend />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Miners List */}
            <div className="col-span-1 lg:col-span-3">
              <MinersList miners={filteredMiners} onMinerClick={handleMinerClick} />
            </div>
          </div>
        </div>
      </div>

      {/* Miner Detail Panel */}
      {selectedMiner && (
        <MinerDetail miner={selectedMiner} onClose={() => setSelectedMiner(null)} />
      )}
    </div>
  );
}
