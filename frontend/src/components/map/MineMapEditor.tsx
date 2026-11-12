import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Save,
  Plus,
  Trash2,
  MousePointer,
  GitCommitHorizontal,
  MapPin,
  Radio,
  Upload,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Info,
  ShieldAlert,
  X,
  Download,
} from 'lucide-react';
import apiService, {
  MineAnchor,
  MineLevel,
  MineMapDevice,
  MineNode,
  MineSegment,
} from '../../services/api';

type ToolMode = 'select' | 'gallery' | 'poi' | 'anchor';
type SelectedItem =
  | { kind: 'node'; id: string }
  | { kind: 'segment'; id: string }
  | { kind: 'anchor'; id: string }
  | null;

const NODE_COLORS: Record<MineNode['type'], string> = {
  junction: '#38bdf8',
  shaft: '#a855f7',
  exit: '#22c55e',
  refuge: '#f59e0b',
};

const NODE_LABELS: Record<MineNode['type'], string> = {
  junction: 'Jonction',
  shaft: 'Puits',
  exit: 'Sortie',
  refuge: 'Refuge',
};

function distPointToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export default function MineMapEditor() {
  const [levels, setLevels] = useState<MineLevel[]>([]);
  const [nodes, setNodes] = useState<MineNode[]>([]);
  const [segments, setSegments] = useState<MineSegment[]>([]);
  const [anchors, setAnchors] = useState<MineAnchor[]>([]);
  const [devices, setDevices] = useState<MineMapDevice[]>([]);

  const [activeLevelId, setActiveLevelId] = useState<string>('');
  const [tool, setTool] = useState<ToolMode>('select');
  const [poiType, setPoiType] = useState<MineNode['type']>('junction');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [pendingFromNodeId, setPendingFromNodeId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);
  const [dragging, setDragging] = useState<{ kind: 'node' | 'anchor'; id: string } | null>(null);
  const [cursorMeters, setCursorMeters] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState<number>(1);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        if (!Array.isArray(parsed.levels) || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.segments)) {
          setError('Fichier JSON invalide : levels, nodes et segments sont requis.');
          return;
        }
        setLevels(parsed.levels);
        setNodes(parsed.nodes);
        setSegments(parsed.segments);
        setAnchors(Array.isArray(parsed.anchors) ? parsed.anchors : []);
        if (parsed.levels.length > 0) setActiveLevelId(parsed.levels[0].id);
        setSelectedItem(null);
        setPendingFromNodeId(null);
        setSuccessMsg('Carte JSON importée. Cliquez sur "Sauvegarder la carte souterraine" pour enregistrer.');
      } catch {
        setError('Impossible de lire le fichier JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportJson = () => {
    const blob = new Blob(
      [JSON.stringify({ levels, nodes, segments, anchors }, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'carte_mine_souterraine.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadMineMap = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getMineMap();
      setLevels(data.levels || []);
      setNodes(data.nodes || []);
      setSegments(data.segments || []);
      setAnchors(data.anchors || []);
      setDevices(data.devices || []);
      if (data.levels?.length) {
        setActiveLevelId((prev) =>
          data.levels.some((l) => l.id === prev) ? prev : data.levels[0].id,
        );
      }
      if (data.devices?.length && !selectedDeviceId) {
        setSelectedDeviceId(data.devices[0].id);
      }
    } catch (err) {
      console.error(err);
      setError('Impossible de charger la cartographie souterraine.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMineMap();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPendingFromNodeId(null);
        setSelectedItem(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const activeLevel = useMemo(
    () => levels.find((l) => l.id === activeLevelId) || levels[0] || null,
    [levels, activeLevelId],
  );

  const levelNodes = useMemo(
    () => nodes.filter((n) => n.level_id === activeLevel?.id),
    [nodes, activeLevel],
  );

  const levelSegments = useMemo(
    () => segments.filter((s) => s.level_id === activeLevel?.id),
    [segments, activeLevel],
  );

  const levelAnchors = useMemo(
    () => anchors.filter((a) => a.level_id === activeLevel?.id),
    [anchors, activeLevel],
  );

  const nodeMap = useMemo(() => {
    const m = new Map<string, MineNode>();
    levelNodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [levelNodes]);

  const toMeterCoords = (e: React.MouseEvent<SVGSVGElement>): { x: number; y: number } | null => {
    if (!svgRef.current || !activeLevel) return null;
    const rect = svgRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const rawX = ((e.clientX - rect.left) / rect.width) * activeLevel.width_m;
    const rawY = ((e.clientY - rect.top) / rect.height) * activeLevel.height_m;
    return {
      x: Number(Math.max(0, Math.min(activeLevel.width_m, rawX)).toFixed(1)),
      y: Number(Math.max(0, Math.min(activeLevel.height_m, rawY)).toFixed(1)),
    };
  };

  const findNearestSegmentId = (x: number, y: number): string | null => {
    let bestId: string | null = null;
    let bestDist = 12; // 12m max snap radius
    for (const seg of levelSegments) {
      const a = nodeMap.get(seg.from_node_id);
      const b = nodeMap.get(seg.to_node_id);
      if (!a || !b) continue;
      const d = distPointToSegment(x, y, a.x, a.y, b.x, b.y);
      if (d < bestDist) {
        bestDist = d;
        bestId = seg.id;
      }
    }
    return bestId;
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const pt = toMeterCoords(e);
    if (!pt) return;
    setCursorMeters(pt);

    if (dragging) {
      if (dragging.kind === 'node') {
        setNodes((prev) =>
          prev.map((n) => (n.id === dragging.id ? { ...n, x: pt.x, y: pt.y } : n)),
        );
      } else if (dragging.kind === 'anchor') {
        const segId = findNearestSegmentId(pt.x, pt.y);
        setAnchors((prev) =>
          prev.map((a) =>
            a.id === dragging.id ? { ...a, x: pt.x, y: pt.y, segment_id: segId } : a,
          ),
        );
      }
    }
  };

  const handleSvgMouseUp = () => {
    setDragging(null);
  };

  const createNodeAt = (x: number, y: number, type: MineNode['type']): MineNode => {
    const id = `N-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const newNode: MineNode = {
      id,
      level_id: activeLevel!.id,
      x,
      y,
      type,
      label: type === 'junction' ? '' : `${NODE_LABELS[type]}`,
      zone: 'ZONE A',
    };
    setNodes((prev) => [...prev, newNode]);
    return newNode;
  };

  const createSegmentBetween = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const exists = segments.some(
      (s) =>
        s.level_id === activeLevel!.id &&
        ((s.from_node_id === fromId && s.to_node_id === toId) ||
          (s.from_node_id === toId && s.to_node_id === fromId)),
    );
    if (exists) return;
    const seg: MineSegment = {
      id: `SEG-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      level_id: activeLevel!.id,
      from_node_id: fromId,
      to_node_id: toId,
      name: `Galerie ${levelSegments.length + 1}`,
      width_m: 4,
      status: 'open',
    };
    setSegments((prev) => [...prev, seg]);
    setSelectedItem({ kind: 'segment', id: seg.id });
  };

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!activeLevel || dragging) return;
    const pt = toMeterCoords(e);
    if (!pt) return;

    if (tool === 'gallery') {
      const created = createNodeAt(pt.x, pt.y, 'junction');
      if (pendingFromNodeId) {
        createSegmentBetween(pendingFromNodeId, created.id);
      }
      setPendingFromNodeId(created.id);
    } else if (tool === 'poi') {
      const created = createNodeAt(pt.x, pt.y, poiType);
      setSelectedItem({ kind: 'node', id: created.id });
    } else if (tool === 'anchor') {
      if (!selectedDeviceId) {
        setError('Sélectionnez une Ulinzi Box à placer.');
        return;
      }
      const segId = findNearestSegmentId(pt.x, pt.y);
      const existing = anchors.find((a) => a.device_id === selectedDeviceId);
      if (existing) {
        setAnchors((prev) =>
          prev.map((a) =>
            a.device_id === selectedDeviceId
              ? { ...a, level_id: activeLevel.id, segment_id: segId, x: pt.x, y: pt.y }
              : a,
          ),
        );
        setSelectedItem({ kind: 'anchor', id: existing.id });
      } else {
        const newAnchor: MineAnchor = {
          id: `ANC-${Date.now().toString(36)}`,
          device_id: selectedDeviceId,
          level_id: activeLevel.id,
          segment_id: segId,
          x: pt.x,
          y: pt.y,
          tx_power: -59,
          path_loss_n: 2.3,
        };
        setAnchors((prev) => [...prev, newAnchor]);
        setSelectedItem({ kind: 'anchor', id: newAnchor.id });
      }
    } else {
      setSelectedItem(null);
    }
  };

  const handleNodeClick = (e: React.MouseEvent, node: MineNode) => {
    e.stopPropagation();
    if (tool === 'gallery') {
      if (pendingFromNodeId && pendingFromNodeId !== node.id) {
        createSegmentBetween(pendingFromNodeId, node.id);
      }
      setPendingFromNodeId(node.id);
      return;
    }
    setSelectedItem({ kind: 'node', id: node.id });
  };

  const handleAddLevel = () => {
    const newId = `LVL-${Date.now().toString(36)}`;
    const nextDepth = levels.length * -50;
    const newLevel: MineLevel = {
      id: newId,
      name: `Niveau ${nextDepth} m`,
      depth_m: nextDepth,
      width_m: 200,
      height_m: 120,
      background_image: null,
      background_opacity: 0.35,
      sort_order: levels.length,
    };
    setLevels((prev) => [...prev, newLevel]);
    setActiveLevelId(newId);
    setPendingFromNodeId(null);
    setSelectedItem(null);
  };

  const handleDeleteLevel = (levelId: string) => {
    if (levels.length <= 1) return;
    const remaining = levels.filter((l) => l.id !== levelId);
    setLevels(remaining);
    setNodes((prev) => prev.filter((n) => n.level_id !== levelId));
    setSegments((prev) => prev.filter((s) => s.level_id !== levelId));
    setAnchors((prev) => prev.filter((a) => a.level_id !== levelId));
    setActiveLevelId(remaining[0].id);
    setSelectedItem(null);
  };

  const updateActiveLevel = (patch: Partial<MineLevel>) => {
    if (!activeLevel) return;
    setLevels((prev) => prev.map((l) => (l.id === activeLevel.id ? { ...l, ...patch } : l)));
  };

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3.5 * 1024 * 1024) {
      setError('Image trop volumineuse (max 3.5 Mo).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateActiveLevel({ background_image: String(reader.result || '') });
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteSelected = () => {
    if (!selectedItem) return;
    if (selectedItem.kind === 'node') {
      const nid = selectedItem.id;
      setNodes((prev) => prev.filter((n) => n.id !== nid));
      setSegments((prev) => prev.filter((s) => s.from_node_id !== nid && s.to_node_id !== nid));
    } else if (selectedItem.kind === 'segment') {
      setSegments((prev) => prev.filter((s) => s.id !== selectedItem.id));
    } else if (selectedItem.kind === 'anchor') {
      setAnchors((prev) => prev.filter((a) => a.id !== selectedItem.id));
    }
    setSelectedItem(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await apiService.saveMineMap({ levels, nodes, segments, anchors });
      setLevels(res.levels || levels);
      setNodes(res.nodes || nodes);
      setSegments(res.segments || segments);
      setAnchors(res.anchors || anchors);
      setSuccessMsg('Carte souterraine et ancres Ulinzi Box sauvegardées.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error(err);
      setError('Erreur lors de la sauvegarde de la carte souterraine.');
    } finally {
      setSaving(false);
    }
  };

  const selectedNode =
    selectedItem?.kind === 'node' ? nodes.find((n) => n.id === selectedItem.id) || null : null;
  const selectedSegment =
    selectedItem?.kind === 'segment'
      ? segments.find((s) => s.id === selectedItem.id) || null
      : null;
  const selectedAnchor =
    selectedItem?.kind === 'anchor' ? anchors.find((a) => a.id === selectedItem.id) || null : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-300 text-sm">
        Chargement de la cartographie souterraine...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-950/80 border border-red-500/50 text-red-200 px-4 py-2.5 rounded-lg flex items-center justify-between text-xs">
          <span className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-red-400 shrink-0" />
            {error}
          </span>
          <button onClick={() => setError(null)} className="text-red-300 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 px-4 py-2.5 rounded-lg flex items-center gap-2 text-xs">
          <Info size={16} className="text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Top Toolbar: Levels + Save */}
      <div className="bg-[#1e293b] border border-gray-700 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mr-1">
            <Layers size={15} className="text-cyan-400" />
            Niveaux :
          </span>
          {levels.map((lvl) => (
            <button
              key={lvl.id}
              type="button"
              onClick={() => {
                setActiveLevelId(lvl.id);
                setPendingFromNodeId(null);
                setSelectedItem(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                lvl.id === activeLevel?.id
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {lvl.name}
            </button>
          ))}
          <button
            type="button"
            onClick={handleAddLevel}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 flex items-center gap-1"
          >
            <Plus size={14} /> Niveau
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportJson}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => jsonInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 flex items-center gap-1.5"
          >
            <Upload size={14} /> Importer JSON
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5"
          >
            <Download size={14} /> Exporter JSON
          </button>
          <button
            type="button"
            onClick={loadMineMap}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5"
          >
            <RotateCcw size={14} /> Recharger
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'Sauvegarde...' : 'Sauvegarder la carte souterraine'}
          </button>
        </div>
      </div>

      {/* Main Editor Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Sidebar: Tools, Level Settings & Inspector */}
        <div className="lg:col-span-4 space-y-4">
          {/* Drawing Tools */}
          <div className="bg-[#1e293b] border border-gray-700 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Outils de Cartographie
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTool('select');
                  setPendingFromNodeId(null);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border ${
                  tool === 'select'
                    ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300'
                    : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <MousePointer size={14} /> Sélection / Déplacer
              </button>
              <button
                type="button"
                onClick={() => setTool('gallery')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border ${
                  tool === 'gallery'
                    ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300'
                    : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <GitCommitHorizontal size={14} /> Tracer Galerie
              </button>
              <button
                type="button"
                onClick={() => {
                  setTool('poi');
                  setPendingFromNodeId(null);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border ${
                  tool === 'poi'
                    ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300'
                    : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <MapPin size={14} /> Point Clé (POI)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTool('anchor');
                  setPendingFromNodeId(null);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border ${
                  tool === 'anchor'
                    ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                    : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Radio size={14} /> Placer Ulinzi Box
              </button>
            </div>

            {tool === 'gallery' && (
              <p className="text-[11px] text-cyan-300/90 bg-cyan-950/40 border border-cyan-500/30 rounded-lg p-2">
                Cliquez sur la carte ou sur un nœud existant pour tracer des segments de galerie
                connectés. Appuyez sur <kbd className="px-1 bg-slate-800 rounded">Échap</kbd> pour
                terminer la chaîne.
              </p>
            )}

            {tool === 'poi' && (
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-400">Type de point clé :</label>
                <select
                  value={poiType}
                  onChange={(e) => setPoiType(e.target.value as MineNode['type'])}
                  className="w-full bg-[#0b1a2a] border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="shaft">Puits / Descente</option>
                  <option value="exit">Sortie de secours</option>
                  <option value="refuge">Chambre de refuge</option>
                  <option value="junction">Jonction / Carrefour</option>
                </select>
              </div>
            )}

            {tool === 'anchor' && (
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-400">
                  Ulinzi Box à positionner (balise BLE) :
                </label>
                {devices.length === 0 ? (
                  <p className="text-[11px] text-amber-300 bg-amber-950/40 border border-amber-500/30 rounded-lg p-2">
                    Aucune Ulinzi Box enregistrée dans Appareils. Ajoutez d&apos;abord un boîtier ou
                    connectez-le au backend.
                  </p>
                ) : (
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="w-full bg-[#0b1a2a] border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    {devices.map((d) => {
                      const placed = anchors.some((a) => a.device_id === d.id);
                      return (
                        <option key={d.id} value={d.id}>
                          {d.id} ({d.zone}){placed ? ' — déjà placée' : ''}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Active Level Properties */}
          {activeLevel && (
            <div className="bg-[#1e293b] border border-gray-700 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Propriétés du Niveau
                </h3>
                {levels.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteLevel(activeLevel.id)}
                    className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Supprimer
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="col-span-2">
                  <label className="text-[11px] text-slate-400 block mb-1">Nom du niveau</label>
                  <input
                    type="text"
                    value={activeLevel.name}
                    onChange={(e) => updateActiveLevel({ name: e.target.value })}
                    className="w-full bg-[#0b1a2a] border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Profondeur (m)</label>
                  <input
                    type="number"
                    value={activeLevel.depth_m}
                    onChange={(e) => updateActiveLevel({ depth_m: Number(e.target.value) })}
                    className="w-full bg-[#0b1a2a] border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Larg. (m)</label>
                    <input
                      type="number"
                      min={20}
                      value={activeLevel.width_m}
                      onChange={(e) =>
                        updateActiveLevel({ width_m: Math.max(20, Number(e.target.value) || 200) })
                      }
                      className="w-full bg-[#0b1a2a] border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Haut. (m)</label>
                    <input
                      type="number"
                      min={20}
                      value={activeLevel.height_m}
                      onChange={(e) =>
                        updateActiveLevel({
                          height_m: Math.max(20, Number(e.target.value) || 120),
                        })
                      }
                      className="w-full bg-[#0b1a2a] border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-1 border-t border-slate-700/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Fond de plan (PNG/SVG/JPG)</span>
                  <div className="flex items-center gap-2">
                    {activeLevel.background_image && (
                      <button
                        type="button"
                        onClick={() => updateActiveLevel({ background_image: null })}
                        className="text-[11px] text-red-400 hover:text-red-300"
                      >
                        Retirer
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[11px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 flex items-center gap-1"
                    >
                      <Upload size={12} /> Importer
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundUpload}
                    className="hidden"
                  />
                </div>
                {activeLevel.background_image && (
                  <div>
                    <label className="text-[11px] text-slate-400 flex justify-between">
                      <span>Opacité du plan</span>
                      <span>{Math.round((activeLevel.background_opacity ?? 0.35) * 100)}%</span>
                    </label>
                    <input
                      type="range"
                      min={0.05}
                      max={1}
                      step={0.05}
                      value={activeLevel.background_opacity ?? 0.35}
                      onChange={(e) =>
                        updateActiveLevel({ background_opacity: Number(e.target.value) })
                      }
                      className="w-full accent-cyan-500"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contextual Inspector */}
          {(selectedNode || selectedSegment || selectedAnchor) && (
            <div className="bg-[#1e293b] border border-cyan-500/40 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                  {selectedNode && 'Nœud / Point Clé'}
                  {selectedSegment && 'Segment de Galerie'}
                  {selectedAnchor && `Ancre ${selectedAnchor.device_id}`}
                </h3>
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                >
                  <Trash2 size={13} /> Supprimer
                </button>
              </div>

              {selectedNode && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Libellé</label>
                    <input
                      type="text"
                      value={selectedNode.label || ''}
                      onChange={(e) =>
                        setNodes((prev) =>
                          prev.map((n) =>
                            n.id === selectedNode.id ? { ...n, label: e.target.value } : n,
                          ),
                        )
                      }
                      className="w-full bg-[#0b1a2a] border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Type</label>
                      <select
                        value={selectedNode.type}
                        onChange={(e) =>
                          setNodes((prev) =>
                            prev.map((n) =>
                              n.id === selectedNode.id
                                ? { ...n, type: e.target.value as MineNode['type'] }
                                : n,
                            ),
                          )
                        }
                        className="w-full bg-[#0b1a2a] border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white"
                      >
                        <option value="junction">Jonction</option>
                        <option value="shaft">Puits</option>
                        <option value="exit">Sortie</option>
                        <option value="refuge">Refuge</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Zone</label>
                      <input
                        type="text"
                        value={selectedNode.zone || ''}
                        onChange={(e) =>
                          setNodes((prev) =>
                            prev.map((n) =>
                              n.id === selectedNode.id ? { ...n, zone: e.target.value } : n,
                            ),
                          )
                        }
                        className="w-full bg-[#0b1a2a] border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Position : X = {selectedNode.x} m, Y = {selectedNode.y} m
                  </p>
                </div>
              )}

              {selectedSegment && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Nom de la galerie</label>
                    <input
                      type="text"
                      value={selectedSegment.name || ''}
                      onChange={(e) =>
                        setSegments((prev) =>
                          prev.map((s) =>
                            s.id === selectedSegment.id ? { ...s, name: e.target.value } : s,
                          ),
                        )
                      }
                      className="w-full bg-[#0b1a2a] border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Largeur (m)</label>
                      <input
                        type="number"
                        step={0.5}
                        min={1}
                        value={selectedSegment.width_m}
                        onChange={(e) =>
                          setSegments((prev) =>
                            prev.map((s) =>
                              s.id === selectedSegment.id
                                ? { ...s, width_m: Number(e.target.value) || 4 }
                                : s,
                            ),
                          )
                        }
                        className="w-full bg-[#0b1a2a] border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Statut</label>
                      <select
                        value={selectedSegment.status}
                        onChange={(e) =>
                          setSegments((prev) =>
                            prev.map((s) =>
                              s.id === selectedSegment.id
                                ? { ...s, status: e.target.value as MineSegment['status'] }
                                : s,
                            ),
                          )
                        }
                        className="w-full bg-[#0b1a2a] border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white"
                      >
                        <option value="open">Ouverte</option>
                        <option value="restricted">Restreinte</option>
                        <option value="blocked">Bloquée</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {selectedAnchor && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        TxPower @1m (dBm)
                      </label>
                      <input
                        type="number"
                        value={selectedAnchor.tx_power}
                        onChange={(e) =>
                          setAnchors((prev) =>
                            prev.map((a) =>
                              a.id === selectedAnchor.id
                                ? { ...a, tx_power: Number(e.target.value) || -59 }
                                : a,
                            ),
                          )
                        }
                        className="w-full bg-[#0b1a2a] border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        Atténuation (n)
                      </label>
                      <input
                        type="number"
                        step={0.1}
                        min={1.5}
                        max={4}
                        value={selectedAnchor.path_loss_n}
                        onChange={(e) =>
                          setAnchors((prev) =>
                            prev.map((a) =>
                              a.id === selectedAnchor.id
                                ? { ...a, path_loss_n: Number(e.target.value) || 2.3 }
                                : a,
                            ),
                          )
                        }
                        className="w-full bg-[#0b1a2a] border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">
                    X = {selectedAnchor.x} m, Y = {selectedAnchor.y} m
                    {selectedAnchor.segment_id ? ` • Galerie liée` : ' • Hors galerie'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Canvas: Metric SVG Editor */}
        <div className="lg:col-span-8 bg-[#1e293b] border border-gray-700 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-slate-300 flex items-center gap-3">
              <span className="font-semibold text-white">
                {activeLevel
                  ? `${activeLevel.name} (${activeLevel.width_m} m × ${activeLevel.height_m} m)`
                  : 'Aucun niveau configuré'}
              </span>
              {cursorMeters && (
                <span className="font-mono text-[11px] text-cyan-400 bg-slate-900 px-2 py-0.5 rounded">
                  X: {cursorMeters.x} m | Y: {cursorMeters.y} m
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.2).toFixed(1))))}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Zoom -"
              >
                <ZoomOut size={14} />
              </button>
              <span className="text-xs font-mono text-slate-300 w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2.4, Number((z + 0.2).toFixed(1))))}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Zoom +"
              >
                <ZoomIn size={14} />
              </button>
            </div>
          </div>

          <div className="overflow-auto rounded-lg border border-slate-700 bg-[#08121e] max-h-[620px]">
            {!activeLevel && (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-3">
                <Layers size={32} className="text-cyan-400/70" />
                <p className="text-sm font-semibold text-white">
                  Aucune topologie souterraine enregistrée
                </p>
                <p className="text-xs text-slate-400 max-w-md">
                  Créez votre premier niveau réel (ex. Niveau -50 m), tracez les galeries et placez
                  vos boîtiers Ulinzi Box.
                </p>
                <button
                  type="button"
                  onClick={handleAddLevel}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5"
                >
                  <Plus size={14} /> Créer le premier niveau
                </button>
              </div>
            )}
            {activeLevel && (
              <svg
                ref={svgRef}
                viewBox={`0 0 ${activeLevel.width_m} ${activeLevel.height_m}`}
                style={{ width: `${zoom * 100}%`, minWidth: '100%' }}
                className="block select-none cursor-crosshair"
                onMouseMove={handleSvgMouseMove}
                onMouseUp={handleSvgMouseUp}
                onMouseLeave={handleSvgMouseUp}
                onClick={handleCanvasClick}
              >
                <defs>
                  <pattern id="mine-grid-10" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path
                      d="M 10 0 L 0 0 0 10"
                      fill="none"
                      stroke="#1e293b"
                      strokeWidth="0.3"
                    />
                  </pattern>
                  <pattern id="mine-grid-50" width="50" height="50" patternUnits="userSpaceOnUse">
                    <rect width="50" height="50" fill="url(#mine-grid-10)" />
                    <path
                      d="M 50 0 L 0 0 0 50"
                      fill="none"
                      stroke="#334155"
                      strokeWidth="0.6"
                    />
                  </pattern>
                </defs>

                <rect
                  width={activeLevel.width_m}
                  height={activeLevel.height_m}
                  fill="url(#mine-grid-50)"
                />

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

                {/* Segments (Galeries) */}
                {levelSegments.map((seg) => {
                  const a = nodeMap.get(seg.from_node_id);
                  const b = nodeMap.get(seg.to_node_id);
                  if (!a || !b) return null;
                  const isSel = selectedItem?.kind === 'segment' && selectedItem.id === seg.id;
                  const wallColor =
                    seg.status === 'blocked'
                      ? '#7f1d1d'
                      : seg.status === 'restricted'
                        ? '#78350f'
                        : '#1e293b';
                  const centerColor =
                    seg.status === 'blocked'
                      ? '#ef4444'
                      : seg.status === 'restricted'
                        ? '#f59e0b'
                        : '#38bdf8';

                  return (
                    <g
                      key={seg.id}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem({ kind: 'segment', id: seg.id });
                      }}
                    >
                      <line
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke={isSel ? '#06b6d4' : wallColor}
                        strokeWidth={Math.max(2, seg.width_m)}
                        strokeLinecap="round"
                      />
                      <line
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke={centerColor}
                        strokeWidth={0.6}
                        strokeDasharray="2 1.5"
                      />
                      {seg.name && (
                        <text
                          x={(a.x + b.x) / 2}
                          y={(a.y + b.y) / 2 - 2}
                          textAnchor="middle"
                          fontSize="3.2"
                          fill="#cbd5e1"
                          className="pointer-events-none"
                        >
                          {seg.name}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Preview line while chaining gallery */}
                {tool === 'gallery' && pendingFromNodeId && cursorMeters && nodeMap.get(pendingFromNodeId) && (
                  <line
                    x1={nodeMap.get(pendingFromNodeId)!.x}
                    y1={nodeMap.get(pendingFromNodeId)!.y}
                    x2={cursorMeters.x}
                    y2={cursorMeters.y}
                    stroke="#22d3ee"
                    strokeWidth={0.8}
                    strokeDasharray="2 2"
                    className="pointer-events-none"
                  />
                )}

                {/* Nodes */}
                {levelNodes.map((node) => {
                  const isSel = selectedItem?.kind === 'node' && selectedItem.id === node.id;
                  const isPending = pendingFromNodeId === node.id;
                  const fill = NODE_COLORS[node.type] || '#38bdf8';
                  return (
                    <g
                      key={node.id}
                      className="cursor-pointer"
                      onMouseDown={(e) => {
                        if (tool === 'select') {
                          e.stopPropagation();
                          setDragging({ kind: 'node', id: node.id });
                        }
                      }}
                      onClick={(e) => handleNodeClick(e, node)}
                    >
                      {(isSel || isPending) && (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={4.2}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth={0.6}
                        />
                      )}
                      <circle cx={node.x} cy={node.y} r={2.6} fill={fill} stroke="#0f172a" strokeWidth={0.6} />
                      {node.label && (
                        <text
                          x={node.x}
                          y={node.y - 4}
                          textAnchor="middle"
                          fontSize="3.3"
                          fontWeight="600"
                          fill="#f8fafc"
                          className="pointer-events-none"
                        >
                          {node.label}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Ulinzi Box Anchors */}
                {levelAnchors.map((anchor) => {
                  const isSel = selectedItem?.kind === 'anchor' && selectedItem.id === anchor.id;
                  return (
                    <g
                      key={anchor.id}
                      className="cursor-pointer"
                      onMouseDown={(e) => {
                        if (tool === 'select') {
                          e.stopPropagation();
                          setDragging({ kind: 'anchor', id: anchor.id });
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem({ kind: 'anchor', id: anchor.id });
                      }}
                    >
                      <circle
                        cx={anchor.x}
                        cy={anchor.y}
                        r={15}
                        fill="#a855f7"
                        fillOpacity={0.07}
                        stroke="#a855f7"
                        strokeOpacity={0.35}
                        strokeWidth={0.4}
                        strokeDasharray="1.5 1.5"
                        className="pointer-events-none"
                      />
                      {isSel && (
                        <circle
                          cx={anchor.x}
                          cy={anchor.y}
                          r={4.6}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth={0.6}
                        />
                      )}
                      <rect
                        x={anchor.x - 2.4}
                        y={anchor.y - 2.4}
                        width={4.8}
                        height={4.8}
                        rx={1}
                        fill="#a855f7"
                        stroke="#f8fafc"
                        strokeWidth={0.5}
                      />
                      <text
                        x={anchor.x}
                        y={anchor.y + 6.2}
                        textAnchor="middle"
                        fontSize="3.2"
                        fontWeight="700"
                        fill="#e9d5ff"
                        className="pointer-events-none"
                      >
                        {anchor.device_id}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] inline-block" /> Jonction
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#a855f7] inline-block" /> Puits / Ulinzi Box (rayon BLE 15 m)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] inline-block" /> Sortie
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] inline-block" /> Refuge
              </span>
            </div>
            <span>
              {levelSegments.length} galeries • {levelNodes.length} nœuds • {levelAnchors.length} ancres Ulinzi Box
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

