import { useState } from 'react';
import { useStore } from '../store/useStore';
import MiningMap from '../components/map/MiningMap';
import TrajectoryLayer from '../components/map/TrajectoryLayer';
import MinerIcon from '../components/map/MinerIcon';
import MinerDetail from '../components/MinerDetail';
import SummaryCards from '../components/map/SummaryCards';
import FilterPanel from '../components/map/FilterPanel';
import MapLegend from '../components/map/MapLegend';
import MinersList from '../components/map/MinersList';
import { ZoomIn, ZoomOut, Home, Eye, EyeOff, Sun, ChevronDown } from 'lucide-react';

export default function MapView() {
  const { 
    miners, 
    selectedMiner, 
    setSelectedMiner, 
    filters, 
    setFilters, 
    showTrajectories, 
    setShowTrajectories, 
    timelinePosition, 
    setTimelinePosition, 
    isRealtime, 
    setIsRealtime, 
    alerts 
  } = useStore();
  
  const [zoom, setZoom] = useState(1);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [showMiners, setShowMiners] = useState(true);
  const [showGateways, setShowGateways] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const [viewBy, setViewBy] = useState<'zone' | 'gallery' | 'level'>('zone');

  // Filter miners based on current filters
  const filteredMiners = miners.filter((miner) => {
    if (filters.zone !== 'all' && miner.currentZone !== filters.zone) return false;
    if (filters.status !== 'all' && miner.status !== filters.status) return false;
    if (filters.role !== 'all' && miner.role !== filters.role) return false;
    if (filters.searchQuery && !miner.name.toLowerCase().includes(filters.searchQuery.toLowerCase()) && !miner.matricule.toLowerCase().includes(filters.searchQuery.toLowerCase())) return false;
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

  const activeAlerts = alerts.filter(a => !a.resolved).length;
  const dangerMiners = miners.filter(m => m.status === 'danger').length;
  const securityStatus = dangerMiners > 0 ? 'danger' : activeAlerts > 0 ? 'warning' : 'normal';

  const handleMinerClick = (miner: typeof miners[0]) => {
    setSelectedMiner(miner);
  };

  const handleZoneClick = (zoneId: string) => {
    setSelectedZone(zoneId);
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
              <img src={`/LOGO.png`} alt="SupervisorApp" className="h-10 w-auto" />
              <h1 className="text-xl font-semibold text-white">Vue Globale du Site - Temps Réel</h1>
              <p className="text-sm text-gray-400 mt-1">Surveillance en temps réel des mineurs et des zones</p>
            </div>
            <div className="flex items-center gap-4">
              <Sun size={20} className="text-gray-400 cursor-pointer hover:text-white transition-colors" />
              <button className="flex items-center gap-2 bg-[#0b1a2a] border border-gray-700 rounded-lg px-4 py-2 text-white text-sm hover:border-gray-600 transition-colors">
                Site Principal
                <ChevronDown size={16} />
              </button>
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
          <div className="grid grid-cols-12 gap-6">
            {/* Left Column - Filters and Legend */}
            <div className="col-span-2 space-y-4">
              <FilterPanel />
              <MapLegend />
            </div>

            {/* Center Column - Map */}
            <div className="col-span-7">
              <div className="bg-[#1e293b] rounded-xl border border-gray-700 overflow-hidden">
                {/* Map View Controls */}
                <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
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
                  </div>
                </div>

                {/* Map Container */}
                <div className="relative bg-[#0b1a2a] overflow-hidden" style={{ height: '500px' }}>
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                  >
                    <svg width="1000" height="500" viewBox="0 0 1000 500" className="bg-[#0b1a2a]">
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
                          cx={miners.find(m => m.status === 'danger')?.position.x || 500}
                          cy={miners.find(m => m.status === 'danger')?.position.y || 250}
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
                      {showGateways && gateways.map((gw) => (
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
                          >📡</text>
                          <text
                            x={gw.x}
                            y={gw.y + 30}
                            fontSize="10"
                            textAnchor="middle"
                            fill="#06b6d4"
                            fontWeight="bold"
                          >{gw.id}</text>
                        </g>
                      ))}

                      {/* Miner Icons - Using MinerIcon component */}
                      {showMiners && filteredMiners.map((miner) => (
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
                  <div className="absolute bottom-4 left-4 bg-[#1e293b] rounded-lg px-3 py-2 border border-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1 bg-gray-400"></div>
                      <span className="text-xs text-gray-300">50 m</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Miners List */}
            <div className="col-span-3">
              <MinersList miners={filteredMiners} onMinerClick={handleMinerClick} />
            </div>
          </div>
        </div>
      </div>

      {/* Miner Detail Panel */}
      {selectedMiner && (
        <MinerDetail
          miner={selectedMiner}
          onClose={() => setSelectedMiner(null)}
        />
      )}
    </div>
  );
}
