import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Terminal, Activity, MapPin, AlertTriangle, Trash2, Cpu } from 'lucide-react';

const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || `http://${host}:5000`;

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'location' | 'status' | 'alert' | 'system' | 'raw';
  data: any;
}

export default function WatchLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    socketRef.current = socket;

    const addLog = (type: LogEntry['type'], data: any) => {
      setLogs((prev) => [
        { id: Math.random().toString(36).substr(2, 9), timestamp: new Date(), type, data },
        ...prev
      ].slice(0, 100)); // Garder seulement les 100 derniers logs
    };

    socket.on('connect', () => addLog('system', { message: 'Connecté au serveur de flux backend' }));
    socket.on('disconnect', () => addLog('system', { message: 'Déconnecté du backend' }));
    
    // Événements traités par l'app (filtrés)
    socket.on('location-update', (data) => addLog('location', data));
    socket.on('miner-status-update', (data) => addLog('status', data));
    socket.on('new-alert', (data) => addLog('alert', data));
    
    // Flux brut direct depuis l'API /api/watch/*
    socket.on('watch-raw-data', (data) => addLog('raw', data));

    return () => {
      socket.disconnect();
    };
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'location': return <MapPin size={16} className="text-blue-400" />;
      case 'status': return <Activity size={16} className="text-green-400" />;
      case 'alert': return <AlertTriangle size={16} className="text-red-400" />;
      case 'raw': return <Cpu size={16} className="text-purple-400" />;
      default: return <Terminal size={16} className="text-gray-400" />;
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'location': return 'border-blue-500/30 bg-blue-500/5';
      case 'status': return 'border-green-500/30 bg-green-500/5';
      case 'alert': return 'border-red-500/50 bg-red-500/10';
      case 'raw': return 'border-purple-500/50 bg-purple-500/10';
      default: return 'border-gray-700 bg-[#1e293b]/50';
    }
  };

  return (
    <div className="p-4 h-[calc(100vh-64px)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Cpu className="text-purple-400" /> Flux de données brutes
          </h1>
          <p className="text-sm text-gray-400 mt-1">Écoute en temps réel de toutes les requêtes POST provenant de la T-Watch</p>
        </div>
        <button 
          onClick={() => setLogs([])}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors"
        >
          <Trash2 size={16} /> Effacer les logs
        </button>
      </div>

      <div className="flex-1 bg-[#0f172a] rounded-xl border border-gray-700 overflow-hidden flex flex-col">
        <div className="p-3 bg-[#1e293b] border-b border-gray-700 flex gap-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
          <div className="w-24">Heure</div>
          <div className="w-32">Type / Événement</div>
          <div className="flex-1">Payload JSON</div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-sm">
          {logs.map((log) => (
            <div key={log.id} className={`flex gap-4 p-3 rounded-lg border transition-colors ${getLogColor(log.type)}`}>
              <div className="w-24 text-gray-500 shrink-0 mt-0.5">
                {log.timestamp.toLocaleTimeString('fr-FR', { hour12: false }) + '.' + String(log.timestamp.getMilliseconds()).padStart(3, '0')}
              </div>
              <div className="w-32 flex items-start gap-2 shrink-0 capitalize mt-0.5">
                {getIcon(log.type)}
                <span className={
                  log.type === 'alert' ? 'text-red-400 font-bold' : 
                  log.type === 'raw' ? 'text-purple-400 font-bold' : 'text-gray-300'
                }>
                  {log.type === 'raw' ? 'API Watch' : log.type}
                </span>
              </div>
              <div className="flex-1 overflow-x-auto">
                <pre className="text-green-400 whitespace-pre-wrap break-all text-xs">
                  {JSON.stringify(log.data, null, 2)}
                </pre>
              </div>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="flex flex-col items-center justify-center text-gray-500 h-full gap-3 opacity-50">
              <Cpu size={48} />
              <p>En attente des trames de données de la montre...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
