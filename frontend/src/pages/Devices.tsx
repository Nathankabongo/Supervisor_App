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
  Plus
} from 'lucide-react';
import apiService from '../services/api';

export default function Devices() {
  const [watches, setWatches] = useState<any[]>([]);
  const [miners, setMiners] = useState<any[]>([]);
  const [selectedWatch, setSelectedWatch] = useState<any | null>(null);
  
  // Association Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [targetWatchId, setTargetWatchId] = useState('');
  const [selectedMinerId, setSelectedMinerId] = useState('');
  
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);



  const handleAutoCreateWatch = async () => {
    // Generate next watch ID based on existing watches
    const watchIds = watches.map(w => w.id);
    let nextNum = 1;
    if (watchIds.length > 0) {
      const numbers = watchIds.map(id => {
        const match = id.match(/^WATCH-(\d+)$/i);
        return match ? parseInt(match[1], 10) : 0;
      });
      const maxNum = Math.max(...numbers, 0);
      nextNum = maxNum + 1;
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
      alert(err.message || "Erreur lors de la création de la montre");
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [wRes, mRes] = await Promise.all([
        apiService.getWatches(),
        apiService.getMiners()
      ]);
      if (wRes.watches) setWatches(wRes.watches);
      if (mRes.miners) setMiners(mRes.miners);
    } catch (err) {
      console.error('Erreur chargement appareils:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // refresh every 5s for real-time battery/presence
    return () => clearInterval(interval);
  }, []);

  const handleScan = async () => {
    setScanning(true);
    try {
      await apiService.scanLoraDevices();
      // Scan triggers serial broadast, wait and reload
      await new Promise(resolve => setTimeout(resolve, 3000));
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
      alert("Erreur lors de la dissociation");
    }
  };

  const getWatchDetails = (watchId: string) => {
    // Find associated miner
    const miner = miners.find((m) => m.watchId === watchId);
    return miner || null;
  };

  const getStatusIcon = (_watch: any, miner: any) => {
    if (miner) {
      if (miner.isUnderground) {
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></span>
          Dans la mine
        </span>;
      }
      if (miner.isInService) {
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
          En service
        </span>;
      }
    }
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full"></span>
      Hors service
    </span>;
  };

  // Filter miners who DO NOT have a watch yet
  const unassignedMiners = miners.filter(m => !m.watchId && m.accountStatus !== 'Inactif');

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src={`/Logo-with-text.png`} alt="SupervisorApp" className="h-10 w-auto" />
          <div>
            <h1 className="text-xl font-bold text-white">Objets Connectés</h1>
            <p className="text-sm text-gray-400">Gestion des T-Watch S3+ et attributions aux mineurs</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
              scanning ? 'bg-gray-600 cursor-not-allowed' : 'bg-cyan-500 hover:bg-cyan-600 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
            }`}
          >
            <RefreshCw size={16} className={scanning ? 'animate-spin' : ''} />
            {scanning ? 'Recherche...' : 'Rechercher LoRa'}
          </button>
          <button
            onClick={loadData}
            className="p-2 bg-[#1e293b] border border-gray-700 rounded text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Quick stats cards */}
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
              {watches.filter(w => w.status === 'assigned').length}
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
              {watches.filter(w => w.status === 'available').length}
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
        {/* Device List */}
        <div className="col-span-1 lg:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold text-white tracking-wider uppercase">Liste des montres</h3>
          <div className="space-y-2">
            {watches.length === 0 ? (
              <div className="bg-[#1e293b] rounded border border-gray-700 p-8 text-center text-gray-500">
                Aucune montre enregistrée dans le système. Allumez une montre pour qu'elle soit détectée automatiquement.
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
                      <div className="flex items-center gap-2">
                        {getStatusIcon(watch, miner)}
                      </div>
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
                        <span className="text-xs text-slate-500 italic">
                          Disponible pour attribution
                        </span>
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
          <h3 className="text-sm font-semibold text-white tracking-wider uppercase">Détails de l'appareil</h3>
          {selectedWatch ? (
            <div className="bg-[#1e293b] rounded-lg border border-gray-700 p-4 space-y-4 shadow-lg">
              <div className="flex items-center gap-3">
                <Cpu size={24} className="text-green-400" />
                <div>
                  <h4 className="text-white font-bold font-mono">{selectedWatch.id}</h4>
                  <p className="text-gray-400 text-xs">Dernière activité : {new Date(selectedWatch.last_seen).toLocaleTimeString('fr-FR')}</p>
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
                      <span className="text-gray-400">Zone d'affectation</span>
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
                Sélectionnez une montre pour voir ses détails d'attribution
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ASSIGNMENT MODAL */}
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
                    Aucun mineur disponible. Tous les mineurs actifs possèdent déjà une montre liée. Créez un profil de mineur d'abord.
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
                  Lier l'appareil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
