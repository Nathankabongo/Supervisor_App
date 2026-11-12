import { useEffect, useMemo, useState } from 'react';
import { Layers, Radio, AlertTriangle, Users } from 'lucide-react';
import apiService, { MineMapData } from '../../services/api';
import { Miner } from '../../store/useStore';

interface UndergroundMapProps {
  miners: Miner[];
  selectedMiner: Miner | null;
  onSelectMiner: (miner: Miner) => void;
  zoom?: number;
}

export default function UndergroundMap({
  miners,
  selectedMiner,
  onSelectMiner,
  zoom = 1,
}: UndergroundMapProps) {
  const [mineMap, setMineMap] = useState<MineMapData | null>(null);
  const [activeLevelId, setActiveLevelId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    apiService
      .getMineMap()
      .then((data) => {
        if (!mounted) return;
        setMineMap(data);
        if (data.levels?.length) {
          setActiveLevelId((prev) =>
            data.levels.some((l) => l.id === prev) ? prev : data.levels[0].id,
          );
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Erreur chargement carte souterraine:', err);
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const levels = mineMap?.levels || [];
  const activeLevel = useMemo(
    () => levels.find((l) => l.id === activeLevelId) || levels[0] || null,
    [levels, activeLevelId],
  );

  const levelNodes = useMemo(
    () => (mineMap?.nodes || []).filter((n) => n.level_id === activeLevel?.id),
    [mineMap, activeLevel],
  );
  const levelSegments = useMemo(
    () => (mineMap?.segments || []).filter((s) => s.level_id === activeLevel?.id),
    [mineMap, activeLevel],
  );
  const levelAnchors = useMemo(
    () => (mineMap?.anchors || []).filter((a) => a.level_id === activeLevel?.id),
    [mineMap, activeLevel],
  );
  const deviceMap = useMemo(
    () => new Map((mineMap?.devices || []).map((d) => [d.id, d])),
    [mineMap],
  );
  const nodeMap = useMemo(
    () => new Map(levelNodes.map((n) => [n.id, n])),
    [levelNodes],
  );

  // Mineurs localisés sous terre sur ce niveau (via BLE IPS ou PDR)
  const levelMiners = useMemo(() => {
    if (!activeLevel) return [];
    return miners.filter((m) => {
      const isIndoor = m.positionSource === 'ble_ips' || m.positionSource === 'pdr';
      if (!isIndoor && !m.levelId) return false;
      return m.levelId ? m.levelId === activeLevel.id : true;
    });
  }, [miners, activeLevel]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#08121e] text-slate-400 text-xs">
        Chargement de la carte souterraine...
      </div>
    );
  }

  if (!activeLevel) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#08121e] text-center p-6 space-y-2">
        <Layers size={28} className="text-cyan-400/70" />
        <p className="text-sm font-semibold text-white">
          Aucune carte souterraine configurée
        </p>
        <p className="text-xs text-slate-400 max-w-md">
          Rendez-vous dans <span className="text-cyan-300 font-semibold">Configuration GIS → Souterrain</span>{' '}
          pour modéliser vos niveaux, tracer vos galeries et placer vos balises Ulinzi Box.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#08121e]">
      {/* Barre de sélection de niveau */}
      <div className="px-3 py-2 bg-[#0f172a] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Layers size={14} className="text-cyan-400 mr-1" />
          {levels.map((lvl) => (
            <button
              key={lvl.id}
              type="button"
              onClick={() => setActiveLevelId(lvl.id)}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                lvl.id === activeLevel.id
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {lvl.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Radio size={12} className="text-purple-400" /> {levelAnchors.length} Ulinzi Box
          </span>
          <span className="flex items-center gap-1">
            <Users size={12} className="text-cyan-400" /> {levelMiners.length} mineur(s) IPS
          </span>
        </div>
      </div>

      {/* Canvas métrique temps réel */}
      <div className="flex-1 overflow-auto p-2">
        <svg
          viewBox={`0 0 ${activeLevel.width_m} ${activeLevel.height_m}`}
          style={{ width: `${zoom * 100}%`, minWidth: '100%' }}
          className="block select-none"
        >
          <defs>
            <pattern id="ug-grid-10" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1e293b" strokeWidth="0.3" />
            </pattern>
          </defs>
          <rect width={activeLevel.width_m} height={activeLevel.height_m} fill="url(#ug-grid-10)" />

          {activeLevel.background_image && (
            <image
              href={activeLevel.background_image}
              x={0}
              y={0}
              width={activeLevel.width_m}
              height={activeLevel.height_m}
              opacity={activeLevel.background_opacity ?? 0.35}
              preserveAspectRatio="none"
            />
          )}

          {/* Galeries */}
          {levelSegments.map((seg) => {
            const a = nodeMap.get(seg.from_node_id);
            const b = nodeMap.get(seg.to_node_id);
            if (!a || !b) return null;
            const wall =
              seg.status === 'blocked'
                ? '#7f1d1d'
                : seg.status === 'restricted'
                  ? '#78350f'
                  : '#1e293b';
            const line =
              seg.status === 'blocked'
                ? '#ef4444'
                : seg.status === 'restricted'
                  ? '#f59e0b'
                  : '#38bdf8';
            return (
              <g key={seg.id}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={wall}
                  strokeWidth={Math.max(2, seg.width_m)}
                  strokeLinecap="round"
                />
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={line}
                  strokeWidth={0.5}
                  strokeDasharray="2 1.5"
                />
                {seg.name && (
                  <text
                    x={(a.x + b.x) / 2}
                    y={(a.y + b.y) / 2 - 2}
                    textAnchor="middle"
                    fontSize="3"
                    fill="#94a3b8"
                  >
                    {seg.name}
                  </text>
                )}
              </g>
            );
          })}

          {/* Nœuds / Points clés */}
          {levelNodes.map((n) => {
            const color =
              n.type === 'shaft'
                ? '#a855f7'
                : n.type === 'exit'
                  ? '#22c55e'
                  : n.type === 'refuge'
                    ? '#f59e0b'
                    : '#38bdf8';
            return (
              <g key={n.id}>
                <circle cx={n.x} cy={n.y} r={2} fill={color} stroke="#0f172a" strokeWidth={0.5} />
                {n.label && (
                  <text
                    x={n.x}
                    y={n.y - 3.2}
                    textAnchor="middle"
                    fontSize="3"
                    fontWeight="600"
                    fill="#e2e8f0"
                  >
                    {n.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Balises Ulinzi Box */}
          {levelAnchors.map((a) => {
            const dev = deviceMap.get(a.device_id);
            const isOnline = dev?.status === 'ONLINE';
            return (
              <g key={a.id}>
                <circle
                  cx={a.x}
                  cy={a.y}
                  r={15}
                  fill="#a855f7"
                  fillOpacity={0.05}
                  stroke="#a855f7"
                  strokeOpacity={0.25}
                  strokeWidth={0.35}
                  strokeDasharray="1.5 1.5"
                />
                <rect
                  x={a.x - 2}
                  y={a.y - 2}
                  width={4}
                  height={4}
                  rx={0.8}
                  fill={isOnline ? '#22c55e' : '#a855f7'}
                  stroke="#ffffff"
                  strokeWidth={0.4}
                />
                <text
                  x={a.x}
                  y={a.y + 5.5}
                  textAnchor="middle"
                  fontSize="2.8"
                  fontWeight="700"
                  fill="#d8b4fe"
                >
                  {a.device_id}
                </text>
              </g>
            );
          })}

          {/* Mineurs en temps réel */}
          {levelMiners.map((m) => {
            const mx = m.position?.x ?? 0;
            const my = m.position?.y ?? 0;
            const isSel = selectedMiner?.id === m.id;
            const statusColor =
              m.status === 'danger'
                ? '#ef4444'
                : m.status === 'warning'
                  ? '#f59e0b'
                  : '#22c55e';
            const unc = Math.min(25, Math.max(3, m.uncertaintyM || 5));

            return (
              <g
                key={m.id}
                className="cursor-pointer"
                onClick={() => onSelectMiner(m)}
              >
                <circle
                  cx={mx}
                  cy={my}
                  r={unc}
                  fill={statusColor}
                  fillOpacity={0.12}
                  stroke={statusColor}
                  strokeOpacity={0.45}
                  strokeWidth={0.4}
                />
                {isSel && (
                  <circle
                    cx={mx}
                    cy={my}
                    r={4.8}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={0.6}
                  />
                )}
                <circle
                  cx={mx}
                  cy={my}
                  r={3}
                  fill={statusColor}
                  stroke="#0f172a"
                  strokeWidth={0.7}
                />
                <text
                  x={mx}
                  y={my - 4.5}
                  textAnchor="middle"
                  fontSize="3.4"
                  fontWeight="700"
                  fill="#ffffff"
                >
                  {m.matricule || m.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {levelMiners.length === 0 && (
        <div className="px-3 py-1.5 bg-slate-900/80 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
          <AlertTriangle size={12} className="text-amber-400" />
          Aucun mineur détecté sous terre sur ce niveau (en attente de balises BLE Ulinzi Box).
        </div>
      )}
    </div>
  );
}

