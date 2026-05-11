import { useState, useEffect } from 'react';
import { useStore, TraceEvent, TraceEventType } from '../store/useStore';
import apiService from '../services/api';
import { Search, Download, LogIn, LogOut, ArrowRightLeft, Coffee, Wrench, PlayCircle, StopCircle, User, AlertTriangle } from 'lucide-react';

const EVENT_CONFIG: Record<TraceEventType, { icon: any; label: string; color: string; bg: string }> = {
  entry: { icon: LogIn, label: 'Entrée zone', color: 'text-green-400', bg: 'bg-green-500/20' },
  exit: { icon: LogOut, label: 'Sortie zone', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  zone_change: { icon: ArrowRightLeft, label: 'Changement zone', color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  alert: { icon: AlertTriangle, label: 'Alerte', color: 'text-red-400', bg: 'bg-red-500/20' },
  rest: { icon: Coffee, label: 'Pause', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  equipment: { icon: Wrench, label: 'Équipement', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  shift_start: { icon: PlayCircle, label: 'Début poste', color: 'text-green-400', bg: 'bg-green-500/20' },
  shift_end: { icon: StopCircle, label: 'Fin poste', color: 'text-orange-400', bg: 'bg-orange-500/20' },
};

// Données de traçabilité simulées
const generateTraceEvents = (): TraceEvent[] => {
  const now = Date.now();
  const miners = [
    { id: 'MIN-001', name: 'Amadou Diallo' },
    { id: 'MIN-002', name: 'Ibrahim Sow' },
    { id: 'MIN-003', name: 'Mamadou Keita' },
    { id: 'MIN-004', name: 'Ousmane Traoré' },
    { id: 'MIN-005', name: 'Cheikh Diop' },
    { id: 'MIN-006', name: 'Abdoulaye Ndiaye' },
    { id: 'MIN-007', name: 'Moussa Ba' },
    { id: 'MIN-008', name: 'Samba Fall' },
  ];
  const zones = ['ZONE A', 'ZONE B', 'ZONE C', 'ZONE D', 'ZONE E', 'ZONE F'];
  const galleries = ['Galerie A1', 'Galerie B2', 'Galerie C1', 'Galerie D3', 'Galerie E2', 'Galerie F1'];
  const eventTypes: TraceEventType[] = ['entry', 'exit', 'zone_change', 'alert', 'rest', 'equipment', 'shift_start', 'shift_end'];

  const events: TraceEvent[] = [];
  for (let i = 0; i < 40; i++) {
    const miner = miners[Math.floor(Math.random() * miners.length)];
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const zoneIdx = Math.floor(Math.random() * zones.length);
    events.push({
      id: `TR-${String(i + 1).padStart(4, '0')}`,
      minerId: miner.id,
      minerName: miner.name,
      eventType,
      zone: zones[zoneIdx],
      gallery: galleries[zoneIdx],
      timestamp: now - Math.floor(Math.random() * 8 * 3600000),
      details: eventType === 'alert' ? 'Chute détectée' : eventType === 'equipment' ? 'Contrat EPI vérifié' : eventType === 'rest' ? 'Pause déjeuner' : undefined,
      duration: ['rest', 'equipment'].includes(eventType) ? Math.floor(Math.random() * 60) + 5 : undefined,
    });
  }
  return events.sort((a, b) => b.timestamp - a.timestamp);
};

export default function Traceability() {
  const { traceEvents } = useStore();
  const [events, setEvents] = useState<TraceEvent[]>(traceEvents.length > 0 ? traceEvents : generateTraceEvents());
  const [stats, setStats] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterZone, setFilterZone] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selectedMiner, setSelectedMiner] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
          const mapped = eventsRes.events.map((e: any) => ({
            ...e,
            timestamp: new Date(e.timestamp).getTime(),
          }));
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
        const mapped = res.events.map((e: any) => ({ ...e, timestamp: new Date(e.timestamp).getTime() }));
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
    if (searchQuery && !e.minerName.toLowerCase().includes(searchQuery.toLowerCase()) && !e.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterZone !== 'all' && e.zone !== filterZone) return false;
    if (filterType !== 'all' && e.eventType !== filterType) return false;
    if (selectedMiner && e.minerId !== selectedMiner) return false;
    return true;
  });

  // Stats - prefer API stats, fallback to computed
  const totalEntries = stats?.totalEntries ?? events.filter(e => e.eventType === 'entry').length;
  const totalExits = stats?.totalExits ?? events.filter(e => e.eventType === 'exit').length;
  const totalAlerts = stats?.totalAlerts ?? events.filter(e => e.eventType === 'alert').length;
  const totalZoneChanges = stats?.totalZoneChanges ?? events.filter(e => e.eventType === 'zone_change').length;
  const uniqueMiners = stats?.uniqueMiners ?? new Set(events.map(e => e.minerId)).size;

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

  return (
    <div className="p-4 space-y-4 bg-[#0f172a] min-h-screen">
      {/* Header */}
      <div className="bg-[#1e293b] rounded-lg border border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={`/LOGO.png`} alt="SupervisorApp" className="h-10 w-auto" />
            <div>
              <h1 className="text-xl font-bold text-white">Traçabilité</h1>
              <p className="text-sm text-gray-400">Suivi des mouvements et activités des mineurs</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded font-medium transition-colors">
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
      <div className="grid grid-cols-5 gap-3">
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

      <div className="grid grid-cols-3 gap-4">
        {/* Events Timeline */}
        <div className="col-span-2">
          <div className="bg-[#1e293b] rounded-lg border border-gray-700">
            {/* Filters */}
            <div className="p-4 border-b border-gray-700 flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher mineur ou ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0b1a2a] border border-gray-700 rounded pl-8 pr-3 py-1.5 text-white text-xs placeholder-gray-500 focus:border-green-500 focus:outline-none"
                />
              </div>
              <select
                value={filterZone}
                onChange={(e) => setFilterZone(e.target.value)}
                className="bg-[#0b1a2a] border border-gray-700 rounded px-2 py-1.5 text-white text-xs focus:outline-none"
              >
                <option value="all">Toutes zones</option>
                {['ZONE A', 'ZONE B', 'ZONE C', 'ZONE D', 'ZONE E', 'ZONE F'].map(z => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-[#0b1a2a] border border-gray-700 rounded px-2 py-1.5 text-white text-xs focus:outline-none"
              >
                <option value="all">Tous types</option>
                {Object.entries(EVENT_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>

            {/* Timeline */}
            <div className="p-3 space-y-1 max-h-[500px] overflow-y-auto">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-xs">Aucun événement trouvé</div>
              ) : (
                filteredEvents.map((event) => {
                  const config = EVENT_CONFIG[event.eventType];
                  const Icon = config.icon;
                  return (
                    <div
                      key={event.id}
                      className={`flex items-center gap-3 p-2 rounded border transition-colors cursor-pointer hover:border-gray-600 ${
                        selectedMiner === event.minerId ? 'bg-green-500/10 border-green-500/50' : 'bg-[#0b1a2a] border-gray-700'
                      }`}
                      onClick={() => setSelectedMiner(selectedMiner === event.minerId ? null : event.minerId)}
                    >
                      {/* Time */}
                      <div className="min-w-[50px] text-right">
                        <p className="text-[10px] text-gray-400">{formatDate(event.timestamp)}</p>
                        <p className="text-xs text-white font-medium">{formatTime(event.timestamp)}</p>
                      </div>

                      {/* Event type badge */}
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${config.bg}`}>
                        <Icon size={12} className={config.color} />
                        <span className={`text-[10px] font-medium ${config.color}`}>{config.label}</span>
                      </div>

                      {/* Miner info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white font-medium truncate">{event.minerName}</p>
                        <p className="text-[10px] text-gray-400">{event.id} • {event.minerId}</p>
                      </div>

                      {/* Zone */}
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-300">{event.zone}</p>
                        <p className="text-[10px] text-gray-500">{event.gallery}</p>
                      </div>

                      {/* Details */}
                      {event.details && (
                        <span className="text-[10px] text-gray-400 max-w-[100px] truncate">{event.details}</span>
                      )}
                      {event.duration && (
                        <span className="text-[10px] text-amber-400">{event.duration}min</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Miner Summary */}
        <div className="space-y-3">
          {/* Active Miners */}
          <div className="bg-[#1e293b] rounded-lg border border-gray-700">
            <div className="p-3 border-b border-gray-700">
              <h3 className="text-xs font-semibold text-white">MINEURS SUIVIS</h3>
            </div>
            <div className="p-2 space-y-1 max-h-[250px] overflow-y-auto">
              {Array.from(new Set(events.map(e => e.minerId))).map(minerId => {
                const minerEvents = events.filter(e => e.minerId === minerId);
                const lastEvent = minerEvents[0];
                const entryCount = minerEvents.filter(e => e.eventType === 'entry').length;
                const exitCount = minerEvents.filter(e => e.eventType === 'exit').length;
                const alertCount = minerEvents.filter(e => e.eventType === 'alert').length;
                const isSelected = selectedMiner === minerId;

                return (
                  <button
                    key={minerId}
                    onClick={() => setSelectedMiner(isSelected ? null : minerId)}
                    className={`w-full flex items-center justify-between p-2 rounded border transition-colors text-left ${
                      isSelected ? 'bg-green-500/10 border-green-500/50' : 'bg-[#0b1a2a] border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold">
                        {lastEvent.minerName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-[11px] text-white font-medium">{lastEvent.minerName}</p>
                        <p className="text-[9px] text-gray-400">{lastEvent.zone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {alertCount > 0 && (
                        <span className="bg-red-500/20 text-red-400 text-[9px] px-1.5 py-0.5 rounded">{alertCount}</span>
                      )}
                      <span className="text-[9px] text-gray-400">{entryCount}↗ {exitCount}↘</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Zone Activity */}
          <div className="bg-[#1e293b] rounded-lg border border-gray-700">
            <div className="p-3 border-b border-gray-700">
              <h3 className="text-xs font-semibold text-white">ACTIVITÉ PAR ZONE</h3>
            </div>
            <div className="p-2 space-y-1">
              {['A', 'B', 'C', 'D', 'E', 'F'].map(zone => {
                const zoneEvents = events.filter(e => e.zone === `ZONE ${zone}`);
                const entries = zoneEvents.filter(e => e.eventType === 'entry').length;
                const exits = zoneEvents.filter(e => e.eventType === 'exit').length;
                const total = zoneEvents.length;
                return (
                  <div key={zone} className="flex items-center justify-between p-1.5 bg-[#0b1a2a] rounded border border-gray-700">
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
              <h3 className="text-xs font-semibold text-white">RÉPARTITION PAR TYPE</h3>
            </div>
            <div className="p-2 space-y-1">
              {Object.entries(EVENT_CONFIG).map(([type, config]) => {
                const count = events.filter(e => e.eventType === type).length;
                const percentage = events.length > 0 ? (count / events.length) * 100 : 0;
                const Icon = config.icon;
                return (
                  <div key={type} className="flex items-center gap-2 p-1.5">
                    <Icon size={12} className={config.color} />
                    <span className="text-[10px] text-gray-300 flex-1">{config.label}</span>
                    <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${config.bg.replace('/20', '')}`} style={{ width: `${percentage}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-400 min-w-[20px] text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
