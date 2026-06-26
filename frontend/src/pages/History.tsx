import { useState } from 'react';
import { History, Search, Clock, MapPin, AlertTriangle, User, ChevronDown } from 'lucide-react';
import { useEffect } from 'react';
import apiService from '../services/api';

interface HistoryEvent {
  id: string;
  type: 'zone_change' | 'alert' | 'status_change' | 'entry' | 'exit';
  minerName: string;
  minerId: string;
  description: string;
  timestamp: number;
  zone?: string;
}

export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const [events, setEvents] = useState<HistoryEvent[]>([]);

  useEffect(() => {
    apiService.getTraceEvents({ limit: 100 }).then((res) => {
      if (res.events) {
        setEvents(res.events.map((e: any) => ({
          id: e.id,
          type: e.eventType,
          minerName: e.minerName,
          minerId: e.minerId,
          description: e.details || `Événement: ${e.eventType}`,
          timestamp: new Date(e.timestamp || e.createdAt).getTime(),
          zone: e.zone,
        })));
      }
    }).catch(console.error);
  }, []);
  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      e.minerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || e.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'zone_change':
        return <MapPin size={16} className="text-blue-400" />;
      case 'alert':
        return <AlertTriangle size={16} className="text-red-400" />;
      case 'status_change':
        return <User size={16} className="text-orange-400" />;
      case 'entry':
        return <History size={16} className="text-green-400" />;
      case 'exit':
        return <Clock size={16} className="text-gray-400" />;
      default:
        return <History size={16} className="text-gray-400" />;
    }
  };

  const getTypeBg = (type: string) => {
    switch (type) {
      case 'zone_change':
        return 'bg-blue-500/20 border-blue-500/30';
      case 'alert':
        return 'bg-red-500/20 border-red-500/30';
      case 'status_change':
        return 'bg-orange-500/20 border-orange-500/30';
      case 'entry':
        return 'bg-green-500/20 border-green-500/30';
      case 'exit':
        return 'bg-gray-500/20 border-gray-500/30';
      default:
        return 'bg-gray-500/20 border-gray-500/30';
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <img src={`/Logo-with-text.png`} alt="SupervisorApp" className="h-10 w-auto" />
        <div>
          <h1 className="text-xl font-bold text-white">Historique</h1>
          <p className="text-sm text-gray-400">Journal des événements et activités</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher dans l'historique..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#1e293b] border border-gray-700 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 bg-[#1e293b] border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-green-500"
        >
          <option value="all">Tous types</option>
          <option value="zone_change">Changement de zone</option>
          <option value="alert">Alertes</option>
          <option value="entry">Entrées</option>
          <option value="exit">Sorties</option>
          <option value="status_change">Changement de statut</option>
        </select>
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        {filteredEvents.map((event) => {
          const isExpanded = expandedEvent === event.id;
          return (
            <div
              key={event.id}
              className={`border rounded-lg p-3 ${getTypeBg(event.type)} transition-all cursor-pointer`}
              onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
            >
              <div className="flex items-center gap-3">
                {getTypeIcon(event.type)}
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{event.description}</p>
                  <p className="text-gray-400 text-xs">{event.minerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-300 text-xs">{formatTime(event.timestamp)}</p>
                  <p className="text-gray-500 text-[10px]">{formatDate(event.timestamp)}</p>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
              </div>
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-700/50 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <User size={12} />
                    <span>ID: {event.minerId}</span>
                  </div>
                  {event.zone && (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <MapPin size={12} />
                      <span>Zone: {event.zone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock size={12} />
                    <span>Timestamp: {new Date(event.timestamp).toLocaleString('fr-FR')}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="bg-[#1e293b] rounded border border-gray-700 p-4">
        <h3 className="text-sm font-medium text-white mb-3">Résumé de la journée</h3>
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center">
            <p className="text-lg font-bold text-green-400">
              {events.filter((e) => e.type === 'entry').length}
            </p>
            <p className="text-xs text-gray-400">Entrées</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-blue-400">
              {events.filter((e) => e.type === 'zone_change').length}
            </p>
            <p className="text-xs text-gray-400">Déplacements</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-red-400">
              {events.filter((e) => e.type === 'alert').length}
            </p>
            <p className="text-xs text-gray-400">Alertes</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-400">
              {events.filter((e) => e.type === 'exit').length}
            </p>
            <p className="text-xs text-gray-400">Sorties</p>
          </div>
        </div>
      </div>
    </div>
  );
}
