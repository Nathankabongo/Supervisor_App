import { useState, useEffect, useMemo } from 'react';
import { Route, Search, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { useStore, Miner } from '../store/useStore';
import Interactive3DMap, { getZoneForCoords } from '../components/map/Interactive3DMap';

const ZONE_CENTERS: Record<
  string,
  { x: number; y: number; name: string; color: string; labelColor: string; depth: string }
> = {
  'ZONE A': {
    x: 165,
    y: 130,
    name: 'Zone A - Extraction',
    color: '#f97316',
    labelColor: '#fdba74',
    depth: 'Surface',
  },
  'ZONE B': {
    x: 425,
    y: 130,
    name: 'Zone B - Transport',
    color: '#3b82f6',
    labelColor: '#60a5fa',
    depth: 'Surface',
  },
  'ZONE C': {
    x: 675,
    y: 130,
    name: 'Zone C - Raffinerie',
    color: '#22c55e',
    labelColor: '#4ade80',
    depth: 'Surface',
  },
  'ZONE D': {
    x: 165,
    y: 360,
    name: 'Zone D - Stockage',
    color: '#a855f7',
    labelColor: '#c084fc',
    depth: '-100m',
  },
  'ZONE E': {
    x: 425,
    y: 400,
    name: 'Zone E - Maintenance',
    color: '#ef4444',
    labelColor: '#f87171',
    depth: '-200m',
  },
  'ZONE F': {
    x: 675,
    y: 400,
    name: 'Zone F - Services',
    color: '#06b6d4',
    labelColor: '#22d3ee',
    depth: '-300m',
  },
};

const ZONE_PATHS: Record<string, string> = {
  'ZONE A': 'M 40 40 Q 150 30 280 45 Q 320 80 310 150 Q 300 200 250 230 Q 180 250 120 240 Q 50 220 40 160 Q 35 100 40 40 Z',
  'ZONE B': 'M 290 50 Q 400 35 530 45 Q 570 75 560 140 Q 550 200 500 225 Q 430 245 370 235 Q 310 220 300 170 Q 295 110 290 50 Z',
  'ZONE C': 'M 540 50 Q 650 35 780 45 Q 820 80 810 150 Q 800 200 750 225 Q 680 245 620 235 Q 560 220 550 170 Q 545 110 540 50 Z',
  'ZONE D': 'M 40 260 Q 150 245 280 255 Q 320 285 310 350 Q 300 410 250 435 Q 180 455 120 445 Q 50 425 40 370 Q 35 310 40 260 Z',
  'ZONE E': 'M 290 310 Q 400 295 530 305 Q 570 335 560 400 Q 550 460 500 485 Q 430 505 370 495 Q 310 480 300 430 Q 295 370 290 310 Z',
  'ZONE F': 'M 540 310 Q 650 295 780 305 Q 820 335 810 400 Q 800 460 750 485 Q 680 505 620 495 Q 560 480 550 430 Q 545 370 540 310 Z',
};

const gateways = [
  { id: 'GW-01', x: 165, y: 140, zone: 'ZONE A' },
  { id: 'GW-02', x: 425, y: 140, zone: 'ZONE B' },
  { id: 'GW-03', x: 675, y: 140, zone: 'ZONE C' },
  { id: 'GW-04', x: 165, y: 370, zone: 'ZONE D' },
  { id: 'GW-05', x: 425, y: 400, zone: 'ZONE E' },
  { id: 'GW-06', x: 675, y: 400, zone: 'ZONE F' },
];

const isZoneVisibleOnSite = (zone: string, site: string) => {
  if (site === 'open_pit') {
    return ['ZONE A', 'ZONE B', 'ZONE C'].includes(zone);
  }
  if (site === 'underground' || site === 'galleries') {
    return ['ZONE D', 'ZONE E', 'ZONE F'].includes(zone);
  }
  return true;
};

// Helper to determine if a miner is on an engine/machinery
const getMinerVehicle = (miner: Miner, zone: string): string | null => {
  const role = miner.role.toLowerCase();
  if (role === 'opérateur' || role === 'operateur') {
    if (zone === 'ZONE A') return 'excavator'; // Excavatrice pour mine à ciel ouvert
    if (zone === 'ZONE B') return 'truck'; // Camion benne de transport
    return 'loader'; // Chargeuse générique
  }
  if (role === 'foreur') {
    return 'drill'; // Foreuse mobile
  }
  return null;
};

// Helper to get vehicle icon/emoji
const getVehicleEmoji = (type: string) => {
  switch (type) {
    case 'excavator':
      return '🚜';
    case 'truck':
      return '🚚';
    case 'drill':
      return '⚙️';
    default:
      return '🚛';
  }
};

export default function Trajectories() {
  const { miners, selectedMiner: storeSelectedMiner } = useStore();
  const [selectedMiner, setSelectedMiner] = useState<string | null>(null);

  useEffect(() => {
    if (storeSelectedMiner) {
      setSelectedMiner(storeSelectedMiner.id);
    }
  }, [storeSelectedMiner]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelinePos, setTimelinePos] = useState(0);
  const [mapMode, setMapMode] = useState<'2d' | '3d'>('3d');
  const [selectedSite, setSelectedSite] = useState<
    'all' | 'open_pit' | 'underground' | 'galleries'
  >('all');

  const filteredMiners = miners.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.matricule.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const activeMiner = miners.find((m) => m.id === selectedMiner);

  const displaySelectedMiner = useMemo(() => {
    if (!activeMiner || activeMiner.trajectory.length === 0) return null;
    const currentPos = activeMiner.trajectory[timelinePos] || activeMiner.position;
    const currentZone = getZoneForCoords(currentPos.x, currentPos.y);
    return {
      ...activeMiner,
      position: currentPos,
      currentZone: currentZone,
      trajectory: activeMiner.trajectory.slice(0, timelinePos + 1),
    };
  }, [activeMiner, timelinePos]);

  const displayMiners = useMemo(() => {
    if (!displaySelectedMiner) return miners;
    return miners.map((m) => (m.id === displaySelectedMiner.id ? (displaySelectedMiner as Miner) : m));
  }, [miners, displaySelectedMiner]);

  useEffect(() => {
    setTimelinePos(0);
    setIsPlaying(false);
  }, [selectedMiner]);

  useEffect(() => {
    let interval: any;
    if (isPlaying && activeMiner && activeMiner.trajectory.length > 0) {
      interval = setInterval(() => {
        setTimelinePos((prev) => {
          if (prev >= activeMiner.trajectory.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 800);
    }
    return () => clearInterval(interval);
  }, [isPlaying, activeMiner]);

  const getDistance = () => {
    if (!activeMiner || activeMiner.trajectory.length < 2) return 0;
    let dist = 0;
    for (let i = 1; i < activeMiner.trajectory.length; i++) {
      const dx = activeMiner.trajectory[i].x - activeMiner.trajectory[i - 1].x;
      const dy = activeMiner.trajectory[i].y - activeMiner.trajectory[i - 1].y;
      dist += Math.sqrt(dx * dx + dy * dy);
    }
    return Math.round(dist);
  };

  const getAvgSpeed = () => {
    if (!activeMiner || activeMiner.trajectory.length < 2) return 0;
    const dist = getDistance();
    const timeMs =
      activeMiner.trajectory[activeMiner.trajectory.length - 1].timestamp -
      activeMiner.trajectory[0].timestamp;
    const timeMin = timeMs / 60000;
    return timeMin > 0 ? Math.round(dist / timeMin) : 0;
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <img src={`/Logo-with-text.png`} alt="SupervisorApp" className="h-10 w-auto" />
        <div>
          <h1 className="text-xl font-bold text-white">Trajectoires</h1>
          <p className="text-sm text-gray-400">Analyse des déplacements des mineurs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Miner List */}
        <div className="bg-[#1e293b] rounded border border-gray-700">
          <div className="p-3 border-b border-gray-700">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#0f172a] border border-gray-700 rounded text-white text-xs placeholder-gray-500 focus:outline-none focus:border-green-500"
              />
            </div>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {filteredMiners.map((miner) => (
              <button
                key={miner.id}
                onClick={() => setSelectedMiner(miner.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 border-b border-gray-700/50 transition-colors ${
                  selectedMiner === miner.id
                    ? 'bg-green-500/10 border-l-2 border-l-green-500'
                    : 'hover:bg-[#334155]'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                    miner.status === 'safe'
                      ? 'bg-green-500'
                      : miner.status === 'warning'
                        ? 'bg-orange-500'
                        : 'bg-red-500'
                  }`}
                >
                  {miner.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white text-xs font-medium">{miner.name}</p>
                  <p className="text-gray-400 text-[10px]">
                    {miner.currentZone} - {miner.trajectory.length} points
                  </p>
                </div>
                <Route size={14} className="text-gray-500" />
              </button>
            ))}
          </div>
        </div>

        {/* Trajectory Visualization */}
        <div className="col-span-1 lg:col-span-2 space-y-4">
          {activeMiner ? (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#1e293b] rounded border border-gray-700 p-3">
                  <p className="text-gray-400 text-[10px] mb-1">DISTANCE TOTALE</p>
                  <p className="text-white text-lg font-bold">{getDistance()}m</p>
                </div>
                <div className="bg-[#1e293b] rounded border border-gray-700 p-3">
                  <p className="text-gray-400 text-[10px] mb-1">VITESSE MOY.</p>
                  <p className="text-white text-lg font-bold">{getAvgSpeed()}m/min</p>
                </div>
                <div className="bg-[#1e293b] rounded border border-gray-700 p-3">
                  <p className="text-gray-400 text-[10px] mb-1">POINTS GPS</p>
                  <p className="text-white text-lg font-bold">{activeMiner.trajectory.length}</p>
                </div>
                <div className="bg-[#1e293b] rounded border border-gray-700 p-3">
                  <p className="text-gray-400 text-[10px] mb-1">ZONE ACTUELLE</p>
                  <p className="text-white text-lg font-bold">{displaySelectedMiner?.currentZone || activeMiner.currentZone}</p>
                </div>
              </div>

              {/* Map Preview */}
              <div className="bg-[#1e293b] rounded border border-gray-700 p-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 border-b border-gray-700/50 pb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-medium text-white">Visualisation du trajet</h3>
                    
                    {/* Site Dropdown */}
                    <select
                      value={selectedSite}
                      onChange={(e) => setSelectedSite(e.target.value as any)}
                      className="bg-[#0f172a] border border-gray-700 rounded px-2.5 py-1 text-white text-xs hover:border-gray-600 transition-colors focus:outline-none cursor-pointer"
                    >
                      <option value="all">Site Principal - Tout</option>
                      <option value="open_pit">Site A - Mine à ciel ouvert</option>
                      <option value="underground">Site A - Mine souterraine</option>
                      <option value="galleries">Structure des galeries</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    {/* Mode Selector */}
                    <div className="flex items-center bg-[#0f172a] p-0.5 rounded border border-gray-700">
                      <button
                        onClick={() => setMapMode('2d')}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                          mapMode === '2d'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Vue 2D
                      </button>
                      <button
                        onClick={() => setMapMode('3d')}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                          mapMode === '3d'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Vue 3D
                      </button>
                    </div>

                    {/* Timeline Controls */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="p-1 bg-[#334155] rounded hover:bg-gray-600 text-white transition-colors"
                        title={isPlaying ? "Pause" : "Play"}
                      >
                        {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                      </button>
                      <button
                        onClick={() => {
                          setTimelinePos(0);
                          setIsPlaying(false);
                        }}
                        className="p-1 bg-[#334155] rounded hover:bg-gray-600 text-white transition-colors"
                        title="Reset"
                      >
                        <SkipBack size={12} />
                      </button>
                      <button
                        onClick={() => {
                          if (activeMiner) {
                            setTimelinePos(activeMiner.trajectory.length - 1);
                            setIsPlaying(false);
                          }
                        }}
                        className="p-1 bg-[#334155] rounded hover:bg-gray-600 text-white transition-colors"
                        title="End"
                      >
                        <SkipForward size={12} />
                      </button>
                    </div>
                  </div>
                </div>

                {mapMode === '3d' ? (
                  <div className="h-[480px] bg-[#0b1a2a] border border-slate-800/80 rounded overflow-hidden relative">
                    <Interactive3DMap
                      miners={displayMiners}
                      selectedMiner={displaySelectedMiner}
                      onMinerClick={(miner) => setSelectedMiner(miner.id)}
                      showTrajectories={true}
                      showAlerts={true}
                      showGateways={true}
                      gateways={gateways}
                      selectedSite={selectedSite}
                    />
                  </div>
                ) : (
                  <svg viewBox="0 0 1000 500" className="w-full h-auto bg-[#0b1a2a] border border-slate-800/80 rounded transition-all duration-300">
                    {/* Background Grid */}
                    <defs>
                      <pattern id="miniGrid" width="50" height="50" patternUnits="userSpaceOnUse">
                        <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#112237" strokeWidth="1" />
                      </pattern>

                      <filter id="glowGreen" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="8" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                      <filter id="glowOrange" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="8" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                      <filter id="glowRed" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="8" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    <rect width="1000" height="500" fill="url(#miniGrid)" />

                    {/* Dotted vertical Shaft lines representing elevator connections between surface and depths */}
                    {selectedSite === 'all' && (
                      <>
                        <line
                          x1="165"
                          y1="130"
                          x2="165"
                          y2="360"
                          stroke="#1e293b"
                          strokeWidth="4"
                          strokeDasharray="6,6"
                          opacity="0.8"
                        />
                        <line
                          x1="425"
                          y1="130"
                          x2="425"
                          y2="400"
                          stroke="#1e293b"
                          strokeWidth="4"
                          strokeDasharray="6,6"
                          opacity="0.8"
                        />
                        <line
                          x1="675"
                          y1="130"
                          x2="675"
                          y2="400"
                          stroke="#1e293b"
                          strokeWidth="4"
                          strokeDasharray="6,6"
                          opacity="0.8"
                        />

                        {/* Shaft labels */}
                        <text
                          x="165"
                          y="240"
                          fill="#334155"
                          fontSize="12"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          Ascenseur 1
                        </text>
                        <text
                          x="425"
                          y="260"
                          fill="#334155"
                          fontSize="12"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          Ascenseur 2
                        </text>
                        <text
                          x="675"
                          y="260"
                          fill="#334155"
                          fontSize="12"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          Secours
                        </text>
                      </>
                    )}

                    {/* Zone Polygons */}
                    {Object.entries(ZONE_CENTERS).map(([key, center]) => {
                      const isVisible = isZoneVisibleOnSite(key, selectedSite);
                      if (!isVisible) return null;
                      const currentZone = displaySelectedMiner?.currentZone || activeMiner.currentZone;
                      const isCurrentZone = currentZone === key;
                      const pathD = ZONE_PATHS[key];
                      return (
                        <g key={key}>
                          <path
                            d={pathD}
                            fill={center.color}
                            fillOpacity={isCurrentZone ? 0.35 : 0.06}
                            stroke={center.color}
                            strokeWidth={isCurrentZone ? 4 : 2}
                            strokeOpacity={isCurrentZone ? 0.8 : 0.15}
                            strokeLinecap="round"
                            className="transition-all duration-300"
                          />
                          <text
                            x={center.x}
                            y={center.y + 40}
                            fill={isCurrentZone ? '#ffffff' : center.labelColor}
                            fillOpacity={isCurrentZone ? 1 : 0.4}
                            fontSize="16"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {key}
                          </text>
                          <text
                            x={center.x}
                            y={center.y + 58}
                            fill={center.labelColor}
                            fillOpacity={isCurrentZone ? 0.9 : 0.25}
                            fontSize="11"
                            textAnchor="middle"
                          >
                            {center.depth}
                          </text>
                        </g>
                      );
                    })}

                    {/* Entire Trajectory Path (Dashed) */}
                    {activeMiner.trajectory.length > 1 && (
                      <path
                        d={activeMiner.trajectory
                          .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                          .join(' ')}
                        fill="none"
                        stroke="#475569"
                        strokeWidth="2.5"
                        strokeDasharray="5,5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.5"
                      />
                    )}

                    {/* Played Trajectory Path (Solid) */}
                    {activeMiner.trajectory.length > 1 && (
                      <path
                        d={activeMiner.trajectory
                          .slice(0, timelinePos + 1)
                          .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                          .join(' ')}
                        fill="none"
                        stroke={
                          activeMiner.status === 'danger'
                            ? '#ef4444'
                            : activeMiner.status === 'warning'
                              ? '#f97316'
                              : '#22c55e'
                        }
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.9"
                      />
                    )}

                    {/* Start Point */}
                    {activeMiner.trajectory.length > 0 && (
                      <circle
                        cx={activeMiner.trajectory[0].x}
                        cy={activeMiner.trajectory[0].y}
                        r="6"
                        fill="#3b82f6"
                        stroke="#fff"
                        strokeWidth="1.5"
                      />
                    )}

                    {/* Current Position Marker (Selected point in timeline) */}
                    {activeMiner.trajectory[timelinePos] && isZoneVisibleOnSite(getZoneForCoords(activeMiner.trajectory[timelinePos].x, activeMiner.trajectory[timelinePos].y), selectedSite) && (
                      <g
                        transform={`translate(${activeMiner.trajectory[timelinePos].x}, ${activeMiner.trajectory[timelinePos].y})`}
                      >
                        <circle
                          r="22"
                          fill={
                            activeMiner.status === 'danger'
                              ? 'rgba(239, 68, 68, 0.25)'
                              : activeMiner.status === 'warning'
                                ? 'rgba(249, 115, 22, 0.25)'
                                : 'rgba(34, 197, 94, 0.25)'
                          }
                          className="animate-ping"
                        />
                        <circle
                          r="14"
                          fill={
                            activeMiner.status === 'danger'
                              ? '#ef4444'
                              : activeMiner.status === 'warning'
                                ? '#f97316'
                                : '#22c55e'
                          }
                          stroke="#ffffff"
                          strokeWidth="2"
                          filter={
                            activeMiner.status === 'danger'
                              ? 'url(#glowRed)'
                              : activeMiner.status === 'warning'
                                ? 'url(#glowOrange)'
                                : 'url(#glowGreen)'
                          }
                        />
                        <text textAnchor="middle" x="0" y="3.5" fontSize="10">
                          {(() => {
                            const zone = displaySelectedMiner?.currentZone || activeMiner.currentZone;
                            const vehicle = getMinerVehicle(activeMiner, zone);
                            return vehicle ? getVehicleEmoji(vehicle) : '👷';
                          })()}
                        </text>
                      </g>
                    )}
                  </svg>
                )}

                {/* Timeline slider */}
                <div className="mt-2 flex flex-col gap-1">
                  <input
                    type="range"
                    min="0"
                    max={Math.max(0, activeMiner.trajectory.length - 1)}
                    value={timelinePos}
                    onChange={(e) => setTimelinePos(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-green-500"
                  />
                  <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                    <span>
                      DÉBUT: {activeMiner.trajectory[0] ? new Date(activeMiner.trajectory[0].timestamp).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      }) : '--:--'}
                    </span>
                    {activeMiner.trajectory[timelinePos] && (
                      <span className="text-white font-medium bg-[#0f172a] px-2 py-0.5 rounded border border-gray-800">
                        SÉLECTION : {new Date(activeMiner.trajectory[timelinePos].timestamp).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    )}
                    <span>
                      FIN: {activeMiner.trajectory[activeMiner.trajectory.length - 1] ? new Date(activeMiner.trajectory[activeMiner.trajectory.length - 1].timestamp).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      }) : '--:--'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Waypoint List */}
              <div className="bg-[#1e293b] rounded border border-gray-700 p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium text-white">Points de passage</h3>
                  <span className="text-[10px] text-gray-400">
                    {activeMiner.trajectory.length} points
                  </span>
                </div>
                <div className="max-h-[150px] overflow-y-auto space-y-1 pr-1">
                  {activeMiner.trajectory.map((point, i) => {
                    const isActive = i === timelinePos;
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          setTimelinePos(i);
                          setIsPlaying(false);
                        }}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors text-left ${
                          isActive
                            ? 'bg-green-500/20 text-white border border-green-500/30'
                            : 'hover:bg-[#334155]/50 text-gray-300'
                        }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            i === 0
                              ? 'bg-blue-400'
                              : i === activeMiner.trajectory.length - 1
                                ? 'bg-green-400'
                                : isActive
                                  ? 'bg-green-500 animate-pulse'
                                  : 'bg-gray-500'
                          }`}
                        />
                        <span className="text-[10px] flex-1 font-mono">
                          Point {i + 1} ({Math.round(point.x)}m, {Math.round(point.y)}m)
                        </span>
                        <span className="text-[9px] text-gray-500">
                          {new Date(point.timestamp).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-[#1e293b] rounded border border-gray-700 p-12 flex flex-col items-center justify-center">
              <Route size={48} className="text-gray-600 mb-3" />
              <p className="text-gray-400 text-sm">
                Sélectionnez un mineur pour voir sa trajectoire
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
