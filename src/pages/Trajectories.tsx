import { useState } from 'react';
import { Route, Search, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function Trajectories() {
  const { miners } = useStore();
  const [selectedMiner, setSelectedMiner] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelinePos, setTimelinePos] = useState(0);

  const filteredMiners = miners.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.matricule.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeMiner = miners.find(m => m.id === selectedMiner);

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
    const timeMs = activeMiner.trajectory[activeMiner.trajectory.length - 1].timestamp - activeMiner.trajectory[0].timestamp;
    const timeMin = timeMs / 60000;
    return timeMin > 0 ? Math.round(dist / timeMin) : 0;
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <img src={`/LOGO.png`} alt="SupervisorApp" className="h-10 w-auto" />
        <div>
          <h1 className="text-xl font-bold text-white">Trajectoires</h1>
          <p className="text-sm text-gray-400">Analyse des déplacements des mineurs</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Miner List */}
        <div className="bg-[#1e293b] rounded border border-gray-700">
          <div className="p-3 border-b border-gray-700">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
            {filteredMiners.map(miner => (
              <button
                key={miner.id}
                onClick={() => setSelectedMiner(miner.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 border-b border-gray-700/50 transition-colors ${
                  selectedMiner === miner.id ? 'bg-green-500/10 border-l-2 border-l-green-500' : 'hover:bg-[#334155]'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                  miner.status === 'safe' ? 'bg-green-500' : miner.status === 'warning' ? 'bg-orange-500' : 'bg-red-500'
                }`}>
                  {miner.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white text-xs font-medium">{miner.name}</p>
                  <p className="text-gray-400 text-[10px]">{miner.currentZone} - {miner.trajectory.length} points</p>
                </div>
                <Route size={14} className="text-gray-500" />
              </button>
            ))}
          </div>
        </div>

        {/* Trajectory Visualization */}
        <div className="col-span-2 space-y-4">
          {activeMiner ? (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-4 gap-3">
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
                  <p className="text-white text-lg font-bold">{activeMiner.currentZone}</p>
                </div>
              </div>

              {/* Map Preview */}
              <div className="bg-[#1e293b] rounded border border-gray-700 p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-white">Visualisation du trajet</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsPlaying(!isPlaying)} className="p-1.5 bg-[#334155] rounded hover:bg-gray-600 text-white">
                      {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button className="p-1.5 bg-[#334155] rounded hover:bg-gray-600 text-white">
                      <SkipBack size={14} />
                    </button>
                    <button className="p-1.5 bg-[#334155] rounded hover:bg-gray-600 text-white">
                      <SkipForward size={14} />
                    </button>
                  </div>
                </div>
                <svg viewBox="0 0 800 300" className="w-full bg-[#0f172a] rounded">
                  {/* Grid */}
                  <defs>
                    <pattern id="traj-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="800" height="300" fill="url(#traj-grid)" />
                  
                  {/* Trajectory path */}
                  {activeMiner.trajectory.length > 1 && (
                    <path
                      d={activeMiner.trajectory.map((p, i) => {
                        const x = (p.x / 1000) * 800;
                        const y = (p.y / 500) * 300;
                        return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="2"
                      strokeOpacity="0.6"
                      strokeLinecap="round"
                    />
                  )}
                  
                  {/* Start point */}
                  {activeMiner.trajectory.length > 0 && (
                    <circle
                      cx={(activeMiner.trajectory[0].x / 1000) * 800}
                      cy={(activeMiner.trajectory[0].y / 500) * 300}
                      r="5"
                      fill="#3b82f6"
                      stroke="#fff"
                      strokeWidth="1"
                    />
                  )}
                  
                  {/* End point */}
                  {activeMiner.trajectory.length > 1 && (
                    <circle
                      cx={(activeMiner.trajectory[activeMiner.trajectory.length - 1].x / 1000) * 800}
                      cy={(activeMiner.trajectory[activeMiner.trajectory.length - 1].y / 500) * 300}
                      r="5"
                      fill="#22c55e"
                      stroke="#fff"
                      strokeWidth="1"
                    />
                  )}
                </svg>
                
                {/* Timeline slider */}
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-[10px] text-gray-400">00:00</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={timelinePos}
                    onChange={(e) => setTimelinePos(Number(e.target.value))}
                    className="flex-1 h-1 bg-gray-700 rounded-full appearance-none cursor-pointer accent-green-500"
                  />
                  <span className="text-[10px] text-gray-400">23:59</span>
                </div>
              </div>

              {/* Waypoint List */}
              <div className="bg-[#1e293b] rounded border border-gray-700 p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium text-white">Points de passage</h3>
                  <span className="text-[10px] text-gray-400">{activeMiner.trajectory.length} points</span>
                </div>
                <div className="max-h-[120px] overflow-y-auto space-y-1">
                  {activeMiner.trajectory.slice(-10).map((point, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#334155]">
                      <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-blue-400' : i === 9 ? 'bg-green-400' : 'bg-gray-500'}`} />
                      <span className="text-[10px] text-gray-300 flex-1 whitespace-nowrap">
                        ({point.x}, {point.y})
                      </span>
                      <span className="text-[9px] text-gray-500">
                        {new Date(point.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-[#1e293b] rounded border border-gray-700 p-12 flex flex-col items-center justify-center">
              <Route size={48} className="text-gray-600 mb-3" />
              <p className="text-gray-400 text-sm">Sélectionnez un mineur pour voir sa trajectoire</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
