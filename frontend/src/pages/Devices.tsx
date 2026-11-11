import { useState, useEffect } from 'react';
import {
  Wifi,
  Battery,
  RefreshCw,
  Unlink,
  Link2,
  CheckCircle,
  Activity,
  Cpu,
  User,
  Plus,
  Wind,
  Radio,
  Bell,
  BellOff,
  Trash2,
  AlertTriangle,
  Box,
  Server,
} from 'lucide-react';
import apiService from '../services/api';
import { useStore, UlinziBoxDevice } from '../store/useStore';

function formatGasPhase(phase: number | null | undefined, warmS?: number | null) {
  if (phase === 0) return warmS != null ? `Préchauffage (${warmS}s)` : 'Préchauffage';
  if (phase === 1) return 'Calibration base';
  if (phase === 2) return 'Surveillance active';
  return 'En attente';
}

function formatUptime(ms: number | null | undefined) {
  if (ms == null) return '—';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

export default function Devices() {
  const { ulinziDevices, setUlinziDevices, removeUlinziDevice } = useStore();
  const [activeTab, setActiveTab] = useState<'boxes' | 'watches'>('boxes');

  // --- Montres ---
  const [watches, setWatches] = useState<any[]>([]);
  const [miners, setMiners] = useState<any[]>([]);
  const [selectedWatch, setSelectedWatch] = useState<any | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [targetWatchId, setTargetWatchId] = useState('');
  const [selectedMinerId, setSelectedMinerId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- Ulinzi Box ---
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [showAddBoxModal, setShowAddBoxModal] = useState(false);
  const [newBoxId, setNewBoxId] = useState('ULINZI-BOX-02');
  const [newBoxZone, setNewBoxZone] = useState('ZONE A');
  const [newBoxGallery, setNewBoxGallery] = useState('Galerie 1');
  const [provisionedResult, setProvisionedResult] = useState<{ id: string; token: string; zone: string; gallery: string } | null>(null);
  const [cmdLoadingId, setCmdLoadingId] = useState<string | null>(null);

  const selectedBox: UlinziBoxDevice | null =
    ulinziDevices.find((d) => d.id === selectedBoxId) || ulinziDevices[0] || null;

  const handleAutoCreateWatch = async () => {
    const watchIds = watches.map((w) => w.id);
    let nextNum = 1;
    if (watchIds.length > 0) {
      const numbers = watchIds.map((id) => {
        const match = id.match(/^WATCH-(\d+)$/i);
        return match ? parseInt(match[1], 10) : 0;
      });
      nextNum = Math.max(...numbers, 0) + 1;
    }
    const nextId = `WATCH-${String(nextNum).padStart(3, '0')}`;

    if (!window.confirm(`Voulez-vous enregistrer la montre "${nextId}" ?`)) {
      return;
    }

    try {
      setLoading(true);
      await apiService.createWatch(nextId);
      await loadData();
    } catch (err: any) {
      console.error('Erreur creation montre:', err);
      alert(err.message || 'Erreur lors de la création de la montre');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [wRes, mRes, dRes] = await Promise.all([
        apiService.getWatches(),
        apiService.getMiners(),
        apiService.getDevices().catch(() => ({ devices: [] })),
      ]);
      if (wRes.watches) setWatches(wRes.watches);
      if (mRes.miners) setMiners(mRes.miners);
      if (dRes?.devices) setUlinziDevices(dRes.devices);
    } catch (err) {
      console.error('Erreur chargement appareils:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleScan = async () => {
    setScanning(true);
    try {
      await apiService.scanLoraDevices();
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await loadData();
    } catch (err) {
      console.error('Erreur scan:', err);
    } finally {
      setScanning(false);
    }
  };

  const handleAssociate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMinerId || !targetWatchId) return;

    try {
      await apiService.associateDevice(selectedMinerId, targetWatchId);
      setShowAssignModal(false);
      setSelectedMinerId('');
      setTargetWatchId('');
      await loadData();
    } catch (err) {
      console.error('Erreur association:', err);
      alert("Erreur lors de l'attribution de la montre");
    }
  };

  const handleDissociate = async (watchId: string) => {
    if (!window.confirm(`Voulez-vous vraiment détacher la montre ${watchId} ?`)) return;

    try {
      await apiService.dissociateDevice(watchId);
      await loadData();
      if (selectedWatch?.id === watchId) {
        setSelectedWatch(null);
      }
    } catch (err) {
      console.error('Erreur dissociation:', err);
      alert('Erreur lors de la dissociation');
    }
  };

  const handleToggleBoxSiren = async (box: UlinziBoxDevice) => {
    const action = box.siren ? 'DEACTIVATE_SIREN' : 'ACTIVATE_SIREN';
    try {
      setCmdLoadingId(box.id);
      await apiService.postDeviceCommand(
        box.id,
        action,
        `ui-${box.id}-${Date.now()}`,
      );
      await loadData();
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'envoi de la commande sirène");
    } finally {
      setCmdLoadingId(null);
    }
  };

  const handleProvisionBox = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = newBoxId.trim().toUpperCase();
    if (!id || !newBoxZone.trim()) return;
    try {
      const res = await apiService.provisionDevice({
        id,
        zone: newBoxZone.trim(),
        gallery: newBoxGallery.trim() || undefined,
      });
      setProvisionedResult({
        id,
        token: res.deviceToken || '',
        zone: newBoxZone.trim(),
        gallery: newBoxGallery.trim() || 'Galerie 1',
      });
      setSelectedBoxId(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Impossible de créer la box (ID déjà utilisé ?)');
    }
  };

  const handleDeleteBox = async (boxId: string) => {
    if (!window.confirm(`Supprimer le boîtier "${boxId}" de la plateforme ?`)) return;
    try {
      await apiService.deleteDevice(boxId);
      removeUlinziDevice(boxId);
      if (selectedBoxId === boxId) setSelectedBoxId(null);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression');
    }
  };

  const getWatchDetails = (watchId: string) => {
    return miners.find((m) => m.watchId === watchId) || null;
  };

  const getStatusIcon = (_watch: any, miner: any) => {
    if (miner) {
      if (miner.isUnderground) {
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></span>
            Dans la mine
          </span>
        );
      }
      if (miner.isInService) {
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
            En service
          </span>
        );
      }
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
        <span className="w-1.5 h-1.5 bg-slate-500 rounded-full"></span>
        Hors service
      </span>
    );
  };

  const unassignedMiners = miners.filter((m) => !m.watchId && m.accountStatus !== 'Inactif');
  const onlineBoxesCount = ulinziDevices.filter((d) => d.status === 'ONLINE').length;
  const alertBoxesCount = ulinziDevices.filter((d) => d.danger || d.gas?.alarm || d.vibration?.alarm || d.siren).length;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <img src={`/Logo-with-text.png`} alt="SupervisorApp" className="h-10 w-auto" />
          <div>
            <h1 className="text-xl font-bold text-white">Objets Connectés</h1>
            <p className="text-sm text-gray-400">
              Boîtiers Ulinzi Box (Gaz, Vibrations, Sirènes) &amp; Montres T-Watch S3+
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === 'boxes' ? (
            <button
              onClick={() => {
                setProvisionedResult(null);
                const nextIdx = ulinziDevices.filter((d) => d.id.startsWith('ULINZI-BOX-')).length + 1;
                setNewBoxId(`ULINZI-BOX-${String(nextIdx).padStart(2, '0')}`);
                setShowAddBoxModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded font-semibold transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            >
              <Plus size={16} />
              Ajouter une Ulinzi Box
            </button>
          ) : (
            <>
              <button
                onClick={handleAutoCreateWatch}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded font-semibold transition-all shadow-[0_0_15px_rgba(34,197,94,0.2)]"
              >
                <Plus size={16} />
                Enregistrer une Montre
              </button>
              <button
                onClick={handleScan}
                disabled={scanning}
                className={`flex items-center gap-2 px-4 py-2 text-white text-sm rounded font-semibold transition-all ${
                  scanning
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-cyan-500 hover:bg-cyan-600 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                }`}
              >
                <RefreshCw size={16} className={scanning ? 'animate-spin' : ''} />
                {scanning ? 'Recherche...' : 'Rechercher LoRa'}
              </button>
            </>
          )}
          <button
            onClick={loadData}
            className="p-2 bg-[#1e293b] border border-gray-700 rounded text-gray-400 hover:text-white transition-colors"
            title="Actualiser"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Onglets Ulinzi Box vs Montres */}
      <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab('boxes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'boxes'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'bg-[#1e293b] text-gray-400 border border-gray-700 hover:text-white'
          }`}
        >
          <Box size={16} />
          Boîtiers Ulinzi Box ({ulinziDevices.length})
          {onlineBoxesCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {onlineBoxesCount} en ligne
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('watches')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'watches'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'bg-[#1e293b] text-gray-400 border border-gray-700 hover:text-white'
          }`}
        >
          <Cpu size={16} />
          Montres T-Watch S3+ ({watches.length})
        </button>
      </div>

      {activeTab === 'boxes' ? (
        <>
          {/* Quick stats Ulinzi Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-[#1e293b] rounded border border-gray-700 p-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-500/20 rounded flex items-center justify-center border border-cyan-500/30">
                <Server size={20} className="text-cyan-400" />
              </div>
              <div>
                <p className="text-white text-lg font-bold">{ulinziDevices.length}</p>
                <p className="text-gray-400 text-xs">Boîtiers enregistrés</p>
              </div>
            </div>
            <div className="bg-[#1e293b] rounded border border-gray-700 p-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded flex items-center justify-center border border-emerald-500/30">
                <Wifi size={20} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-white text-lg font-bold">{onlineBoxesCount}</p>
                <p className="text-gray-400 text-xs">Boîtiers en ligne</p>
              </div>
            </div>
            <div className="bg-[#1e293b] rounded border border-gray-700 p-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded flex items-center justify-center border border-amber-500/30">
                <Wind size={20} className="text-amber-400" />
              </div>
              <div>
                <p className="text-white text-lg font-bold">
                  {ulinziDevices.filter((d) => d.gas?.raw != null).length}
                </p>
                <p className="text-gray-400 text-xs">Capteurs Gaz / Vib actifs</p>
              </div>
            </div>
            <div className="bg-[#1e293b] rounded border border-gray-700 p-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded flex items-center justify-center border border-red-500/30">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <p className="text-white text-lg font-bold">{alertBoxesCount}</p>
                <p className="text-gray-400 text-xs">Alertes / Sirènes actives</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Liste des Ulinzi Box */}
            <div className="col-span-1 lg:col-span-2 space-y-3">
              <h3 className="text-sm font-semibold text-white tracking-wider uppercase">
                Boîtiers Ulinzi Box par zone
              </h3>
              {ulinziDevices.length === 0 ? (
                <div className="bg-[#1e293b] rounded border border-gray-700 p-8 text-center text-gray-400 text-sm">
                  Aucun boîtier Ulinzi Box connecté pour le moment. Allumez une box avec{' '}
                  <span className="font-mono text-cyan-300">BOX_ID</span> configuré ou cliquez sur « Ajouter une Ulinzi Box ».
                </div>
              ) : (
                <div className="space-y-3">
                  {ulinziDevices.map((box) => {
                    const isSelected = selectedBox?.id === box.id;
                    const isOnline = box.status === 'ONLINE';
                    const hasDanger = Boolean(box.danger || box.gas?.alarm || box.vibration?.alarm);
                    return (
                      <div
                        key={box.id}
                        onClick={() => setSelectedBoxId(box.id)}
                        className={`bg-[#1e293b] rounded-xl border p-4 cursor-pointer transition-all ${
                          hasDanger
                            ? 'border-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.18)]'
                            : isSelected
                            ? 'border-cyan-500 bg-[#334155]/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                            : 'border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-800">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                                hasDanger
                                  ? 'bg-red-500/20 border-red-500/40 text-red-400'
                                  : isOnline
                                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                  : 'bg-slate-800 border-slate-700 text-slate-400'
                              }`}
                            >
                              <Box size={18} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-white font-bold font-mono text-sm">{box.id}</span>
                                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-bold text-cyan-300">
                                  {box.zone}
                                </span>
                                {box.gallery && (
                                  <span className="text-[11px] text-gray-400">{box.gallery}</span>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-400">
                                {box.name || box.id} {box.lastIp ? `• IP ${box.lastIp}` : ''}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {box.siren && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse flex items-center gap-1">
                                <Bell size={11} /> SIRÈNE ON
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                                isOnline
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : box.status === 'OFFLINE'
                                  ? 'bg-slate-800 text-slate-400 border-slate-700'
                                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                                }`}
                              />
                              {isOnline ? 'EN LIGNE' : box.status === 'OFFLINE' ? 'HORS LIGNE' : 'EN ATTENTE'}
                            </span>
                          </div>
                        </div>

                        {/* Métriques Gaz & Vibrations en direct */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                          <div
                            className={`rounded-lg p-2.5 border ${
                              box.gas?.alarm || box.gas?.fault
                                ? 'bg-red-950/30 border-red-500/50'
                                : 'bg-slate-900/70 border-gray-800'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                              <span className="flex items-center gap-1 font-semibold text-cyan-300">
                                <Wind size={12} /> Gaz MQ-135
                              </span>
                              <span>{formatGasPhase(box.gas?.phase, box.gas?.warmupRemainingS)}</span>
                            </div>
                            <div className="flex items-baseline justify-between">
                              <span className="text-base font-bold text-white font-mono">
                                {box.gas?.raw != null ? box.gas.raw : '—'}
                              </span>
                              <span className="text-[11px] text-gray-400 font-mono">
                                Base: {box.gas?.baseline ?? '—'} | Seuil: {box.gas?.threshold ?? '—'}
                              </span>
                            </div>
                          </div>

                          <div
                            className={`rounded-lg p-2.5 border ${
                              box.vibration?.alarm || box.vibration?.mpuOk === false
                                ? 'bg-red-950/30 border-red-500/50'
                                : 'bg-slate-900/70 border-gray-800'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                              <span className="flex items-center gap-1 font-semibold text-emerald-300">
                                <Activity size={12} /> Vibrations MPU6050
                              </span>
                              <span
                                className={
                                  box.vibration?.mpuOk === false ? 'text-red-400 font-bold' : 'text-emerald-400'
                                }
                              >
                                {box.vibration?.mpuOk === false ? 'MPU DÉFAUT' : 'MPU OK'}
                              </span>
                            </div>
                            <div className="flex items-baseline justify-between">
                              <span className="text-base font-bold text-white font-mono">
                                {box.vibration?.rms != null ? `${Number(box.vibration.rms).toFixed(2)} m/s²` : '—'}
                              </span>
                              <span className="text-[11px] text-gray-400 font-mono">
                                Seuil: {box.vibration?.threshold != null ? Number(box.vibration.threshold).toFixed(2) : '1.50'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-gray-800">
                          <span className="text-[11px] text-gray-400">
                            Dernier signal :{' '}
                            {box.lastSeen ? new Date(box.lastSeen).toLocaleTimeString('fr-FR') : 'Jamais'}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleBoxSiren(box);
                              }}
                              disabled={cmdLoadingId === box.id}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold border transition-colors ${
                                box.siren
                                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30'
                                  : 'bg-red-500/15 hover:bg-red-500/25 text-red-300 border-red-500/30'
                              }`}
                            >
                              {box.siren ? <BellOff size={13} /> : <Bell size={13} />}
                              {box.siren ? 'Couper sirène' : 'Activer sirène'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Panneau de détails Box */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white tracking-wider uppercase">
                Détails du boîtier
              </h3>
              {selectedBox ? (
                <div className="bg-[#1e293b] rounded-xl border border-gray-700 p-4 space-y-4 shadow-lg">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Radio size={22} className="text-cyan-400" />
                      <div>
                        <h4 className="text-white font-bold font-mono">{selectedBox.id}</h4>
                        <p className="text-xs text-gray-400">
                          {selectedBox.zone} {selectedBox.gallery ? `• ${selectedBox.gallery}` : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteBox(selectedBox.id)}
                      className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                      title="Supprimer ce boîtier"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="space-y-2 text-xs border-t border-gray-800 pt-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Statut connexion</span>
                      <span className={selectedBox.status === 'ONLINE' ? 'text-emerald-400 font-bold' : 'text-gray-300'}>
                        {selectedBox.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">IP LAN</span>
                      <span className="text-white font-mono">{selectedBox.lastIp || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Uptime boîtier</span>
                      <span className="text-white font-mono">{formatUptime(selectedBox.uptimeMs)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Sirène / Relais</span>
                      <span className={selectedBox.siren ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                        {selectedBox.siren ? 'ACTIVE' : 'Arrêtée'}
                      </span>
                    </div>
                  </div>

                  {/* Accélération / Gyroscope MPU6050 */}
                  <div className="border-t border-gray-800 pt-3 space-y-2">
                    <p className="text-[11px] font-bold text-gray-400 uppercase">
                      Télémétrie brute MPU6050
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-900 rounded p-2 border border-gray-800">
                        <span className="text-[10px] text-gray-400 block">AX</span>
                        <span className="text-xs font-mono text-white font-bold">
                          {selectedBox.vibration?.ax != null ? Number(selectedBox.vibration.ax).toFixed(2) : '—'}
                        </span>
                      </div>
                      <div className="bg-slate-900 rounded p-2 border border-gray-800">
                        <span className="text-[10px] text-gray-400 block">AY</span>
                        <span className="text-xs font-mono text-white font-bold">
                          {selectedBox.vibration?.ay != null ? Number(selectedBox.vibration.ay).toFixed(2) : '—'}
                        </span>
                      </div>
                      <div className="bg-slate-900 rounded p-2 border border-gray-800">
                        <span className="text-[10px] text-gray-400 block">AZ</span>
                        <span className="text-xs font-mono text-white font-bold">
                          {selectedBox.vibration?.az != null ? Number(selectedBox.vibration.az).toFixed(2) : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/80 border border-gray-800 rounded-lg p-3 text-[11px] text-gray-300 space-y-1">
                    <p className="font-bold text-cyan-300">Déploiement multi-box</p>
                    <p>
                      Chaque Ulinzi Box s&apos;identifie par son <span className="font-mono text-white">BOX_ID</span> dans{' '}
                      <span className="font-mono text-white">config.h</span> et remonte automatiquement ici dès l&apos;allumage.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-[#1e293b] rounded-xl border border-gray-700 p-8 text-center text-gray-400 text-xs">
                  Sélectionnez une Ulinzi Box pour consulter ses capteurs détaillés.
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Quick stats cards Montres */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-[#1e293b] rounded border border-gray-700 p-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-500/20 rounded flex items-center justify-center border border-cyan-500/30">
                <Cpu size={20} className="text-cyan-400" />
              </div>
              <div>
                <p className="text-white text-lg font-bold">{watches.length}</p>
                <p className="text-gray-400 text-xs">Montres détectées</p>
              </div>
            </div>
            <div className="bg-[#1e293b] rounded border border-gray-700 p-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded flex items-center justify-center border border-green-500/30">
                <CheckCircle size={20} className="text-green-400" />
              </div>
              <div>
                <p className="text-white text-lg font-bold">
                  {watches.filter((w) => w.status === 'assigned').length}
                </p>
                <p className="text-gray-400 text-xs">Attribuées</p>
              </div>
            </div>
            <div className="bg-[#1e293b] rounded border border-gray-700 p-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded flex items-center justify-center border border-blue-500/30">
                <Wifi size={20} className="text-blue-400" />
              </div>
              <div>
                <p className="text-white text-lg font-bold">
                  {watches.filter((w) => w.status === 'available').length}
                </p>
                <p className="text-gray-400 text-xs">Disponibles</p>
              </div>
            </div>
            <div className="bg-[#1e293b] rounded border border-gray-700 p-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded flex items-center justify-center border border-orange-500/30">
                <Battery size={20} className="text-orange-400" />
              </div>
              <div>
                <p className="text-white text-lg font-bold">
                  {miners.filter((m) => m.isInService && m.battery < 20).length}
                </p>
                <p className="text-gray-400 text-xs">Batterie faible (&lt;20%)</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Device List Montres */}
            <div className="col-span-1 lg:col-span-2 space-y-3">
              <h3 className="text-sm font-semibold text-white tracking-wider uppercase">Liste des montres</h3>
              <div className="space-y-2">
                {watches.length === 0 ? (
                  <div className="bg-[#1e293b] rounded border border-gray-700 p-8 text-center text-gray-500">
                    Aucune montre enregistrée dans le système. Allumez une montre pour qu&apos;elle soit détectée automatiquement.
                  </div>
                ) : (
                  watches.map((watch) => {
                    const miner = getWatchDetails(watch.id);
                    const isSelected = selectedWatch?.id === watch.id;

                    return (
                      <div
                        key={watch.id}
                        className={`bg-[#1e293b] rounded-lg border p-4 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-green-500 bg-[#334155]/20 shadow-[0_0_15px_rgba(34,197,94,0.15)]'
                            : 'border-gray-700 hover:border-gray-600'
                        }`}
                        onClick={() => setSelectedWatch(watch)}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-2 border-b border-gray-800">
                          <div className="flex items-center gap-3">
                            <Cpu size={20} className={watch.status === 'assigned' ? 'text-green-400' : 'text-gray-400'} />
                            <div>
                              <p className="text-white text-sm font-semibold font-mono">{watch.id}</p>
                              <p className="text-gray-400 text-[10px]">T-Watch S3+ • LoRa / Wi-Fi</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">{getStatusIcon(watch, miner)}</div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-4">
                          {miner ? (
                            <div className="flex items-center gap-2">
                              <User size={14} className="text-green-400" />
                              <span className="text-xs text-gray-300">
                                Attribuée à : <strong className="text-white">{miner.name}</strong> ({miner.matricule})
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 italic">Disponible pour attribution</span>
                          )}

                          {miner && miner.isInService && (
                            <div className="flex items-center gap-3 bg-slate-900 px-2 py-1 rounded text-xs">
                              <div className="flex items-center gap-1 text-gray-300">
                                <Battery size={14} className={miner.battery < 20 ? 'text-red-400' : 'text-gray-400'} />
                                <span>{miner.battery || 100}%</span>
                              </div>
                              <div className="flex items-center gap-1 text-gray-300 border-l border-gray-800 pl-2">
                                <Activity size={14} className="text-red-400" />
                                <span>{miner.heartRate || 70} bpm</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-800">
                          {watch.status === 'assigned' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDissociate(watch.id);
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-xs rounded border border-orange-500/20 transition-colors"
                            >
                              <Unlink size={12} />
                              Détacher la montre
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setTargetWatchId(watch.id);
                                setShowAssignModal(true);
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs rounded border border-green-500/20 transition-colors"
                            >
                              <Link2 size={12} />
                              Attribuer à un mineur
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Watch Details */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white tracking-wider uppercase">Détails de l&apos;appareil</h3>
              {selectedWatch ? (
                <div className="bg-[#1e293b] rounded-lg border border-gray-700 p-4 space-y-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <Cpu size={24} className="text-green-400" />
                    <div>
                      <h4 className="text-white font-bold font-mono">{selectedWatch.id}</h4>
                      <p className="text-gray-400 text-xs">
                        Dernière activité : {new Date(selectedWatch.last_seen).toLocaleTimeString('fr-FR')}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs border-t border-gray-800 pt-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Statut</span>
                      <span className={`font-bold ${selectedWatch.status === 'assigned' ? 'text-green-400' : 'text-blue-400'}`}>
                        {selectedWatch.status === 'assigned' ? 'Assignée' : 'Disponible'}
                      </span>
                    </div>

                    {getWatchDetails(selectedWatch.id) && (
                      <>
                        <div className="flex justify-between border-t border-gray-800/40 pt-2">
                          <span className="text-gray-400">Mineur lié</span>
                          <span className="text-white font-semibold">{getWatchDetails(selectedWatch.id)?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Matricule</span>
                          <span className="text-white font-mono">{getWatchDetails(selectedWatch.id)?.matricule}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Zone d&apos;affectation</span>
                          <span className="text-white">{getWatchDetails(selectedWatch.id)?.zone}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-800 flex items-center justify-end gap-2">
                    {selectedWatch.status === 'assigned' && (
                      <button
                        onClick={() => handleDissociate(selectedWatch.id)}
                        className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded transition-colors flex items-center gap-1"
                      >
                        <Unlink size={12} />
                        Désassocier
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedWatch(null)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded transition-colors"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-[#1e293b] rounded-lg border border-gray-700 p-8 flex flex-col items-center justify-center text-center">
                  <Cpu size={40} className="text-gray-600 mb-3" />
                  <p className="text-gray-400 text-xs">
                    Sélectionnez une montre pour voir ses détails d&apos;attribution
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* MODAL AJOUT ULINZI BOX */}
      {showAddBoxModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e293b] border border-gray-700 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Box className="text-emerald-400" /> Enregistrer une Ulinzi Box
            </h2>
            <p className="text-xs text-gray-400">
              Vous pouvez soit pré-enregistrer la box ici, soit simplement flasher le firmware{' '}
              <span className="font-mono text-cyan-300">Ulinzi_box</span> avec un{' '}
              <span className="font-mono text-white">BOX_ID</span> unique : elle s&apos;enregistrera automatiquement au démarrage.
            </p>

            {provisionedResult ? (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded text-xs text-emerald-300">
                  Boîtier <strong>{provisionedResult.id}</strong> créé avec succès ! Copiez ce bloc dans{' '}
                  <span className="font-mono">firmware/Ulinzi_box/config.h</span> :
                </div>
                <pre className="bg-slate-950 border border-gray-800 rounded p-3 text-[11px] font-mono text-cyan-200 overflow-x-auto">
{`#define BOX_ID          "${provisionedResult.id}"
#define BOX_NAME        "Ulinzi ${provisionedResult.id}"
#define BOX_ZONE        "${provisionedResult.zone}"
#define BOX_GALLERY     "${provisionedResult.gallery}"
#define STATIC_DEVICE_TOKEN "${provisionedResult.token}"`}
                </pre>
                <button
                  type="button"
                  onClick={() => setShowAddBoxModal(false)}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded"
                >
                  Terminer
                </button>
              </div>
            ) : (
              <form onSubmit={handleProvisionBox} className="space-y-3">
                <div>
                  <label className="text-xs text-gray-300 font-semibold block mb-1">ID unique de la Box *</label>
                  <input
                    required
                    value={newBoxId}
                    onChange={(e) => setNewBoxId(e.target.value)}
                    placeholder="ULINZI-BOX-02"
                    className="w-full bg-slate-900 border border-gray-700 rounded px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-300 font-semibold block mb-1">Zone *</label>
                    <select
                      value={newBoxZone}
                      onChange={(e) => setNewBoxZone(e.target.value)}
                      className="w-full bg-slate-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                    >
                      {['ZONE A', 'ZONE B', 'ZONE C', 'ZONE D', 'ZONE E', 'ZONE F'].map((z) => (
                        <option key={z} value={z}>{z}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-300 font-semibold block mb-1">Galerie</label>
                    <input
                      value={newBoxGallery}
                      onChange={(e) => setNewBoxGallery(e.target.value)}
                      placeholder="Galerie 2"
                      className="w-full bg-slate-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddBoxModal(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold py-2 rounded"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold py-2 rounded"
                  >
                    Créer et générer le config.h
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ASSIGNMENT MODAL MONTRES */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e293b] border border-gray-700 rounded-xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Link2 className="text-green-400" /> Attribuer la montre
            </h2>
            <p className="text-xs text-gray-400 mb-4 font-mono">
              Montre sélectionnée : {targetWatchId}
            </p>

            <form onSubmit={handleAssociate} className="space-y-4">
              <div>
                <label className="text-xs text-gray-300 font-semibold block mb-1">Sélectionner un mineur *</label>
                {unassignedMiners.length === 0 ? (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs rounded">
                    Aucun mineur disponible. Tous les mineurs actifs possèdent déjà une montre liée. Créez un profil de mineur d&apos;abord.
                  </div>
                ) : (
                  <select
                    required
                    value={selectedMinerId}
                    onChange={(e) => setSelectedMinerId(e.target.value)}
                    className="w-full bg-slate-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                  >
                    <option value="">-- Choisir un mineur --</option>
                    {unassignedMiners.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.matricule}) - {m.role}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setTargetWatchId('');
                    setSelectedMinerId('');
                  }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold py-2 rounded transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!selectedMinerId}
                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:text-gray-400 text-white text-xs font-semibold py-2 rounded transition-colors"
                >
                  Lier l&apos;appareil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
