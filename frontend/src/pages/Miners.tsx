import { useState, useEffect } from 'react';
import { Search, Heart, MapPin, ChevronRight, Plus, Phone, User, Check, AlertCircle, Link2, Unlink } from 'lucide-react';
import { useStore } from '../store/useStore';
import apiService from '../services/api';

export default function Miners() {
  const { miners, setMiners, setSelectedMiner } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('Creuseur');
  const [phone, setPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [zone, setZone] = useState('ZONE B');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Quick Association State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningMiner, setAssigningMiner] = useState<any | null>(null);
  const [selectedWatchId, setSelectedWatchId] = useState('');
  const [watches, setWatches] = useState<any[]>([]);

  const loadWatches = async () => {
    try {
      const res = await apiService.getWatches();
      if (res.watches) {
        setWatches(res.watches);
      }
    } catch (err) {
      console.error('Erreur load watches:', err);
    }
  };

  const handleOpenAssign = async (miner: any) => {
    setAssigningMiner(miner);
    setSelectedWatchId('');
    await loadWatches();
    setShowAssignModal(true);
  };

  const handleQuickAssociate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningMiner || !selectedWatchId) return;
    try {
      await apiService.associateDevice(assigningMiner.id, selectedWatchId);
      setShowAssignModal(false);
      setAssigningMiner(null);
      setSelectedWatchId('');
      await refreshMiners();
    } catch (err: any) {
      alert("Erreur lors de l'attribution : " + (err.message || err));
    }
  };

  const handleQuickDissociate = async (watchId: string) => {
    if (!window.confirm(`Voulez-vous vraiment détacher la montre ${watchId} ?`)) return;
    try {
      await apiService.dissociateDevice(watchId);
      await refreshMiners();
    } catch (err: any) {
      alert("Erreur lors de la dissociation : " + (err.message || err));
    }
  };

  const refreshMiners = async () => {
    try {
      const res = await apiService.getMiners();
      if (res.miners) {
        const mappedMiners = res.miners.map((m: any) => ({
          ...m,
          position: m.position || { x: m.x || 500, y: m.y || 250, timestamp: Date.now() },
          trajectory: m.trajectory || [{ x: m.x || 500, y: m.y || 250, timestamp: Date.now() }],
          activityLevel: m.activityLevel || 0,
          status: m.status || 'safe',
          heartRate: m.heartRate || m.heart_rate || 72,
        }));
        setMiners(mappedMiners);
      }
    } catch (err) {
      console.error('Erreur refresh miners:', err);
    }
  };

  useEffect(() => {
    refreshMiners();
  }, []);

  const handleAddMiner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Le nom complet est obligatoire');
      return;
    }
    setFormError('');
    setIsSubmitting(true);

    try {
      await apiService.addMiner({
        name,
        role,
        phone,
        emergency_contact: emergencyContact,
        blood_group: bloodGroup,
        zone
      });
      
      // Reset form
      setName('');
      setRole('Creuseur');
      setPhone('');
      setEmergencyContact('');
      setBloodGroup('O+');
      setZone('ZONE B');
      setShowAddModal(false);
      
      // Reload
      await refreshMiners();
    } catch (err: any) {
      setFormError(err.message || 'Une erreur est survenue lors de la création');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMiners = miners.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.matricule.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      if (statusFilter === 'underground') matchesStatus = !!m.isUnderground;
      else if (statusFilter === 'in_service') matchesStatus = !!m.isInService && !m.isUnderground;
      else if (statusFilter === 'offline') matchesStatus = !m.isInService && !m.isUnderground;
      else matchesStatus = m.status === statusFilter;
    }
    
    const matchesZone = zoneFilter === 'all' || m.currentZone === zoneFilter || m.zone === zoneFilter;
    const matchesRole = roleFilter === 'all' || m.role === roleFilter;
    return matchesSearch && matchesStatus && matchesZone && matchesRole;
  });

  const getStatusColor = (miner: any) => {
    if (miner.status === 'danger') return 'bg-red-500';
    if (miner.status === 'warning') return 'bg-orange-500';
    if (miner.isUnderground) return 'bg-cyan-500';
    if (miner.isInService) return 'bg-green-500';
    return 'bg-gray-500';
  };

  const getPresenceBadge = (miner: any) => {
    if (miner.isUnderground) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-1.5 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
          Dans la mine ({miner.currentZone || miner.zone})
        </span>
      );
    }
    if (miner.isInService) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1.5 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
          En service
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1.5 w-fit">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
        Hors service
      </span>
    );
  };

  const zones = ['ZONE A', 'ZONE B', 'ZONE C', 'ZONE D', 'ZONE E', 'ZONE F'];
  const roles = ['Creuseur', 'Technicien', 'Transporteur', 'Médecin', 'Superviseur'];
  const bloodGroups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <img src={`/Logo-with-text.png`} alt="SupervisorApp" className="h-10 w-auto" />
          <div>
            <h1 className="text-xl font-bold text-white">Gestion des Mineurs</h1>
            <p className="text-sm text-gray-400">{miners.length} mineurs enregistrés</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 rounded border border-cyan-500/30 text-cyan-400 text-xs">
            <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></span>
            {miners.filter((m) => m.isUnderground).length} sous terre
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 rounded border border-green-500/30 text-green-400 text-xs">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            {miners.filter((m) => m.isInService && !m.isUnderground).length} en service
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 rounded border border-red-500/30 text-red-400 text-xs">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></span>
            {miners.filter((m) => m.status === 'danger').length} dangers
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded font-semibold transition-all shadow-[0_0_15px_rgba(34,197,94,0.2)] ml-2"
          >
            <Plus size={16} />
            Enregistrer un Mineur
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou matricule..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#1e293b] border border-gray-700 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-[#1e293b] border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-green-500"
        >
          <option value="all">Tous statuts</option>
          <option value="underground">Sous terre (Dans la mine)</option>
          <option value="in_service">En service (Hors mine)</option>
          <option value="offline">Hors service</option>
          <option value="danger">En danger 🚨</option>
          <option value="warning">En alerte ⚠️</option>
        </select>
        <select
          value={zoneFilter}
          onChange={(e) => setZoneFilter(e.target.value)}
          className="px-3 py-2 bg-[#1e293b] border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-green-500"
        >
          <option value="all">Toutes zones</option>
          {zones.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 bg-[#1e293b] border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-green-500"
        >
          <option value="all">Toutes fonctions</option>
          {roles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* Miners Table - Desktop */}
      <div className="hidden md:block bg-[#1e293b] rounded border border-gray-700 overflow-hidden shadow-xl">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700 bg-slate-800/40">
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-semibold uppercase tracking-wider">Mineur</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-semibold uppercase tracking-wider">Matricule</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-semibold uppercase tracking-wider">Fonction</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-semibold uppercase tracking-wider">Montre</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-semibold uppercase tracking-wider">Zone Actuelle</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-semibold uppercase tracking-wider">État Opérationnel</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-semibold uppercase tracking-wider">Biométrie</th>
              <th className="text-right px-4 py-3 text-xs text-gray-400 font-semibold uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredMiners.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-500 text-sm">
                  Aucun mineur trouvé
                </td>
              </tr>
            ) : (
              filteredMiners.map((miner) => (
                <tr
                  key={miner.id}
                  className="border-b border-gray-700/50 hover:bg-[#334155] transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 ${getStatusColor(miner)} rounded-full flex items-center justify-center text-white text-xs font-bold shadow`}
                      >
                        {miner.name
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')
                          .toUpperCase()}
                      </div>
                      <div>
                        <span className="text-white text-sm font-semibold block">{miner.name}</span>
                        {miner.phone && (
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Phone size={10} /> {miner.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-sm font-mono">{miner.matricule}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{miner.role}</td>
                  <td className="px-4 py-3">
                    {miner.watchId ? (
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs font-mono border border-blue-500/20">
                          {miner.watchId}
                        </span>
                        <button
                          onClick={() => handleQuickDissociate(miner.watchId!)}
                          title="Détacher la montre"
                          className="text-orange-400 hover:text-orange-300 transition-colors p-0.5"
                        >
                          <Unlink size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleOpenAssign(miner)}
                        className="px-2 py-0.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs rounded border border-green-500/20 transition-all flex items-center gap-1 w-fit"
                      >
                        <Link2 size={10} />
                        Associer
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-gray-300 text-sm">
                      <MapPin size={14} className="text-gray-500" />
                      {miner.isUnderground ? miner.currentZone : (miner.zone || 'Surface')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {getPresenceBadge(miner)}
                  </td>
                  <td className="px-4 py-3">
                    {miner.isInService ? (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-xs">
                          <Heart
                            size={14}
                            className={`animate-pulse ${miner.heartRate > 100 ? 'text-red-400' : 'text-green-400'}`}
                          />
                          <span className={miner.heartRate > 100 ? 'text-red-400' : 'text-gray-300'}>
                            {miner.heartRate} bpm
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-400 bg-slate-800 px-1.5 py-0.5 rounded">
                          🔋 {miner.battery || 100}%
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedMiner(miner)}
                      className="text-gray-400 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 p-1.5 rounded"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Miners Cards - Mobile */}
      <div className="md:hidden grid grid-cols-1 gap-3">
        {filteredMiners.map((miner) => (
          <div key={miner.id} className="bg-[#1e293b] rounded border border-gray-700 p-4 space-y-3 shadow-md">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 ${getStatusColor(miner)} rounded-full flex items-center justify-center text-white text-sm font-bold`}
                >
                  {miner.name
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()}
                </div>
                <div>
                  <h3 className="text-white font-semibold">{miner.name}</h3>
                  <p className="text-gray-400 text-xs font-mono">{miner.matricule} • {miner.role}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMiner(miner)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs border-t border-gray-800 pt-2.5">
              <div>
                <span className="text-gray-500 block mb-0.5">Montre</span>
                {miner.watchId ? (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-300 font-mono">{miner.watchId}</span>
                    <button
                      onClick={() => handleQuickDissociate(miner.watchId!)}
                      className="text-orange-400 hover:text-orange-300 transition-colors p-0.5"
                    >
                      <Unlink size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleOpenAssign(miner)}
                    className="text-green-400 hover:text-green-300 text-xs flex items-center gap-1 font-semibold"
                  >
                    <Link2 size={12} />
                    Associer
                  </button>
                )}
              </div>
              <div>
                <span className="text-gray-500">Zone d'affectation</span>
                <p className="text-gray-300 flex items-center gap-1">
                  <MapPin size={12} className="text-gray-500" />
                  {miner.isUnderground ? miner.currentZone : (miner.zone || 'Surface')}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500 block mb-1">Présence</span>
                {getPresenceBadge(miner)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* REGISTRATION MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e293b] border border-gray-700 rounded-xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <User className="text-green-400" /> Enregistrer un nouveau mineur
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              Enregistrez le mineur dans le système RH. Le matricule sera généré automatiquement.
            </p>

            {formError && (
              <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddMiner} className="space-y-4">
              <div>
                <label className="text-xs text-gray-300 font-semibold block mb-1">Nom complet *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Israel Lum"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-300 font-semibold block mb-1">Fonction *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-slate-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-300 font-semibold block mb-1">Groupe Sanguin</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full bg-slate-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                  >
                    {bloodGroups.map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-300 font-semibold block mb-1">Téléphone portable</label>
                <input
                  type="tel"
                  placeholder="ex: +243 812 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="text-xs text-red-400 font-semibold block mb-1">Contact d'urgence *</label>
                <input
                  type="text"
                  placeholder="ex: +243 899 999 999 (Famille)"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  className="w-full bg-slate-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-300 font-semibold block mb-1">Zone d'affectation habituelle</label>
                <select
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  className="w-full bg-slate-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                >
                  {zones.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold py-2 rounded transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold py-2 rounded transition-colors flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? 'Enregistrement...' : <><Check size={14} /> Enregistrer</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ASSIGN MODAL */}
      {showAssignModal && assigningMiner && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e293b] border border-gray-700 rounded-xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Link2 className="text-green-400" /> Associer une montre
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              Attribuer une montre physique à <strong>{assigningMiner.name}</strong> ({assigningMiner.matricule}).
            </p>

            <form onSubmit={handleQuickAssociate} className="space-y-4">
              <div>
                <label className="text-xs text-gray-300 font-semibold block mb-1">Choisir une montre disponible *</label>
                {watches.filter(w => w.status === 'available').length === 0 ? (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs rounded">
                    Aucune montre disponible. Allumez une montre ou détachez-en une sur un autre mineur.
                  </div>
                ) : (
                  <select
                    required
                    value={selectedWatchId}
                    onChange={(e) => setSelectedWatchId(e.target.value)}
                    className="w-full bg-slate-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                  >
                    <option value="">-- Choisir une montre --</option>
                    {watches
                      .filter(w => w.status === 'available')
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.id} (Disponible)
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
                    setAssigningMiner(null);
                    setSelectedWatchId('');
                  }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold py-2 rounded transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!selectedWatchId}
                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:text-gray-400 text-white text-xs font-semibold py-2 rounded transition-colors"
                >
                  Associer la montre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
