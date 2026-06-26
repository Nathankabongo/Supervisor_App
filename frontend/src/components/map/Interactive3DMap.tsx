import { useState, useMemo, useEffect } from 'react';
import { Miner } from '../../store/useStore';
import { Rotate3d, Compass, ZoomIn, ZoomOut, Info, X } from 'lucide-react';

// Helper to determine zone based on 2D coordinates
export const getZoneForCoords = (x: number, y: number): string => {
  if (y < 250) {
    if (x < 300) return 'ZONE A';
    if (x < 550) return 'ZONE B';
    return 'ZONE C';
  } else {
    if (x < 300) return 'ZONE D';
    if (x < 550) return 'ZONE E';
    return 'ZONE F';
  }
};

interface Interactive3DMapProps {
  miners: Miner[];
  selectedMiner: Miner | null;
  onMinerClick: (miner: Miner) => void;
  showTrajectories: boolean;
  showAlerts: boolean;
  showGateways: boolean;
  gateways: { id: string; x: number; y: number; zone: string }[];
  selectedSite: 'all' | 'open_pit' | 'underground' | 'galleries';
}

export default function Interactive3DMap({
  miners,
  selectedMiner,
  onMinerClick,
  showTrajectories,
  showAlerts,
  showGateways,
  gateways,
  selectedSite,
}: Interactive3DMapProps) {
  // 3D parameters
  const [pitch, setPitch] = useState(40); // Tilt (vertical angle)
  const [yaw, setYaw] = useState(-25); // Rotation (horizontal angle)
  const [spacing, setSpacing] = useState(130); // Vertical space between levels
  const [zoom, setZoom] = useState(0.9);
  const [hoveredMiner, setHoveredMiner] = useState<Miner | null>(null);
  const [activeLayer, setActiveLayer] = useState<'all' | 'surface' | 'l1' | 'l2' | 'l3'>('all');
  const [showInfoOverlay, setShowInfoOverlay] = useState(true);

  // Automatically adjust activeLayer when selectedSite changes
  useEffect(() => {
    if (selectedSite === 'open_pit') {
      setActiveLayer('surface');
    } else if (selectedSite === 'underground' || selectedSite === 'galleries') {
      if (activeLayer === 'surface') {
        setActiveLayer('all');
      }
    }
  }, [selectedSite]);

  // Map 2D coordinate inside zone to 3D isometric coordinate
  const project = (x: number, y: number, zone: string) => {
    // Determine depth (Z) based on zone
    let zOffset = 0;
    if (zone === 'ZONE D')
      zOffset = -1; // Level 1 (-100m)
    else if (zone === 'ZONE E')
      zOffset = -2; // Level 2 (-200m)
    else if (zone === 'ZONE F') zOffset = -3; // Level 3 (-300m)

    // Center coordinates to rotate around (500, 250)
    const cx = 500;
    const cy = 250;
    const dx = x - cx;
    const dy = y - cy;

    // Apply Yaw rotation (Z-axis rotation)
    const radYaw = (yaw * Math.PI) / 180;
    const rx = dx * Math.cos(radYaw) - dy * Math.sin(radYaw);
    const ry = dx * Math.sin(radYaw) + dy * Math.cos(radYaw);

    // Apply Pitch tilt (X-axis rotation)
    const radPitch = (pitch * Math.PI) / 180;
    const px = rx;
    const py = ry * Math.sin(radPitch);

    // Apply Z elevation spacing
    const finalX = cx + px * zoom;
    const finalY = cy + py * zoom + zOffset * spacing * zoom;

    return { x: finalX, y: finalY, zIndex: zOffset };
  };

  // Helper to determine if a miner is on an engine/machinery
  const getMinerVehicle = (miner: Miner): string | null => {
    const role = (miner.role || 'Inconnu').toLowerCase();
    if (role === 'opérateur') {
      if (miner.currentZone === 'ZONE A') return 'excavator'; // Excavatrice pour mine à ciel ouvert
      if (miner.currentZone === 'ZONE B') return 'truck'; // Camion benne de transport
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

  // Check if layer is visible
  const isLayerVisible = (layer: 'surface' | 'l1' | 'l2' | 'l3') => {
    if (selectedSite === 'open_pit') {
      if (layer !== 'surface') return false;
    } else if (selectedSite === 'underground' || selectedSite === 'galleries') {
      if (layer === 'surface') return false;
    }

    if (activeLayer === 'all') return true;
    return activeLayer === layer;
  };

  // Generate 3D paths for underground galleries
  const galleriesData = useMemo(() => {
    return [
      {
        level: 'l1',
        name: 'Niveau -100m (Zone D)',
        color: '#c084fc',
        depth: -1,
        paths: [
          // Main tunnel loops
          'M 200 200 L 800 200 L 800 350 L 200 350 Z',
          'M 350 200 L 350 350',
          'M 650 200 L 650 350',
        ],
      },
      {
        level: 'l2',
        name: 'Niveau -200m (Zone E)',
        color: '#f87171',
        depth: -2,
        paths: [
          // Branching galleries
          'M 300 220 L 700 220',
          'M 300 300 L 700 300',
          'M 500 150 L 500 400',
        ],
      },
      {
        level: 'l3',
        name: 'Niveau -300m (Zone F)',
        color: '#22d3ee',
        depth: -3,
        paths: [
          // Deep parallel tunnels
          'M 250 250 L 750 250',
          'M 250 310 L 750 310',
          'M 380 200 L 380 360',
        ],
      },
    ];
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* 3D Dashboard Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#112233] border-b border-gray-700">
        {/* Rotation & View Controls */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Rotate3d size={18} className="text-blue-400" />
            <span className="text-sm font-semibold text-white">Contrôles 3D</span>
          </div>

          {/* Rotation (Yaw) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Rotation H</span>
            <input
              type="range"
              min="-180"
              max="180"
              value={yaw}
              onChange={(e) => setYaw(Number(e.target.value))}
              className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span className="text-xs text-gray-300 w-8">{yaw}°</span>
          </div>

          {/* Inclinaison (Pitch) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Inclinaison V</span>
            <input
              type="range"
              min="10"
              max="80"
              value={pitch}
              onChange={(e) => setPitch(Number(e.target.value))}
              className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span className="text-xs text-gray-300 w-8">{pitch}°</span>
          </div>

          {/* Écartement des couches */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Profondeur</span>
            <input
              type="range"
              min="50"
              max="220"
              value={spacing}
              onChange={(e) => setSpacing(Number(e.target.value))}
              className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span className="text-xs text-gray-300 w-8">{spacing}px</span>
          </div>
        </div>

        {/* Quick View Presets & Layer Filter */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setYaw(-25);
              setPitch(40);
              setSpacing(130);
              setZoom(0.9);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1e293b] border border-gray-700 hover:border-gray-500 rounded text-xs text-white transition-colors"
            title="Réinitialiser la vue"
          >
            <Compass size={14} />
            Défaut
          </button>

          <div className="flex items-center bg-[#0f172a] p-1 rounded-lg border border-gray-800">
            {selectedSite === 'all' && (
              <button
                onClick={() => setActiveLayer('all')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${activeLayer === 'all' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Tout
              </button>
            )}
            {selectedSite !== 'open_pit' &&
              (selectedSite === 'underground' || selectedSite === 'galleries') && (
                <button
                  onClick={() => setActiveLayer('all')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${activeLayer === 'all' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  Tous Niveaux
                </button>
              )}
            {selectedSite !== 'underground' && selectedSite !== 'galleries' && (
              <button
                onClick={() => setActiveLayer('surface')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${activeLayer === 'surface' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Surface
              </button>
            )}
            {selectedSite !== 'open_pit' && (
              <>
                <button
                  onClick={() => setActiveLayer('l1')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${activeLayer === 'l1' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  -100m
                </button>
                <button
                  onClick={() => setActiveLayer('l2')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${activeLayer === 'l2' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  -200m
                </button>
                <button
                  onClick={() => setActiveLayer('l3')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${activeLayer === 'l3' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  -300m
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main 3D Canvas Area */}
      <div className="relative flex-1 bg-[#09111e] overflow-hidden" style={{ minHeight: '520px' }}>
        {/* Layer Info Overlay */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 pointer-events-none">
          {showInfoOverlay ? (
            <div className="bg-[#1e293b]/90 border border-gray-700 backdrop-blur-md rounded-lg p-3 text-xs text-gray-300 shadow-xl max-w-xs pointer-events-auto relative">
              <button
                onClick={() => setShowInfoOverlay(false)}
                className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors"
                title="Masquer les informations"
              >
                <X size={14} />
              </button>
              <h4 className="font-bold text-white mb-1 pr-5 flex items-center gap-1.5">
                <Info size={14} className="text-cyan-400" />
                Mine Métallique 3D
              </h4>
              <p className="leading-relaxed">
                Visualisation isométrique en couches de la mine à ciel ouvert et des galeries
                souterraines.
              </p>
              <div className="mt-2 space-y-1">
                {selectedSite !== 'underground' && selectedSite !== 'galleries' && (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                    <span>Surface &amp; Ciel Ouvert</span>
                  </div>
                )}
                {selectedSite !== 'open_pit' && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                      <span>Sous-sol Niveau 1 (-100m)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-400"></span>
                      <span>Sous-sol Niveau 2 (-200m)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                      <span>Sous-sol Niveau 3 (-300m)</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowInfoOverlay(true)}
              className="bg-[#1e293b]/90 hover:bg-[#334155] border border-gray-700 text-gray-300 hover:text-white rounded-lg p-2 shadow-xl backdrop-blur-sm pointer-events-auto flex items-center gap-1.5 text-xs font-semibold transition-colors"
              title="Afficher les informations"
            >
              <Info size={14} className="text-cyan-400" />
              <span>Infos Mine</span>
            </button>
          )}
        </div>

        {/* Hover Details Panel */}
        {hoveredMiner && (
          <div
            className="absolute z-20 bg-[#1e293b]/95 border border-gray-600 rounded-lg p-3 text-xs text-white shadow-2xl pointer-events-none min-w-[200px]"
            style={{
              left: `${Math.min(window.innerWidth - 300, Math.max(20, project(hoveredMiner.position.x, hoveredMiner.position.y, hoveredMiner.currentZone).x - 100))}px`,
              top: `${Math.min(window.innerHeight - 300, Math.max(20, project(hoveredMiner.position.x, hoveredMiner.position.y, hoveredMiner.currentZone).y - 85))}px`,
            }}
          >
            <div className="flex items-center justify-between border-b border-gray-700 pb-1.5 mb-1.5">
              <span className="font-bold text-cyan-400">{hoveredMiner.name}</span>
              <span className="text-[10px] bg-[#0f172a] px-1.5 py-0.5 rounded text-gray-400">
                {hoveredMiner.matricule}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">Rôle :</span> <span>{hoveredMiner.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Zone :</span>{' '}
                <span className="font-semibold text-orange-300">{hoveredMiner.currentZone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Véhicule :</span>{' '}
                <span>
                  {getMinerVehicle(hoveredMiner)
                    ? `${getVehicleEmoji(getMinerVehicle(hoveredMiner)!)} ${getMinerVehicle(hoveredMiner)}`
                    : 'À pied (👷)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Galerie :</span>{' '}
                <span>{hoveredMiner.currentGallery}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Fréq. Cardiaque :</span>{' '}
                <span className="text-emerald-400 font-semibold">{hoveredMiner.heartRate} bpm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Statut :</span>
                <span
                  className={`px-1.5 rounded text-[10px] font-bold ${
                    hoveredMiner.status === 'danger'
                      ? 'bg-red-900 text-red-300'
                      : hoveredMiner.status === 'warning'
                        ? 'bg-amber-900 text-amber-300'
                        : 'bg-emerald-900 text-emerald-300'
                  }`}
                >
                  {hoveredMiner.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Zoom Controls */}
        <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
          <button
            onClick={() => setZoom((prev) => Math.min(prev + 0.1, 1.8))}
            className="p-2 bg-[#1e293b]/90 hover:bg-[#334155] border border-gray-700 text-gray-300 hover:text-white rounded-lg shadow-xl backdrop-blur-sm"
          >
            <ZoomIn size={18} />
          </button>
          <button
            onClick={() => setZoom((prev) => Math.max(prev - 0.1, 0.4))}
            className="p-2 bg-[#1e293b]/90 hover:bg-[#334155] border border-gray-700 text-gray-300 hover:text-white rounded-lg shadow-xl backdrop-blur-sm"
          >
            <ZoomOut size={18} />
          </button>
        </div>

        {/* 3D SVG Map Canvas */}
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1000 650"
          className="w-full h-full select-none"
        >
          <defs>
            {/* Grid pattern projected for surface */}
            <pattern id="grid3d" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1f2937" strokeWidth="0.5" />
            </pattern>

            {/* Glowing filter for danger alerts */}
            <filter id="glow-danger" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Glowing filter for tunnels */}
            <filter id="glow-tunnels" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Linear gradients for strata representation */}
            <linearGradient id="strataGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Background grid */}
          <rect width="1000" height="650" fill="#09111e" />

          {/* ========================================================
              3D VERTICAL SHAFT / PUITS DE MINE (Connecting elevator)
              ======================================================== */}
          {activeLayer === 'all' && selectedSite === 'all' && (
            <g id="mine-shaft" className="opacity-40">
              {/* Central elevator shaft tower lines */}
              {(() => {
                const topPt = project(500, 250, 'ZONE A');
                const bottomPt = project(500, 250, 'ZONE F');
                return (
                  <>
                    <line
                      x1={topPt.x}
                      y1={topPt.y}
                      x2={bottomPt.x}
                      y2={bottomPt.y}
                      stroke="#06b6d4"
                      strokeWidth="3"
                      strokeDasharray="6,4"
                    />
                    <line
                      x1={topPt.x - 25}
                      y1={topPt.y}
                      x2={bottomPt.x - 25}
                      y2={bottomPt.y}
                      stroke="#06b6d4"
                      strokeWidth="1"
                      strokeDasharray="3,3"
                    />
                    <line
                      x1={topPt.x + 25}
                      y1={topPt.y}
                      x2={bottomPt.x + 25}
                      y2={bottomPt.y}
                      stroke="#06b6d4"
                      strokeWidth="1"
                      strokeDasharray="3,3"
                    />

                    {/* Shaft elevator cabins styled schematically */}
                    <rect
                      x={topPt.x - 10}
                      y={topPt.y + (bottomPt.y - topPt.y) * 0.3}
                      width="20"
                      height="25"
                      fill="#0e7490"
                      stroke="#22d3ee"
                      rx="3"
                    />
                    <text
                      x={topPt.x}
                      y={topPt.y + (bottomPt.y - topPt.y) * 0.3 + 16}
                      fontSize="10"
                      fill="#fff"
                      textAnchor="middle"
                    >
                      🛗
                    </text>
                  </>
                );
              })()}
            </g>
          )}

          {/* ========================================================
              LAYER 3: LEVEL -300M (ZONE F) - DEEPEST
              ======================================================== */}
          {isLayerVisible('l3') && (
            <g id="layer-level-3">
              {/* Level wireframe boundary */}
              <polygon
                points={(() => {
                  const p1 = project(150, 100, 'ZONE F');
                  const p2 = project(850, 100, 'ZONE F');
                  const p3 = project(850, 400, 'ZONE F');
                  const p4 = project(150, 400, 'ZONE F');
                  return `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`;
                })()}
                fill="#0f172a"
                fillOpacity="0.6"
                stroke="#22d3ee"
                strokeWidth="1.5"
                strokeDasharray="4,4"
              />

              {/* Tunnels/Galleries at Level 3 */}
              {galleriesData
                .find((g) => g.level === 'l3')
                ?.paths.map((pStr, idx) => {
                  // Project 2D SVG path strings to 3D.
                  // For simplicity, we draw the pre-built projected geometry
                  return (
                    <path
                      key={idx}
                      d={pStr}
                      transform={(() => {
                        const radYaw = (yaw * Math.PI) / 180;
                        const radPitch = (pitch * Math.PI) / 180;
                        const scale = zoom;
                        const zOff = -3;
                        const yTranslate = zOff * spacing * scale;

                        // Simplified projection matrix for transform attribute
                        // matrix(a, b, c, d, e, f)
                        // x' = a*x + c*y + e
                        // y' = b*x + d*y + f
                        const a = Math.cos(radYaw) * scale;
                        const b = Math.sin(radYaw) * Math.sin(radPitch) * scale;
                        const c = -Math.sin(radYaw) * scale;
                        const d = Math.cos(radYaw) * Math.sin(radPitch) * scale;
                        const e =
                          500 * (1 - scale) -
                          (500 * Math.cos(radYaw) - 250 * Math.sin(radYaw)) * scale +
                          500 * scale;
                        const f =
                          250 * (1 - scale * Math.sin(radPitch)) -
                          (500 * Math.sin(radYaw) + 250 * Math.cos(radYaw)) *
                            Math.sin(radPitch) *
                            scale +
                          220 * scale +
                          yTranslate;

                        return `matrix(${a} ${b} ${c} ${d} ${e} ${f})`;
                      })()}
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.75"
                      filter="url(#glow-tunnels)"
                    />
                  );
                })}

              {/* Tunnels centerlines */}
              {galleriesData
                .find((g) => g.level === 'l3')
                ?.paths.map((pStr, idx) => {
                  return (
                    <path
                      key={`line-${idx}`}
                      d={pStr}
                      transform={(() => {
                        const radYaw = (yaw * Math.PI) / 180;
                        const radPitch = (pitch * Math.PI) / 180;
                        const scale = zoom;
                        const zOff = -3;
                        const yTranslate = zOff * spacing * scale;
                        const a = Math.cos(radYaw) * scale;
                        const b = Math.sin(radYaw) * Math.sin(radPitch) * scale;
                        const c = -Math.sin(radYaw) * scale;
                        const d = Math.cos(radYaw) * Math.sin(radPitch) * scale;
                        const e =
                          500 * (1 - scale) -
                          (500 * Math.cos(radYaw) - 250 * Math.sin(radYaw)) * scale +
                          500 * scale;
                        const f =
                          250 * (1 - scale * Math.sin(radPitch)) -
                          (500 * Math.sin(radYaw) + 250 * Math.cos(radYaw)) *
                            Math.sin(radPitch) *
                            scale +
                          220 * scale +
                          yTranslate;
                        return `matrix(${a} ${b} ${c} ${d} ${e} ${f})`;
                      })()}
                      fill="none"
                      stroke="#e0f7fa"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.9"
                    />
                  );
                })}

              {/* Label for Level -300m */}
              {(() => {
                const pt = project(180, 380, 'ZONE F');
                return (
                  <text
                    x={pt.x}
                    y={pt.y}
                    fill="#22d3ee"
                    fontSize="13"
                    fontWeight="bold"
                    filter="drop-shadow(0px 1px 3px rgba(0,0,0,0.8))"
                  >
                    Niveau -300m (Zone F - Services)
                  </text>
                );
              })()}
            </g>
          )}

          {/* ========================================================
              LAYER 2: LEVEL -200M (ZONE E)
              ======================================================== */}
          {isLayerVisible('l2') && (
            <g id="layer-level-2">
              <polygon
                points={(() => {
                  const p1 = project(150, 100, 'ZONE E');
                  const p2 = project(850, 100, 'ZONE E');
                  const p3 = project(850, 400, 'ZONE E');
                  const p4 = project(150, 400, 'ZONE E');
                  return `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`;
                })()}
                fill="#0f172a"
                fillOpacity="0.6"
                stroke="#f87171"
                strokeWidth="1.5"
                strokeDasharray="4,4"
              />

              {/* Galleries */}
              {galleriesData
                .find((g) => g.level === 'l2')
                ?.paths.map((pStr, idx) => {
                  return (
                    <path
                      key={idx}
                      d={pStr}
                      transform={(() => {
                        const radYaw = (yaw * Math.PI) / 180;
                        const radPitch = (pitch * Math.PI) / 180;
                        const scale = zoom;
                        const zOff = -2;
                        const yTranslate = zOff * spacing * scale;
                        const a = Math.cos(radYaw) * scale;
                        const b = Math.sin(radYaw) * Math.sin(radPitch) * scale;
                        const c = -Math.sin(radYaw) * scale;
                        const d = Math.cos(radYaw) * Math.sin(radPitch) * scale;
                        const e =
                          500 * (1 - scale) -
                          (500 * Math.cos(radYaw) - 250 * Math.sin(radYaw)) * scale +
                          500 * scale;
                        const f =
                          250 * (1 - scale * Math.sin(radPitch)) -
                          (500 * Math.sin(radYaw) + 250 * Math.cos(radYaw)) *
                            Math.sin(radPitch) *
                            scale +
                          220 * scale +
                          yTranslate;
                        return `matrix(${a} ${b} ${c} ${d} ${e} ${f})`;
                      })()}
                      fill="none"
                      stroke="#f87171"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.75"
                      filter="url(#glow-tunnels)"
                    />
                  );
                })}

              {/* Galleries centerlines */}
              {galleriesData
                .find((g) => g.level === 'l2')
                ?.paths.map((pStr, idx) => {
                  return (
                    <path
                      key={`line-${idx}`}
                      d={pStr}
                      transform={(() => {
                        const radYaw = (yaw * Math.PI) / 180;
                        const radPitch = (pitch * Math.PI) / 180;
                        const scale = zoom;
                        const zOff = -2;
                        const yTranslate = zOff * spacing * scale;
                        const a = Math.cos(radYaw) * scale;
                        const b = Math.sin(radYaw) * Math.sin(radPitch) * scale;
                        const c = -Math.sin(radYaw) * scale;
                        const d = Math.cos(radYaw) * Math.sin(radPitch) * scale;
                        const e =
                          500 * (1 - scale) -
                          (500 * Math.cos(radYaw) - 250 * Math.sin(radYaw)) * scale +
                          500 * scale;
                        const f =
                          250 * (1 - scale * Math.sin(radPitch)) -
                          (500 * Math.sin(radYaw) + 250 * Math.cos(radYaw)) *
                            Math.sin(radPitch) *
                            scale +
                          220 * scale +
                          yTranslate;
                        return `matrix(${a} ${b} ${c} ${d} ${e} ${f})`;
                      })()}
                      fill="none"
                      stroke="#ffebee"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.9"
                    />
                  );
                })}

              {/* Label */}
              {(() => {
                const pt = project(180, 380, 'ZONE E');
                return (
                  <text
                    x={pt.x}
                    y={pt.y}
                    fill="#f87171"
                    fontSize="13"
                    fontWeight="bold"
                    filter="drop-shadow(0px 1px 3px rgba(0,0,0,0.8))"
                  >
                    Niveau -200m (Zone E - Maintenance)
                  </text>
                );
              })()}
            </g>
          )}

          {/* ========================================================
              LAYER 1: LEVEL -100M (ZONE D)
              ======================================================== */}
          {isLayerVisible('l1') && (
            <g id="layer-level-1">
              <polygon
                points={(() => {
                  const p1 = project(150, 100, 'ZONE D');
                  const p2 = project(850, 100, 'ZONE D');
                  const p3 = project(850, 400, 'ZONE D');
                  const p4 = project(150, 400, 'ZONE D');
                  return `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`;
                })()}
                fill="#0f172a"
                fillOpacity="0.6"
                stroke="#c084fc"
                strokeWidth="1.5"
                strokeDasharray="4,4"
              />

              {/* Tunnels */}
              {galleriesData
                .find((g) => g.level === 'l1')
                ?.paths.map((pStr, idx) => {
                  return (
                    <path
                      key={idx}
                      d={pStr}
                      transform={(() => {
                        const radYaw = (yaw * Math.PI) / 180;
                        const radPitch = (pitch * Math.PI) / 180;
                        const scale = zoom;
                        const zOff = -1;
                        const yTranslate = zOff * spacing * scale;
                        const a = Math.cos(radYaw) * scale;
                        const b = Math.sin(radYaw) * Math.sin(radPitch) * scale;
                        const c = -Math.sin(radYaw) * scale;
                        const d = Math.cos(radYaw) * Math.sin(radPitch) * scale;
                        const e =
                          500 * (1 - scale) -
                          (500 * Math.cos(radYaw) - 250 * Math.sin(radYaw)) * scale +
                          500 * scale;
                        const f =
                          250 * (1 - scale * Math.sin(radPitch)) -
                          (500 * Math.sin(radYaw) + 250 * Math.cos(radYaw)) *
                            Math.sin(radPitch) *
                            scale +
                          220 * scale +
                          yTranslate;
                        return `matrix(${a} ${b} ${c} ${d} ${e} ${f})`;
                      })()}
                      fill="none"
                      stroke="#c084fc"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.75"
                      filter="url(#glow-tunnels)"
                    />
                  );
                })}

              {/* Tunnels centerlines */}
              {galleriesData
                .find((g) => g.level === 'l1')
                ?.paths.map((pStr, idx) => {
                  return (
                    <path
                      key={`line-${idx}`}
                      d={pStr}
                      transform={(() => {
                        const radYaw = (yaw * Math.PI) / 180;
                        const radPitch = (pitch * Math.PI) / 180;
                        const scale = zoom;
                        const zOff = -1;
                        const yTranslate = zOff * spacing * scale;
                        const a = Math.cos(radYaw) * scale;
                        const b = Math.sin(radYaw) * Math.sin(radPitch) * scale;
                        const c = -Math.sin(radYaw) * scale;
                        const d = Math.cos(radYaw) * Math.sin(radPitch) * scale;
                        const e =
                          500 * (1 - scale) -
                          (500 * Math.cos(radYaw) - 250 * Math.sin(radYaw)) * scale +
                          500 * scale;
                        const f =
                          250 * (1 - scale * Math.sin(radPitch)) -
                          (500 * Math.sin(radYaw) + 250 * Math.cos(radYaw)) *
                            Math.sin(radPitch) *
                            scale +
                          220 * scale +
                          yTranslate;
                        return `matrix(${a} ${b} ${c} ${d} ${e} ${f})`;
                      })()}
                      fill="none"
                      stroke="#faf5ff"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.9"
                    />
                  );
                })}

              {/* Label */}
              {(() => {
                const pt = project(180, 380, 'ZONE D');
                return (
                  <text
                    x={pt.x}
                    y={pt.y}
                    fill="#c084fc"
                    fontSize="13"
                    fontWeight="bold"
                    filter="drop-shadow(0px 1px 3px rgba(0,0,0,0.8))"
                  >
                    Niveau -100m (Zone D - Stockage)
                  </text>
                );
              })()}
            </g>
          )}

          {/* ========================================================
              LAYER 0: SURFACE & MINE A CIEL OUVERT & RAFFINERIE
              ======================================================== */}
          {isLayerVisible('surface') && (
            <g id="layer-surface">
              {/* Surface wireframe boundary */}
              <polygon
                points={(() => {
                  const p1 = project(150, 100, 'ZONE A');
                  const p2 = project(850, 100, 'ZONE A');
                  const p3 = project(850, 400, 'ZONE A');
                  const p4 = project(150, 400, 'ZONE A');
                  return `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`;
                })()}
                fill="#1e293b"
                fillOpacity="0.4"
                stroke="#f97316"
                strokeWidth="2"
              />

              {/* --------------------------------------------------
                  MINE A CIEL OUVERT / OPEN-PIT MINE
                  Nested ellipses representing concentric benches (gradins)
                  Placed in Zone A / B region (left to center)
                  -------------------------------------------------- */}
              <g id="open-pit-benches">
                {(() => {
                  // Draw concentric terraces going downwards inside the surface plane
                  const pitCenter = { x: 260, y: 220 };
                  const terraces = [
                    { rx: 110, ry: 70, color: '#475569', opacity: 0.8 },
                    { rx: 90, ry: 58, color: '#334155', opacity: 0.85 },
                    { rx: 70, ry: 45, color: '#1e293b', opacity: 0.9 },
                    { rx: 50, ry: 32, color: '#0f172a', opacity: 0.95 },
                    { rx: 30, ry: 20, color: '#020617', opacity: 1 },
                  ];

                  return (
                    <>
                      {/* Terraces */}
                      {terraces.map((t, idx) => {
                        const points: string[] = [];
                        const steps = 30;
                        for (let s = 0; s <= steps; s++) {
                          const angle = (s / steps) * 2 * Math.PI;
                          const tx = pitCenter.x + t.rx * Math.cos(angle);
                          const ty = pitCenter.y + t.ry * Math.sin(angle);
                          // Calculate projection at surface (Z=0), but push Y slightly down based on depth index to simulate 3D excavation
                          const pt = project(tx, ty + idx * 8, 'ZONE A');
                          points.push(`${pt.x},${pt.y}`);
                        }
                        return (
                          <polygon
                            key={`bench-${idx}`}
                            points={points.join(' ')}
                            fill={t.color}
                            fillOpacity={t.opacity}
                            stroke="#f97316"
                            strokeWidth="1"
                            strokeOpacity="0.5"
                          />
                        );
                      })}

                      {/* Spiral Ramps for Trucks */}
                      {(() => {
                        const rampPoints: string[] = [];
                        const turns = 1.8;
                        const steps = 50;
                        for (let s = 0; s <= steps; s++) {
                          const theta = (s / steps) * turns * 2 * Math.PI;
                          const r = 110 - (s / steps) * 80;
                          const tx = pitCenter.x + r * Math.cos(theta);
                          const ty = pitCenter.y + r * Math.sin(theta);
                          const pt = project(tx, ty + (s / steps) * 35, 'ZONE A');
                          rampPoints.push(`${pt.x},${pt.y}`);
                        }
                        return (
                          <polyline
                            points={rampPoints.join(' ')}
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="3"
                            strokeDasharray="4,2"
                            opacity="0.8"
                          />
                        );
                      })()}

                      {/* Open-Pit Label */}
                      {(() => {
                        const pt = project(260, 310, 'ZONE A');
                        return (
                          <text
                            x={pt.x}
                            y={pt.y}
                            fill="#f97316"
                            fontSize="12"
                            fontWeight="bold"
                            textAnchor="middle"
                            filter="drop-shadow(0px 1.5px 2px rgba(0,0,0,0.9))"
                          >
                            Mine à Ciel Ouvert (Zone A)
                          </text>
                        );
                      })()}
                    </>
                  );
                })()}
              </g>

              {/* --------------------------------------------------
                  RAFFINERIE / PROCESSING PLANT & REFINERY
                  Refinery factories, silos, and conveyors at Z = 0
                  Placed in Zone C (right part of surface)
                  -------------------------------------------------- */}
              <g id="refinery-plant">
                {(() => {
                  const refCenter = { x: 700, y: 200 };
                  const rPt = project(refCenter.x, refCenter.y, 'ZONE C');

                  // Draw 3D-like isometric buildings using custom SVG paths
                  // We'll draw 2 main blocks + silos + conveyor
                  return (
                    <g transform={`translate(${rPt.x}, ${rPt.y})`}>
                      {/* Ground footprint for Refinery */}
                      <ellipse
                        cx="0"
                        cy="0"
                        rx="90"
                        ry="40"
                        fill="#1e293b"
                        fillOpacity="0.8"
                        stroke="#22c55e"
                        strokeWidth="1"
                        strokeDasharray="3,3"
                      />

                      {/* Main Refinery Building (Isometric Cube) */}
                      <g transform="translate(-45, -25)">
                        {/* Left face */}
                        <path
                          d="M 0 0 L 25 -10 L 25 -40 L 0 -30 Z"
                          fill="#475569"
                          stroke="#334155"
                        />
                        {/* Right face */}
                        <path
                          d="M 25 -10 L 60 5 L 60 -25 L 25 -40 Z"
                          fill="#64748b"
                          stroke="#475569"
                        />
                        {/* Top face */}
                        <path
                          d="M 0 -30 L 25 -40 L 60 -25 L 35 -15 Z"
                          fill="#94a3b8"
                          stroke="#64748b"
                        />
                        {/* Chimneys */}
                        <line x1="12" y1="-35" x2="12" y2="-55" stroke="#475569" strokeWidth="4" />
                        <line x1="20" y1="-38" x2="20" y2="-62" stroke="#475569" strokeWidth="3" />
                        {/* Smoke pulses */}
                        <circle
                          cx="20"
                          cy="-65"
                          r="4"
                          fill="#cbd5e1"
                          opacity="0.6"
                          className="animate-ping"
                        />
                        <circle
                          cx="12"
                          cy="-58"
                          r="3.5"
                          fill="#cbd5e1"
                          opacity="0.4"
                          className="animate-ping"
                        />
                      </g>

                      {/* Silos (Cylinders) */}
                      <g transform="translate(20, -10)">
                        {/* Silo 1 */}
                        <path
                          d="M -15 10 L 0 17 L 0 -15 L -15 -22 Z"
                          fill="#334155"
                          stroke="#1e293b"
                        />
                        <path
                          d="M 0 17 L 15 10 L 15 -22 L 0 -15 Z"
                          fill="#475569"
                          stroke="#334155"
                        />
                        <ellipse cx="0" cy="-15" rx="15" ry="7" fill="#64748b" stroke="#475569" />

                        {/* Silo 2 */}
                        <g transform="translate(25, -10)">
                          <path
                            d="M -10 8 L 0 13 L 0 -12 L -10 -17 Z"
                            fill="#334155"
                            stroke="#1e293b"
                          />
                          <path
                            d="M 0 13 L 10 8 L 10 -12 L 0 -12 Z"
                            fill="#475569"
                            stroke="#334155"
                          />
                          <ellipse cx="0" cy="-12" rx="10" ry="5" fill="#64748b" stroke="#475569" />
                        </g>
                      </g>

                      {/* Conveyor Belt (Convecteur) */}
                      <line x1="-30" y1="-5" x2="10" y2="-20" stroke="#f59e0b" strokeWidth="2.5" />
                      <line x1="-30" y1="-2" x2="10" y2="-17" stroke="#334155" strokeWidth="1" />
                      <line x1="-30" y1="-8" x2="10" y2="-23" stroke="#334155" strokeWidth="1" />
                      {/* Tiny supports */}
                      <line x1="-15" y1="-12" x2="-15" y2="5" stroke="#64748b" strokeWidth="1.5" />
                      <line x1="-2" y1="-16" x2="-2" y2="10" stroke="#64748b" strokeWidth="1.5" />

                      {/* Refinery Label */}
                      <text
                        x="0"
                        y="30"
                        fill="#22c55e"
                        fontSize="12"
                        fontWeight="bold"
                        textAnchor="middle"
                        filter="drop-shadow(0px 1.5px 2px rgba(0,0,0,0.9))"
                      >
                        Usine &amp; Raffinerie (Zone C)
                      </text>
                    </g>
                  );
                })()}
              </g>

              {/* Surface road connecting Open-pit to Usine */}
              {(() => {
                const p1 = project(380, 220, 'ZONE B');
                const p2 = project(600, 200, 'ZONE B');
                return (
                  <path
                    d={`M ${p1.x} ${p1.y} Q ${(p1.x + p2.x) / 2} ${(p1.y + p2.y) / 2 - 10} ${p2.x} ${p2.y}`}
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="6"
                    opacity="0.6"
                    strokeLinecap="round"
                  />
                );
              })()}
              {/* Road center dash */}
              {(() => {
                const p1 = project(380, 220, 'ZONE B');
                const p2 = project(600, 200, 'ZONE B');
                return (
                  <path
                    d={`M ${p1.x} ${p1.y} Q ${(p1.x + p2.x) / 2} ${(p1.y + p2.y) / 2 - 10} ${p2.x} ${p2.y}`}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="1.2"
                    strokeDasharray="4,4"
                    opacity="0.8"
                  />
                );
              })()}
              {/* Zone B label */}
              {(() => {
                const pt = project(480, 180, 'ZONE B');
                return (
                  <text
                    x={pt.x}
                    y={pt.y}
                    fill="#3b82f6"
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                    filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.8))"
                  >
                    Transport Ramps (Zone B)
                  </text>
                );
              })()}
            </g>
          )}

          {/* ========================================================
              3D GATEWAYS (📡)
              ======================================================== */}
          {showGateways &&
            gateways.map((gw) => {
              if (
                !isLayerVisible(
                  gw.zone === 'ZONE D'
                    ? 'l1'
                    : gw.zone === 'ZONE E'
                      ? 'l2'
                      : gw.zone === 'ZONE F'
                        ? 'l3'
                        : 'surface',
                )
              )
                return null;
              const pt = project(gw.x, gw.y, gw.zone);
              return (
                <g key={gw.id} transform={`translate(${pt.x}, ${pt.y})`} className="cursor-pointer">
                  {/* 3D vertical post */}
                  <line x1="0" y1="0" x2="0" y2="-18" stroke="#06b6d4" strokeWidth="2.5" />
                  <circle cx="0" cy="-18" r="5" fill="#06b6d4" />
                  {/* Wireless waves */}
                  <ellipse
                    cx="0"
                    cy="-18"
                    rx="8"
                    ry="4"
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="1"
                    className="animate-ping"
                  />
                  {/* Base platform */}
                  <ellipse
                    cx="0"
                    cy="0"
                    rx="10"
                    ry="5"
                    fill="rgba(6,182,212,0.4)"
                    stroke="#06b6d4"
                    strokeWidth="1"
                  />
                  <text
                    x="12"
                    y="-12"
                    fontSize="9"
                    fill="#22d3ee"
                    fontWeight="bold"
                    filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.9))"
                  >
                    {gw.id}
                  </text>
                </g>
              );
            })}

          {/* ========================================================
              3D TRAJECTORY LAYER (Isometric line paths)
              ======================================================== */}
          {showTrajectories &&
            selectedMiner &&
            (() => {
              const minerZone = selectedMiner.currentZone;
              const layer =
                minerZone === 'ZONE D'
                  ? 'l1'
                  : minerZone === 'ZONE E'
                    ? 'l2'
                    : minerZone === 'ZONE F'
                      ? 'l3'
                      : 'surface';
              if (!isLayerVisible(layer)) return null;

              // Generate projected points
              const pts = selectedMiner.trajectory.map((tPos) => {
                const ptZone = getZoneForCoords(tPos.x, tPos.y);
                return project(tPos.x, tPos.y, ptZone);
              });
              if (pts.length < 2) return null;

              const pathD = `M ${pts.map((p) => `${p.x} ${p.y}`).join(' L ')}`;
              return (
                <g id="trajectory-3d">
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.85"
                    strokeDasharray="4,2"
                  />
                  {/* Arrowhead at current position */}
                  <circle
                    cx={pts[pts.length - 1].x}
                    cy={pts[pts.length - 1].y}
                    r="6"
                    fill="#fbbf24"
                    stroke="#fff"
                    strokeWidth="1.5"
                  />
                </g>
              );
            })()}

          {/* ========================================================
              3D MINERS & VEHICLES (👷 / 🚚)
              ======================================================== */}
          {miners.map((miner) => {
            const mZone = miner.currentZone;
            const layer =
              mZone === 'ZONE D'
                ? 'l1'
                : mZone === 'ZONE E'
                  ? 'l2'
                  : mZone === 'ZONE F'
                    ? 'l3'
                    : 'surface';
            if (!isLayerVisible(layer)) return null;

            // Project coordinate
            const pt = project(miner.position.x, miner.position.y, mZone);
            const isSelected = selectedMiner?.id === miner.id;
            const vehicle = getMinerVehicle(miner);

            // Get color status
            const statusColor =
              miner.status === 'danger'
                ? '#ef4444'
                : miner.status === 'warning'
                  ? '#f59e0b'
                  : '#10b981';

            const statusBg =
              miner.status === 'danger'
                ? 'rgba(239, 68, 68, 0.4)'
                : miner.status === 'warning'
                  ? 'rgba(245, 158, 11, 0.3)'
                  : 'rgba(16, 185, 129, 0.25)';

            return (
              <g
                key={miner.id}
                transform={`translate(${pt.x}, ${pt.y})`}
                onClick={() => onMinerClick(miner)}
                onMouseEnter={() => setHoveredMiner(miner)}
                onMouseLeave={() => setHoveredMiner(null)}
                className="cursor-pointer"
              >
                {/* Pulsing ring for alerts */}
                {showAlerts && miner.status === 'danger' && (
                  <ellipse
                    rx="22"
                    ry="11"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2.5"
                    filter="url(#glow-danger)"
                    className="animate-ping"
                  />
                )}

                {/* Selection circle */}
                {isSelected && (
                  <ellipse
                    rx="18"
                    ry="9"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    className="animate-pulse"
                  />
                )}

                {/* 3D Base Shadow/Pedestal */}
                <ellipse rx="14" ry="7" fill={statusBg} stroke={statusColor} strokeWidth="1.5" />

                {/* Miner Icon (Vehicle or Helmet) */}
                <g transform="translate(0, -6)">
                  {vehicle ? (
                    // Machine / Vehicle Representation
                    <g>
                      {/* Bubble border */}
                      <circle
                        cx="0"
                        cy="-6"
                        r="11"
                        fill="#1e293b"
                        stroke={statusColor}
                        strokeWidth="2"
                      />
                      {/* Vehicle emoji centered */}
                      <text x="0" y="-2" fontSize="12" textAnchor="middle">
                        {getVehicleEmoji(vehicle)}
                      </text>
                      {/* Vehicle Label tag */}
                      <rect
                        x="-18"
                        y="7"
                        width="36"
                        height="8"
                        rx="2"
                        fill="#0f172a"
                        opacity="0.8"
                      />
                      <text
                        x="0"
                        y="13"
                        fontSize="6.5"
                        fill="#e2e8f0"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {vehicle.toUpperCase()}
                      </text>
                    </g>
                  ) : (
                    // On foot: helmet representation
                    <g>
                      {/* Bubble border */}
                      <circle
                        cx="0"
                        cy="-6"
                        r="10"
                        fill="#1e293b"
                        stroke={statusColor}
                        strokeWidth="2"
                      />
                      {/* Helmet emoji */}
                      <text x="0" y="-1" fontSize="11" textAnchor="middle">
                        👷
                      </text>
                    </g>
                  )}
                </g>

                {/* Minimalist name tag on hover or selection */}
                {(isSelected || hoveredMiner?.id === miner.id) && (
                  <g transform="translate(0, -32)">
                    <rect
                      x="-35"
                      y="-10"
                      width="70"
                      height="15"
                      rx="3"
                      fill="#0f172a"
                      stroke="#fff"
                      strokeWidth="0.5"
                    />
                    <text
                      x="0"
                      y="1"
                      fontSize="8"
                      fill="#fff"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {miner.name.split(' ')[0]}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Legend Panel (Integrated inside 3D Canvas) */}
        <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
          <div className="bg-[#1e293b]/90 border border-gray-700 backdrop-blur-sm rounded-lg p-3 text-xs text-gray-300 shadow-xl space-y-1.5 min-w-[170px]">
            <h5 className="font-bold text-white border-b border-gray-700 pb-1 mb-1.5">
              Légende des Icônes
            </h5>
            <div className="flex items-center gap-2">
              <span className="text-base">👷</span>
              <span>Mineur à pied (Casque)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base">🚚</span>
              <span>Conducteur de Camion (Engin)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base">🚜</span>
              <span>Opérateur d'Excavatrice</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base">📡</span>
              <span>Gateway LoRa active</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-500 font-bold">⚠️</span>
              <span>Alerte Active (Danger / SOS)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
