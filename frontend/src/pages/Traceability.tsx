import { useState, useEffect } from 'react';
import { useStore, TraceEvent, TraceEventType } from '../store/useStore';
import apiService from '../services/api';
import {
  Search,
  Download,
  LogIn,
  LogOut,
  ArrowRightLeft,
  Coffee,
  Wrench,
  PlayCircle,
  StopCircle,
  User,
  AlertTriangle,
  MapPin,
  Compass,
  ShieldAlert,
  Clock,
  Milestone,
  LucideIcon,
} from 'lucide-react';

interface RouteProposal {
  title: string;
  distance: string;
  estTime: string;
  safetyGear: string[];
  steps: string[];
}

function getRouteToMiner(zone: string, gallery: string): RouteProposal {
  const upperZone = zone.toUpperCase();

  if (upperZone.includes('ZONE A') || upperZone === 'A') {
    return {
      title: "Itinéraire d'accès : Mine à Ciel Ouvert (Zone A)",
      distance: '1 200 m',
      estTime: '6 min',
      safetyGear: [
        'Gilet de sécurité haute visibilité',
        'Casque de protection avec visière',
        'Chaussures de sécurité renforcées',
      ],
      steps: [
        "Quitter le Centre de Contrôle de surface et s'équiper des EPI réglementaires de surface.",
        "Prendre le véhicule utilitaire tout-terrain (4x4 d'intervention).",
        "Emprunter la piste d'accès principale Nord pour descendre dans la fosse.",
        `Suivre le balisage de sécurité en contournant la zone d'excavation active.`,
        `Rejoindre à pied la section ${gallery || 'de liaison'} pour localiser le mineur.`,
      ],
    };
  } else if (upperZone.includes('ZONE B') || upperZone === 'B') {
    return {
      title: "Itinéraire d'accès : Rampes de Transport (Zone B)",
      distance: '1 500 m',
      estTime: '8 min',
      safetyGear: [
        'Gilet de sécurité classe 3',
        "Bouchons d'oreilles homologués",
        'Lunettes de protection',
      ],
      steps: [
        "Quitter le bâtiment technique et s'équiper du matériel de protection acoustique.",
        'Suivre la route de service parallèle au convoyeur à bande principal.',
        'Entrer dans la zone des rampes par le sas piéton sécurisé.',
        `Rester vigilant vis-à-vis des tombereaux lourds CAT en phase de descente/remontée.`,
        `Entrer dans le secteur de rampe ou galerie (${gallery || 'Rampe Principale'}) pour intercepter le mineur.`,
      ],
    };
  } else if (upperZone.includes('ZONE C') || upperZone === 'C') {
    return {
      title: "Itinéraire d'accès : Raffinerie & Traitement (Zone C)",
      distance: '600 m',
      estTime: '4 min',
      safetyGear: [
        'Masque de protection FFP3 anti-poussière',
        'Lunettes de protection étanches',
        'Casque avec jugulaire',
      ],
      steps: [
        'Passer par le sas de décontamination de la Raffinerie Est et enfiler le masque respiratoire.',
        'Prendre la passerelle métallique surélevée surplombant le broyeur primaire.',
        'Descendre les escaliers techniques menant aux cellules de flottation.',
        `Traverser la galerie technique de distribution hydraulique.`,
        `Entrer dans la salle de commande ou le secteur d'usine spécifié (${gallery || 'Flottation'}).`,
      ],
    };
  } else if (upperZone.includes('ZONE D') || upperZone === 'D') {
    return {
      title: "Itinéraire d'accès : Niveau -100m (Stockage - Zone D)",
      distance: '800 m (dont 100m verticaux)',
      estTime: '11 min',
      safetyGear: [
        'Auto-sauveteur autonome (type oxygène chimique)',
        'Lampe frontale de mineur chargée',
        'Détecteur multi-gaz portable (CO/O2/H2S)',
      ],
      steps: [
        "Se diriger vers le Puits d'Accès Principal et embarquer dans la cage d'ascenseur n°1.",
        'Demander le palier Niveau -100m au pupitre de commande.',
        "À la sortie de la cage, vérifier l'affichage fixe des conditions de gaz.",
        'Progresser dans la galerie principale de liaison Est sous ventilation forcée.',
        `Tourner à gauche après la porte coupe-feu vers la galerie de stockage (${gallery || 'Galerie D'}).`,
      ],
    };
  } else if (upperZone.includes('ZONE E') || upperZone === 'E') {
    return {
      title: "Itinéraire d'accès : Niveau -200m (Atelier - Zone E)",
      distance: '1 100 m (dont 200m verticaux)',
      estTime: '14 min',
      safetyGear: [
        'Auto-sauveteur de ceinture',
        'Lampe de casque ATEX',
        'Détecteur multigaz CO/CH4',
        'Gants de protection mécanique',
      ],
      steps: [
        'Accéder au puits de service n°2 (cage principale lourde).',
        "Effectuer la descente jusqu'au Niveau -200m.",
        "Quitter la recette du puits et s'engager dans la galerie de transport de matériel.",
        'Emprunter le by-pass piéton balisé en vert pour éviter les chargeuses souterraines (LHD).',
        `Pénétrer dans le hall d'entretien mécanique ou la galerie secondaire (${gallery || 'Atelier E'}).`,
      ],
    };
  } else if (upperZone.includes('ZONE F') || upperZone === 'F') {
    return {
      title: "Itinéraire d'accès : Niveau -300m (Front de taille - Zone F)",
      distance: '1 400 m (dont 300m verticaux)',
      estTime: '18 min',
      safetyGear: [
        'Auto-sauveteur de secours autonome (obligatoire)',
        'Lampe de sécurité frontale ATEX',
        'Explosimètre individuel réglé',
        'Vêtements de protection antistatiques',
      ],
      steps: [
        "Se présenter au puits d'accès rapide n°1 (descente rapide autorisée).",
        "Descendre au Niveau -300m (fond de mine sous haute pression d'aération).",
        'Suivre le boyau principal Ouest en restant près de la ligne de guidage.',
        'Traverser le sas de ventilation n°4 (équilibrage de pression).',
        `Avancer avec prudence jusqu'au front de taille ou la galerie active (${gallery || 'Galerie F'}).`,
      ],
    };
  } else {
    return {
      title: `Itinéraire d'accès : ${zone}`,
      distance: 'Variable',
      estTime: 'Non spécifié',
      safetyGear: ['Équipements de protection individuelle standards'],
      steps: [
        "Consulter le poste de commandement pour autorisation d'accès.",
        `Respecter la signalétique de sécurité propre à la ${zone}.`,
        `Progresser vers la galerie ${gallery || 'principale'}.`,
      ],
    };
  }
}

const EVENT_CONFIG: Record<
  TraceEventType,
  { icon: LucideIcon; label: string; color: string; bg: string }
> = {
  entry: { icon: LogIn, label: 'Entrée zone', color: 'text-green-400', bg: 'bg-green-500/20' },
  exit: { icon: LogOut, label: 'Sortie zone', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  zone_change: {
    icon: ArrowRightLeft,
    label: 'Changement zone',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/20',
  },
  alert: { icon: AlertTriangle, label: 'Alerte', color: 'text-red-400', bg: 'bg-red-500/20' },
  rest: { icon: Coffee, label: 'Pause', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  equipment: {
    icon: Wrench,
    label: 'Équipement',
    color: 'text-purple-400',
    bg: 'bg-purple-500/20',
  },
  shift_start: {
    icon: PlayCircle,
    label: 'Début poste',
    color: 'text-green-400',
    bg: 'bg-green-500/20',
  },
  shift_end: {
    icon: StopCircle,
    label: 'Fin poste',
    color: 'text-orange-400',
    bg: 'bg-orange-500/20',
  },
};



interface TraceStats {
  totalEntries?: number;
  totalExits?: number;
  totalZoneChanges?: number;
  totalAlerts?: number;
  uniqueMiners?: number;
}

export default function Traceability() {
  const { traceEvents, miners } = useStore();
  const [events, setEvents] = useState<TraceEvent[]>(
    traceEvents.length > 0 ? traceEvents : [],
  );
  const [stats, setStats] = useState<TraceStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterZone, setFilterZone] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selectedMiner, setSelectedMiner] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Access Control Pointage State
  const [acMinerId, setAcMinerId] = useState('');
  const [acAction, setAcAction] = useState<'entry' | 'exit'>('entry');
  const [acZone, setAcZone] = useState('ZONE B');
  const [acResponsible, setAcResponsible] = useState('Jean Dupont');
  const [acSubmitting, setAcSubmitting] = useState(false);

  const handleAccessControlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acMinerId) return;
    setAcSubmitting(true);
    try {
      const res = await apiService.toggleAccessControl({
        minerId: acMinerId,
        action: acAction,
        zone: acZone,
        responsible: acResponsible
      });
      alert(res.message || "Passage enregistré !");
      setAcMinerId('');
      
      // Refresh page events and stats
      const [eventsRes, statsRes] = await Promise.all([
        apiService.getTraceEvents({ limit: 100 }),
        apiService.getTraceStats(),
      ]);
      if (eventsRes.events) {
        const mapped = (eventsRes.events as { timestamp: string | number; [key: string]: unknown }[]).map((e) => ({
          ...e,
          timestamp: new Date(e.timestamp).getTime(),
        })) as unknown as TraceEvent[];
        setEvents(mapped);
      }
      if (statsRes) setStats(statsRes);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erreur de pointage");
    } finally {
      setAcSubmitting(false);
    }
  };

  const selectedEventForName = events.find((e) => e.minerId === selectedMiner);
  const selectedMinerName = selectedEventForName?.minerName;
  const selectedMinerProfile = miners.find(
    (m) =>
      m.id === selectedMiner ||
      m.matricule === selectedMiner ||
      (selectedMinerName && m.name.toLowerCase() === selectedMinerName.toLowerCase()),
  );

  const activeZone = selectedMinerProfile?.currentZone || selectedEventForName?.zone || 'ZONE A';
  const activeGallery =
    selectedMinerProfile?.currentGallery || selectedEventForName?.gallery || 'Galerie 1';

  // Coordonnées des centres de zones pour tracé et mini-carte
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

  const getFallbackTrajectoryForZone = (zoneName: string) => {
    const center = ZONE_CENTERS[zoneName] || ZONE_CENTERS['ZONE A'];
    return [
      { x: center.x - 50, y: center.y - 15, timestamp: Date.now() - 300000 },
      { x: center.x - 20, y: center.y + 15, timestamp: Date.now() - 150000 },
      { x: center.x, y: center.y, timestamp: Date.now() },
    ];
  };

  const activePosition = selectedMinerProfile?.position || {
    x: (ZONE_CENTERS[activeZone] || ZONE_CENTERS['ZONE A']).x,
    y: (ZONE_CENTERS[activeZone] || ZONE_CENTERS['ZONE A']).y,
    timestamp: Date.now(),
  };

  const activeTrajectory =
    selectedMinerProfile?.trajectory && selectedMinerProfile.trajectory.length > 0
      ? selectedMinerProfile.trajectory
      : getFallbackTrajectoryForZone(activeZone);

  const routeProposal = selectedMiner ? getRouteToMiner(activeZone, activeGallery) : null;

  // Fetch events from API on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [eventsRes, statsRes] = await Promise.all([
          apiService.getTraceEvents({ limit: 100 }),
          apiService.getTraceStats(),
        ]);
        if (eventsRes.events?.length > 0) {
          const mapped = (eventsRes.events as { timestamp: string | number; [key: string]: unknown }[]).map((e) => ({
            ...e,
            timestamp: new Date(e.timestamp).getTime(),
          })) as unknown as TraceEvent[];
          setEvents(mapped);
        }
        if (statsRes) setStats(statsRes);
      } catch (err) {
        console.warn('API non disponible, utilisation des données locales');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Reload with filters
  const applyFilters = async () => {
    setLoading(true);
    try {
      const res = await apiService.getTraceEvents({
        minerId: selectedMiner || undefined,
        zone: filterZone !== 'all' ? filterZone : undefined,
        eventType: filterType !== 'all' ? filterType : undefined,
        limit: 100,
      });
      if (res.events?.length > 0) {
        const mapped = (res.events as { timestamp: string | number; [key: string]: unknown }[]).map((e) => ({
          ...e,
          timestamp: new Date(e.timestamp).getTime(),
        })) as unknown as TraceEvent[];
        setEvents(mapped);
      }
    } catch {
      // Fallback: filter local data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    applyFilters();
  }, [filterZone, filterType, selectedMiner]);

  const filteredEvents = events.filter((e) => {
    if (
      searchQuery &&
      !e.minerName.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !e.id.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    if (filterZone !== 'all' && e.zone !== filterZone) return false;
    if (filterType !== 'all' && e.eventType !== filterType) return false;
    if (selectedMiner && e.minerId !== selectedMiner) return false;
    return true;
  });

  // Stats - prefer API stats, fallback to computed
  const totalEntries = stats?.totalEntries ?? events.filter((e) => e.eventType === 'entry').length;
  const totalExits = stats?.totalExits ?? events.filter((e) => e.eventType === 'exit').length;
  const totalAlerts = stats?.totalAlerts ?? events.filter((e) => e.eventType === 'alert').length;
  const totalZoneChanges =
    stats?.totalZoneChanges ?? events.filter((e) => e.eventType === 'zone_change').length;
  const uniqueMiners = stats?.uniqueMiners ?? new Set(events.map((e) => e.minerId)).size;

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

  return (
    <div className="p-4 space-y-4 bg-[#0f172a] min-h-screen">
      {/* Header */}
      <div className="bg-[#1e293b] rounded-lg border border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={`/Logo-with-text.png`} alt="SupervisorApp" className="h-10 w-auto" />
            <div>
              <h1 className="text-xl font-bold text-white">Traçabilité</h1>
              <p className="text-sm text-gray-400">Suivi des mouvements et activités des mineurs</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded font-medium transition-colors" onClick={() => alert('Fonctionnalité en cours de développement')}>
            <Download size={16} />
            Exporter
          </button>
          {loading && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
              Chargement...
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-[#1e293b] rounded-lg border border-gray-700 p-3">
          <div className="flex items-center gap-2 mb-1">
            <LogIn size={16} className="text-green-400" />
            <span className="text-[10px] text-gray-400">Entrées</span>
          </div>
          <p className="text-xl font-bold text-white">{totalEntries}</p>
        </div>
        <div className="bg-[#1e293b] rounded-lg border border-gray-700 p-3">
          <div className="flex items-center gap-2 mb-1">
            <LogOut size={16} className="text-blue-400" />
            <span className="text-[10px] text-gray-400">Sorties</span>
          </div>
          <p className="text-xl font-bold text-white">{totalExits}</p>
        </div>
        <div className="bg-[#1e293b] rounded-lg border border-gray-700 p-3">
          <div className="flex items-center gap-2 mb-1">
            <ArrowRightLeft size={16} className="text-cyan-400" />
            <span className="text-[10px] text-gray-400">Chgts zone</span>
          </div>
          <p className="text-xl font-bold text-white">{totalZoneChanges}</p>
        </div>
        <div className="bg-[#1e293b] rounded-lg border border-gray-700 p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-red-400" />
            <span className="text-[10px] text-gray-400">Alertes</span>
          </div>
          <p className="text-xl font-bold text-white">{totalAlerts}</p>
        </div>
        <div className="bg-[#1e293b] rounded-lg border border-gray-700 p-3">
          <div className="flex items-center gap-2 mb-1">
            <User size={16} className="text-amber-400" />
            <span className="text-[10px] text-gray-400">Mineurs actifs</span>
          </div>
          <p className="text-xl font-bold text-white">{uniqueMiners}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Colonne 1 - Gauche : MINEURS SUIVIS & STATS (col-span-3) */}
        <div className="col-span-1 lg:col-span-3 space-y-3">
          {/* ACCÈS PORTIQUE */}
          <div className="bg-[#1e293b] rounded-lg border border-gray-700 p-4 shadow-md space-y-3">
            <h3 className="text-xs font-bold text-white tracking-wider flex items-center gap-1.5 uppercase">
              <Compass size={13} className="text-green-400" />
              Contrôle d'Accès Portique
            </h3>
            <p className="text-[10px] text-gray-400">
              Badge NFC, QR Code ou Validation manuelle d'entrée/sortie de galerie.
            </p>
            <form onSubmit={handleAccessControlSubmit} className="space-y-3.5">
              <div>
                <label className="text-[10px] text-gray-400 font-semibold block mb-1">Mineur *</label>
                <select
                  required
                  value={acMinerId}
                  onChange={(e) => {
                    setAcMinerId(e.target.value);
                    const selected = miners.find(m => m.id === e.target.value);
                    if (selected) {
                      setAcAction(selected.isUnderground ? 'exit' : 'entry');
                      setAcZone(selected.isUnderground ? (selected.currentZone || 'ZONE B') : (selected.zone || 'ZONE B'));
                    }
                  }}
                  className="w-full bg-[#0b1a2a] border border-gray-700 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-green-500"
                >
                  <option value="">-- Choisir un mineur --</option>
                  {miners.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.matricule}) - {m.isUnderground ? '🧱 Sous terre' : m.isInService ? '🟢 En service' : '⚪ Hors service'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 font-semibold block mb-1">Action</label>
                  <select
                    value={acAction}
                    onChange={(e) => setAcAction(e.target.value as 'entry' | 'exit')}
                    className="w-full bg-[#0b1a2a] border border-gray-700 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-green-500"
                  >
                    <option value="entry">Entrée ↗</option>
                    <option value="exit">Sortie ↘</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-semibold block mb-1">Zone</label>
                  <select
                    value={acZone}
                    onChange={(e) => setAcZone(e.target.value)}
                    className="w-full bg-[#0b1a2a] border border-gray-700 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-green-500"
                  >
                    {['ZONE A', 'ZONE B', 'ZONE C', 'ZONE D', 'ZONE E', 'ZONE F'].map((z) => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 font-semibold block mb-1">Responsable</label>
                <input
                  type="text"
                  placeholder="Superviseur RH"
                  value={acResponsible}
                  onChange={(e) => setAcResponsible(e.target.value)}
                  className="w-full bg-[#0b1a2a] border border-gray-700 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-green-500"
                />
              </div>

              <button
                type="submit"
                disabled={acSubmitting || !acMinerId}
                className="w-full py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold text-xs rounded transition-colors"
              >
                {acSubmitting ? 'Validation...' : 'Valider le passage'}
              </button>
            </form>
          </div>

          {/* Active Miners */}
          <div className="bg-[#1e293b] rounded-lg border border-gray-700">
            <div className="p-3 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white tracking-wider flex items-center gap-1.5">
                <User size={13} className="text-blue-400" />
                MINEURS SUIVIS
              </h3>
              <span className="text-[9px] bg-slate-800 text-gray-400 px-1.5 py-0.5 rounded font-mono">
                {Array.from(new Set(events.map((e) => e.minerId))).length}
              </span>
            </div>
            <div className="p-2 space-y-1 max-h-[220px] overflow-y-auto">
              {Array.from(new Set(events.map((e) => e.minerId))).map((minerId) => {
                const minerEvents = events.filter((e) => e.minerId === minerId);
                const lastEvent = minerEvents[0];
                const entryCount = minerEvents.filter((e) => e.eventType === 'entry').length;
                const exitCount = minerEvents.filter((e) => e.eventType === 'exit').length;
                const alertCount = minerEvents.filter((e) => e.eventType === 'alert').length;
                const isSelected = selectedMiner === minerId;

                return (
                  <button
                    key={minerId}
                    onClick={() => setSelectedMiner(isSelected ? null : minerId)}
                    className={`w-full flex items-center justify-between p-2 rounded border transition-colors text-left ${
                      isSelected
                        ? 'bg-green-500/10 border-green-500/50'
                        : 'bg-[#0b1a2a] border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold">
                        {lastEvent.minerName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </div>
                      <div>
                        <p className="text-[11px] text-white font-medium truncate max-w-[100px]">
                          {lastEvent.minerName}
                        </p>
                        <p className="text-[9px] text-gray-400">{lastEvent.zone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {alertCount > 0 && (
                        <span className="bg-red-500/20 text-red-400 text-[9px] px-1.5 py-0.5 rounded font-bold">
                          {alertCount}
                        </span>
                      )}
                      <span className="text-[9px] text-gray-400 font-medium">
                        {entryCount}↗ {exitCount}↘
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Zone Activity */}
          <div className="bg-[#1e293b] rounded-lg border border-gray-700">
            <div className="p-3 border-b border-gray-700">
              <h3 className="text-xs font-semibold text-white tracking-wider flex items-center gap-1.5">
                <Milestone size={13} className="text-cyan-400" />
                ACTIVITÉ PAR ZONE
              </h3>
            </div>
            <div className="p-2 space-y-1">
              {['A', 'B', 'C', 'D', 'E', 'F'].map((zone) => {
                const zoneEvents = events.filter((e) => e.zone === `ZONE ${zone}`);
                const entries = zoneEvents.filter((e) => e.eventType === 'entry').length;
                const exits = zoneEvents.filter((e) => e.eventType === 'exit').length;
                const total = zoneEvents.length;
                return (
                  <div
                    key={zone}
                    className="flex items-center justify-between p-1.5 bg-[#0b1a2a] rounded border border-gray-700"
                  >
                    <span className="text-[11px] text-white font-medium">Zone {zone}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-green-400">{entries}↗</span>
                      <span className="text-[9px] text-blue-400">{exits}↘</span>
                      <span className="text-[9px] text-gray-400">({total})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Event Type Distribution */}
          <div className="bg-[#1e293b] rounded-lg border border-gray-700">
            <div className="p-3 border-b border-gray-700">
              <h3 className="text-xs font-semibold text-white tracking-wider flex items-center gap-1.5">
                <Wrench size={13} className="text-purple-400" />
                RÉPARTITION PAR TYPE
              </h3>
            </div>
            <div className="p-2 space-y-1">
              {Object.entries(EVENT_CONFIG).map(([type, config]) => {
                const count = events.filter((e) => e.eventType === type).length;
                const percentage = events.length > 0 ? (count / events.length) * 100 : 0;
                const Icon = config.icon;
                return (
                  <div key={type} className="flex items-center gap-2 p-1">
                    <Icon size={12} className={config.color} />
                    <span className="text-[10px] text-gray-300 flex-1">{config.label}</span>
                    <div className="w-12 h-1 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${config.bg.replace('/20', '')}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 min-w-[15px] text-right font-mono">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Colonne 2 - Centre : TIMELINE HISTORIQUE (col-span-5) */}
        <div className="col-span-1 lg:col-span-5">
          <div className="bg-[#1e293b] rounded-lg border border-gray-700 flex flex-col lg:h-[700px] h-[550px]">
            {/* Filters */}
            <div className="p-3 border-b border-gray-700 flex flex-wrap items-center gap-2 bg-slate-800/20">
              <div className="relative flex-1">
                <Search
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Rechercher mineur ou ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0b1a2a] border border-gray-700 rounded pl-7 pr-2 py-1 text-white text-xs placeholder-gray-500 focus:border-green-500 focus:outline-none"
                />
              </div>
              <select
                value={filterZone}
                onChange={(e) => setFilterZone(e.target.value)}
                className="bg-[#0b1a2a] border border-gray-700 rounded px-1.5 py-1 text-white text-xs focus:outline-none focus:border-green-500"
              >
                <option value="all">Toutes zones</option>
                {['ZONE A', 'ZONE B', 'ZONE C', 'ZONE D', 'ZONE E', 'ZONE F'].map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-[#0b1a2a] border border-gray-700 rounded px-1.5 py-1 text-white text-xs focus:outline-none focus:border-green-500"
              >
                <option value="all">Tous types</option>
                {Object.entries(EVENT_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Timeline */}
            <div className="p-2 space-y-1 overflow-y-auto flex-1 bg-slate-950/20">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-xs">Aucun événement trouvé</div>
              ) : (
                filteredEvents.map((event) => {
                  const config = EVENT_CONFIG[event.eventType];
                  const Icon = config.icon;
                  return (
                    <div
                      key={event.id}
                      className={`flex items-center gap-2.5 p-2 rounded border transition-colors cursor-pointer hover:border-gray-600 ${
                        selectedMiner === event.minerId
                          ? 'bg-green-500/10 border-green-500/50 shadow-md shadow-green-950/25'
                          : 'bg-[#0b1a2a] border-gray-700/80'
                      }`}
                      onClick={() =>
                        setSelectedMiner(selectedMiner === event.minerId ? null : event.minerId)
                      }
                    >
                      {/* Time */}
                      <div className="min-w-[45px] text-right shrink-0">
                        <p className="text-[9px] text-gray-400 font-mono">
                          {formatDate(event.timestamp)}
                        </p>
                        <p className="text-xs text-white font-medium font-mono">
                          {formatTime(event.timestamp)}
                        </p>
                      </div>

                      {/* Event type badge */}
                      <div
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded shrink-0 ${config.bg}`}
                      >
                        <Icon size={11} className={config.color} />
                        <span
                          className={`text-[9px] font-semibold uppercase tracking-wide ${config.color}`}
                        >
                          {config.label.split(' ')[0]}
                        </span>
                      </div>

                      {/* Miner info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white font-semibold truncate">
                          {event.minerName}
                        </p>
                        <p className="text-[9px] text-gray-400 font-mono">
                          {event.id} • {event.minerId}
                        </p>
                      </div>

                      {/* Zone */}
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-300 font-medium">{event.zone}</p>
                        <p className="text-[9px] text-gray-500">{event.gallery}</p>
                      </div>

                      {/* Details */}
                      {event.details && (
                        <span className="text-[9px] text-gray-400 max-w-[80px] truncate shrink-0 italic">
                          {event.details}
                        </span>
                      )}
                      {event.duration && (
                        <span className="text-[9px] text-amber-400 shrink-0 font-mono">
                          {event.duration}m
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Colonne 3 - Droite : CARTE SUIVI & DÉTAILS ITINÉRAIRE (col-span-4) */}
        <div className="col-span-1 lg:col-span-4 space-y-3">
          {!selectedMiner ? (
            /* Placeholder state when no miner is selected */
            <div className="bg-[#1e293b] rounded-lg border border-gray-700 p-6 flex flex-col items-center justify-center text-center lg:h-[700px] min-h-[450px] space-y-4 shadow-lg">
              <div className="p-4 bg-slate-900 rounded-full border border-gray-800 text-cyan-500/80 animate-pulse">
                <Compass size={36} />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-white tracking-wider uppercase">
                  SUIVI & CALCUL D'ITINÉRAIRE
                </h3>
                <p className="text-xs text-gray-400 max-w-[280px] leading-relaxed mx-auto">
                  Sélectionnez un mineur dans la liste des mineurs suivis ou dans le flux
                  d'événements pour visualiser son tracé et la proposition d'itinéraire
                  d'intervention.
                </p>
              </div>
            </div>
          ) : (
            /* Active Tracking and Routing details */
            <div className="space-y-3 lg:h-[700px] h-auto flex flex-col justify-between">
              {/* Mini Trace Map */}
              <div className="bg-[#1e293b] rounded-lg border border-gray-700 overflow-hidden flex flex-col">
                <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between bg-slate-800/60">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={13} className="text-green-400" />
                    <h3 className="text-xs font-semibold text-white tracking-wider">
                      SUIVI DE POSITION
                    </h3>
                  </div>
                  <span className="text-[9px] font-mono text-cyan-400 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/80 animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                    TEMPS RÉEL
                  </span>
                </div>

                <div className="p-2 bg-[#0b1a2a] relative">
                  {/* SVG mini-map */}
                  <svg
                    width="1000"
                    height="500"
                    viewBox="0 0 1000 500"
                    className="w-full h-auto bg-[#0b1a2a] border border-slate-800/80 rounded transition-all duration-300"
                  >
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

                    {/* Zone Polygons with custom labels */}
                    {Object.entries(ZONE_CENTERS).map(([key, center]) => {
                      const isActive = activeZone === key;
                      const opacity = isActive ? 0.35 : 0.06;
                      const strokeOpacity = isActive ? 0.8 : 0.15;
                      const strokeWidth = isActive ? 4 : 2;

                      // Get original path coordinates
                      let pathD = '';
                      if (key === 'ZONE A')
                        pathD =
                          'M 40 40 Q 150 30 280 45 Q 320 80 310 150 Q 300 200 250 230 Q 180 250 120 240 Q 50 220 40 160 Q 35 100 40 40 Z';
                      else if (key === 'ZONE B')
                        pathD =
                          'M 290 50 Q 400 35 530 45 Q 570 75 560 140 Q 550 200 500 225 Q 430 245 370 235 Q 310 220 300 170 Q 295 110 290 50 Z';
                      else if (key === 'ZONE C')
                        pathD =
                          'M 540 50 Q 650 35 780 45 Q 820 80 810 150 Q 800 200 750 225 Q 680 245 620 235 Q 560 220 550 170 Q 545 110 540 50 Z';
                      else if (key === 'ZONE D')
                        pathD =
                          'M 40 260 Q 150 245 280 255 Q 320 285 310 350 Q 300 410 250 435 Q 180 455 120 445 Q 50 425 40 370 Q 35 310 40 260 Z';
                      else if (key === 'ZONE E')
                        pathD =
                          'M 290 310 Q 400 295 530 305 Q 570 335 560 400 Q 550 460 500 485 Q 430 505 370 495 Q 310 480 300 430 Q 295 370 290 310 Z';
                      else if (key === 'ZONE F')
                        pathD =
                          'M 540 310 Q 650 295 780 305 Q 820 335 810 400 Q 800 460 750 485 Q 680 505 620 495 Q 560 480 550 430 Q 545 370 540 310 Z';

                      return (
                        <g key={key}>
                          <path
                            d={pathD}
                            fill={center.color}
                            fillOpacity={opacity}
                            stroke={center.color}
                            strokeWidth={strokeWidth}
                            strokeOpacity={strokeOpacity}
                            strokeLinecap="round"
                            className="transition-all duration-300"
                          />
                          {/* Label center of the zone */}
                          <text
                            x={center.x}
                            y={center.y + 40}
                            fill={isActive ? '#ffffff' : center.labelColor}
                            fillOpacity={isActive ? 1 : 0.4}
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
                            fillOpacity={isActive ? 0.9 : 0.25}
                            fontSize="11"
                            textAnchor="middle"
                          >
                            {center.depth}
                          </text>
                        </g>
                      );
                    })}

                    {/* Trajectory dotted line */}
                    {activeTrajectory.length > 1 && (
                      <path
                        d={activeTrajectory
                          .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                          .join(' ')}
                        fill="none"
                        stroke={
                          selectedMinerProfile?.status === 'danger'
                            ? '#ef4444'
                            : selectedMinerProfile?.status === 'warning'
                              ? '#f97316'
                              : '#22c55e'
                        }
                        strokeWidth="3.5"
                        strokeDasharray="6,6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.85"
                      />
                    )}

                    {/* Blinking helmet / location marker of the selected miner */}
                    <g transform={`translate(${activePosition.x}, ${activePosition.y})`}>
                      {/* Pulsating background circle */}
                      <circle
                        r="25"
                        fill={
                          selectedMinerProfile?.status === 'danger'
                            ? 'rgba(239, 68, 68, 0.25)'
                            : selectedMinerProfile?.status === 'warning'
                              ? 'rgba(249, 115, 22, 0.25)'
                              : 'rgba(34, 197, 94, 0.25)'
                        }
                        className="animate-ping"
                      />
                      {/* Glow effect filter */}
                      <circle
                        r="16"
                        fill={
                          selectedMinerProfile?.status === 'danger'
                            ? '#ef4444'
                            : selectedMinerProfile?.status === 'warning'
                              ? '#f97316'
                              : '#22c55e'
                        }
                        stroke="#ffffff"
                        strokeWidth="2.5"
                        filter={
                          selectedMinerProfile?.status === 'danger'
                            ? 'url(#glowRed)'
                            : selectedMinerProfile?.status === 'warning'
                              ? 'url(#glowOrange)'
                              : 'url(#glowGreen)'
                        }
                      />
                      {/* Helmet emoji */}
                      <text x="-7" y="5" fontSize="12">
                        👷
                      </text>
                    </g>

                    {/* Floating miner name card */}
                    <g transform={`translate(${activePosition.x}, ${activePosition.y - 30})`}>
                      <rect
                        x="-60"
                        y="-10"
                        width="120"
                        height="20"
                        fill="#0b1a2a"
                        stroke={
                          selectedMinerProfile?.status === 'danger'
                            ? '#ef4444'
                            : selectedMinerProfile?.status === 'warning'
                              ? '#f97316'
                              : '#22c55e'
                        }
                        strokeWidth="1.5"
                        rx="4"
                      />
                      <text
                        x="0"
                        y="4"
                        fill="#ffffff"
                        fontSize="10"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {selectedMinerProfile?.name
                          .split(' ')
                          .map((n, i, a) => (i === a.length - 1 ? n : `${n[0]}.`))
                          .join(' ') || selectedMinerName}
                      </text>
                    </g>
                  </svg>

                  {/* Miner metadata badge overlay */}
                  <div className="absolute bottom-4 left-4 bg-slate-900/90 border border-slate-700 px-2 py-1 rounded flex flex-col gap-0.5 text-[9px] shadow-lg">
                    <span className="text-gray-400">Position :</span>
                    <span className="text-white font-semibold">
                      {activeZone} • {activeGallery}
                    </span>
                    <span className="text-gray-500 font-mono">
                      Coords: {Math.round(activePosition.x)}X, {Math.round(activePosition.y)}Y
                    </span>
                  </div>
                </div>
              </div>

              {/* Itinerary Planner Panel */}
              {routeProposal && (
                <div className="bg-[#1e293b] rounded-lg border border-gray-700 p-3 space-y-3 flex-1 flex flex-col overflow-y-auto">
                  {/* Route Header */}
                  <div className="border-b border-gray-700 pb-2.5 flex items-center justify-between shrink-0">
                    <div>
                      <h4 className="text-xs font-bold text-white tracking-wider flex items-center gap-1.5 uppercase">
                        <Compass size={14} className="text-cyan-400" />
                        PROPOSITION D'ITINÉRAIRE
                      </h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Calculé depuis le Centre de Contrôle Principal
                      </p>
                    </div>
                  </div>

                  {/* Distance & Time stats cards */}
                  <div className="grid grid-cols-2 gap-2 shrink-0">
                    <div className="bg-[#0b1a2a] border border-gray-700 p-2 rounded flex items-center gap-2">
                      <div className="p-1 bg-blue-500/10 text-blue-400 rounded">
                        <Milestone size={13} />
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 block leading-tight">
                          Distance
                        </span>
                        <span className="text-xs font-semibold text-white leading-tight">
                          {routeProposal.distance}
                        </span>
                      </div>
                    </div>

                    <div className="bg-[#0b1a2a] border border-gray-700 p-2 rounded flex items-center gap-2">
                      <div className="p-1 bg-amber-500/10 text-amber-400 rounded">
                        <Clock size={13} />
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 block leading-tight">
                          Temps estimé
                        </span>
                        <span className="text-xs font-semibold text-white leading-tight">
                          ~ {routeProposal.estTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Safety Gear / PPE Checklist */}
                  <div className="bg-[#0b1a2a]/60 border border-gray-700/80 rounded p-2.5 space-y-1.5 shrink-0">
                    <div className="flex items-center gap-1.5 border-b border-gray-800 pb-1">
                      <ShieldAlert size={11} className="text-yellow-500" />
                      <span className="text-[9px] font-bold text-gray-300 uppercase tracking-wider">
                        EPI Recommandés (Intervention)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {routeProposal.safetyGear.map((gear, idx) => (
                        <span
                          key={idx}
                          className="text-[8.5px] bg-slate-800 text-yellow-400 px-1.5 py-0.5 rounded border border-slate-700 font-medium"
                        >
                          ✓ {gear}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Steps of itinerary */}
                  <div className="space-y-2 pl-1 flex-1 overflow-y-auto min-h-[140px]">
                    <span className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wider block">
                      Étapes de Progression :
                    </span>
                    <div className="space-y-2.5 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                      {routeProposal.steps.map((step, idx) => (
                        <div key={idx} className="flex gap-2.5 items-start relative">
                          <div className="w-6 h-6 shrink-0 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-xs font-bold text-cyan-400 font-mono shadow z-10">
                            {idx + 1}
                          </div>
                          <p className="text-xs text-gray-300 leading-relaxed pt-0.5 flex-1">
                            {step}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
