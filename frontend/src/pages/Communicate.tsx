import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import apiService from '../services/api';
import { io } from 'socket.io-client';
import {
  Send,
  Mic,
  MicOff,
  Type,
  Users,
  MapPin,
  User,
  CheckCircle,
  Volume2,
  MessageSquare,
  X,
  Search,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
} from 'lucide-react';

type RecipientMode = 'all' | 'zone' | 'miner';
type MessageType = 'text' | 'voice';

interface SentMessage {
  id: string;
  content: string;
  type: MessageType;
  recipientMode: RecipientMode;
  targets: string[];
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
}

export default function Communicate() {
  const { miners } = useStore();
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('all');
  const [messageType, setMessageType] = useState<MessageType>('text');
  const [textContent, setTextContent] = useState('');
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [selectedMiners, setSelectedMiners] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [voiceProgress, setVoiceProgress] = useState(0);
  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Charger l'historique des messages au montage de la page
  useEffect(() => {
    apiService.getMessages(50).then((res) => {
      if (res.messages) {
        setSentMessages(res.messages.map((m: any) => ({
          id: m.id,
          content: m.content,
          type: m.type,
          recipientMode: m.recipient_mode || m.recipientMode,
          targets: m.targets || [],
          timestamp: new Date(m.created_at || m.createdAt).getTime(),
          status: m.status
        })));
      }
    }).catch(console.error);
  }, []);

  // Écouter les mises à jour WebSocket pour le statut des messages (distribué/lu)
  useEffect(() => {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || `http://${host}:5000`;
    
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    socket.on('message-update', (data: any) => {
      setSentMessages((prev) =>
        prev.map((m) => (m.id === data.id ? { ...m, status: data.status } : m))
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const zones = [...new Set(miners.map((m) => m.currentZone))].sort();

  const filteredMiners = miners.filter((m) => {
    if (
      searchQuery &&
      !m.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !m.matricule.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    if (recipientMode === 'zone' && selectedZone && m.currentZone !== selectedZone) return false;
    return true;
  });

  const toggleMiner = (id: string) => {
    setSelectedMiners((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAllVisible = () => {
    const visibleIds = filteredMiners.map((m) => m.id);
    const allSelected = visibleIds.every((id) => selectedMiners.includes(id));
    if (allSelected) {
      setSelectedMiners((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedMiners((prev) => [...new Set([...prev, ...visibleIds])]);
    }
  };

  // Recording
  useEffect(() => {
    if (isRecording) {
      recordingTimer.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } else {
      if (recordingTimer.current) clearInterval(recordingTimer.current);
    }
    return () => {
      if (recordingTimer.current) clearInterval(recordingTimer.current);
    };
  }, [isRecording]);

  // Lecteur Voice Playback
  useEffect(() => {
    let interval: any;
    if (isPlayingVoice && recordingDuration > 0) {
      interval = setInterval(() => {
        setVoiceProgress((prev) => {
          if (prev >= 100) {
            setIsPlayingVoice(false);
            return 0;
          }
          return prev + 10;
        });
      }, (recordingDuration * 1000) / 10);
    } else {
      setVoiceProgress(0);
    }
    return () => clearInterval(interval);
  }, [isPlayingVoice, recordingDuration]);

  const formatDuration = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const getRecipientLabel = () => {
    switch (recipientMode) {
      case 'all':
        return `Tous les mineurs (${miners.length})`;
      case 'zone':
        return selectedZone
          ? `${selectedZone} (${miners.filter((m) => m.currentZone === selectedZone).length} mineurs)`
          : 'Sélectionner une zone';
      case 'miner':
        return selectedMiners.length > 0
          ? `${selectedMiners.length} mineur(s) sélectionné(s)`
          : 'Sélectionner des mineurs';
    }
  };

  const canSend = () => {
    if (messageType === 'text' && !textContent.trim()) return false;
    if (recipientMode === 'zone' && !selectedZone) return false;
    if (recipientMode === 'miner' && selectedMiners.length === 0) return false;
    if (messageType === 'voice' && !isRecording && recordingDuration === 0) return false;
    return true;
  };

  const handleSend = async () => {
    if (!canSend()) return;
    setSending(true);

    const targets =
      recipientMode === 'all'
        ? miners.map((m) => m.id)
        : recipientMode === 'zone'
          ? miners.filter((m) => m.currentZone === selectedZone).map((m) => m.id)
          : selectedMiners;

    const content =
      messageType === 'text' ? textContent : `Note vocale (${formatDuration(recordingDuration)})`;

    try {
      const result = await apiService.sendMessage(content, messageType, recipientMode, targets);
      const msg: SentMessage = {
        id: result.message.id,
        content,
        type: messageType,
        recipientMode,
        targets,
        timestamp: Date.now(),
        status: 'sent',
      };
      setSentMessages((prev) => [msg, ...prev]);
      setTextContent('');
      setIsRecording(false);
      setRecordingDuration(0);

      // Poll for status updates from backend
      const msgId = result.message.id;
      setTimeout(async () => {
        try {
          const statusRes = await apiService.getMessageStatus(msgId);
          setSentMessages((prev) =>
            prev.map((m) => (m.id === msgId ? { ...m, status: statusRes.message.status } : m)),
          );
        } catch {}
      }, 2000);
      setTimeout(async () => {
        try {
          const statusRes = await apiService.getMessageStatus(msgId);
          setSentMessages((prev) =>
            prev.map((m) => (m.id === msgId ? { ...m, status: statusRes.message.status } : m)),
          );
        } catch {}
      }, 5000);
    } catch (err) {
      console.error('Erreur envoi message:', err);
    } finally {
      setSending(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'text-blue-400';
      case 'delivered':
        return 'text-amber-400';
      case 'read':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'sent':
        return 'Envoyé';
      case 'delivered':
        return 'Délivré';
      case 'read':
        return 'Lu';
      default:
        return status;
    }
  };

  return (
    <div className="p-4 space-y-4 bg-[#09111e] min-h-screen text-slate-100 transition-all duration-300">
      {/* Header */}
      <div className="bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800 px-6 py-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src={`/Logo-with-text.png`} alt="SupervisorApp" className="h-10 w-auto filter drop-shadow-md" />
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">Communiquer</h1>
              <p className="text-xs text-slate-400">Envoyer des messages aux mineurs via T-Watch</p>
            </div>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg shadow-lg hover:shadow-slate-900/20 transition-all duration-300 active:scale-95"
          >
            <MessageSquare size={14} className="text-blue-400" />
            Historique ({sentMessages.length})
            {showHistory ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
          </button>
        </div>
      </div>

      {/* Message History (collapsible) */}
      {showHistory && (
        <div className="bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800 p-4 shadow-2xl max-h-[220px] overflow-y-auto custom-scrollbar animate-fade-in">
          {sentMessages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sentMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="flex items-center justify-between p-3 bg-slate-950/60 rounded-lg border border-slate-800 hover:border-slate-700 transition-all duration-200"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={`p-2 rounded-lg ${msg.type === 'voice' ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-blue-500/10 border border-blue-500/20'}`}
                    >
                      {msg.type === 'voice' ? (
                        <Volume2 size={14} className="text-amber-400" />
                      ) : (
                        <Type size={14} className="text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-medium truncate">{msg.content}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {msg.recipientMode === 'all'
                          ? 'Tous'
                          : msg.recipientMode === 'zone'
                            ? msg.targets[0]
                            : `${msg.targets.length} mineurs`}
                        {' • '}
                        {new Date(msg.timestamp).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 ${getStatusColor(msg.status)}`}>
                    {getStatusLabel(msg.status)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-slate-500">
              <MessageSquare size={24} className="mb-1 opacity-40" />
              <p className="text-xs">Aucun message envoyé pour le moment.</p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Recipient Selection */}
        <div className="space-y-3">
          {/* Recipient Mode */}
          <div className="bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800 p-4 shadow-xl hover:border-slate-800/80 transition-all duration-300">
            <h3 className="text-xs font-bold text-slate-400 tracking-wider mb-3">DESTINATAIRES</h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setRecipientMode('all');
                  setSelectedMiners([]);
                  setSelectedZone('');
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
                  recipientMode === 'all'
                    ? 'bg-green-500/10 border-green-500/50 shadow-lg shadow-green-500/5'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700/80 hover:bg-slate-900/30'
                }`}
              >
                <div className={`p-2 rounded-lg ${recipientMode === 'all' ? 'bg-green-500/20' : 'bg-slate-900'}`}>
                  <Users
                    size={16}
                    className={recipientMode === 'all' ? 'text-green-400' : 'text-slate-400'}
                  />
                </div>
                <div className="text-left">
                  <p className="text-xs text-white font-semibold">Tous les mineurs</p>
                  <p className="text-[10px] text-slate-400">Diffusion générale sur tout le site</p>
                </div>
                {recipientMode === 'all' && (
                  <CheckCircle size={16} className="text-green-400 ml-auto animate-fade-in" />
                )}
              </button>

              <button
                onClick={() => {
                  setRecipientMode('zone');
                  setSelectedMiners([]);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
                  recipientMode === 'zone'
                    ? 'bg-green-500/10 border-green-500/50 shadow-lg shadow-green-500/5'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700/80 hover:bg-slate-900/30'
                }`}
              >
                <div className={`p-2 rounded-lg ${recipientMode === 'zone' ? 'bg-green-500/20' : 'bg-slate-900'}`}>
                  <MapPin
                    size={16}
                    className={recipientMode === 'zone' ? 'text-green-400' : 'text-slate-400'}
                  />
                </div>
                <div className="text-left">
                  <p className="text-xs text-white font-semibold">Par zone</p>
                  <p className="text-[10px] text-slate-400">Cibler une zone spécifique</p>
                </div>
                {recipientMode === 'zone' && (
                  <CheckCircle size={16} className="text-green-400 ml-auto animate-fade-in" />
                )}
              </button>

              <button
                onClick={() => {
                  setRecipientMode('miner');
                  setSelectedZone('');
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
                  recipientMode === 'miner'
                    ? 'bg-green-500/10 border-green-500/50 shadow-lg shadow-green-500/5'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700/80 hover:bg-slate-900/30'
                }`}
              >
                <div className={`p-2 rounded-lg ${recipientMode === 'miner' ? 'bg-green-500/20' : 'bg-slate-900'}`}>
                  <User
                    size={16}
                    className={recipientMode === 'miner' ? 'text-green-400' : 'text-slate-400'}
                  />
                </div>
                <div className="text-left">
                  <p className="text-xs text-white font-semibold">Par mineur</p>
                  <p className="text-[10px] text-slate-400">Sélectionner des individus</p>
                </div>
                {recipientMode === 'miner' && (
                  <CheckCircle size={16} className="text-green-400 ml-auto animate-fade-in" />
                )}
              </button>
            </div>
          </div>

          {/* Zone selector */}
          {recipientMode === 'zone' && (
            <div className="bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800 p-4 shadow-xl animate-slide-down">
              <h3 className="text-xs font-bold text-slate-400 tracking-wider mb-3">ZONES</h3>
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {zones.map((zone) => {
                  const count = miners.filter((m) => m.currentZone === zone).length;
                  return (
                    <button
                      key={zone}
                      onClick={() => setSelectedZone(selectedZone === zone ? '' : zone)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all duration-200 ${
                        selectedZone === zone
                          ? 'bg-green-500/10 border-green-500/40 text-white'
                          : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin
                          size={13}
                          className={selectedZone === zone ? 'text-green-400' : 'text-slate-500'}
                        />
                        <span className="text-xs font-medium">{zone}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400">{count} mineurs</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Miner selector */}
          {recipientMode === 'miner' && (
            <div className="bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800 p-4 shadow-xl animate-slide-down">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-400 tracking-wider">MINEURS</h3>
                <button
                  onClick={selectAllVisible}
                  className="text-[10px] font-bold text-green-400 hover:text-green-300 transition-colors"
                >
                  {filteredMiners.every((m) => selectedMiners.includes(m.id))
                    ? 'Désélectionner tout'
                    : 'Sélectionner tout'}
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="text"
                  placeholder="Rechercher un mineur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-white text-xs placeholder-slate-500 focus:border-green-500/50 focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                {filteredMiners.map((miner) => {
                  const isSelected = selectedMiners.includes(miner.id);
                  const statusColor =
                    miner.status === 'safe'
                      ? 'bg-green-500'
                      : miner.status === 'warning'
                        ? 'bg-orange-500'
                        : 'bg-red-500';
                  return (
                    <button
                      key={miner.id}
                      onClick={() => toggleMiner(miner.id)}
                      className={`w-full flex items-center gap-2.5 p-2 rounded-lg border transition-all duration-200 ${
                        isSelected
                          ? 'bg-green-500/10 border-green-500/40 text-white'
                          : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full ${statusColor} flex items-center justify-center text-white text-[9px] font-bold shrink-0 relative`}
                      >
                        {miner.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                        <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-slate-950 border border-slate-900" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-semibold text-white truncate">{miner.name}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">
                          {miner.currentZone} • {miner.matricule}
                        </p>
                      </div>
                      {isSelected && <CheckCircle size={14} className="text-green-400 shrink-0 animate-fade-in" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Message Compose */}
        <div className="col-span-1 lg:col-span-2 space-y-3">
          {/* Recipient Summary */}
          <div className="bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800 p-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <Send size={16} className="text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-white font-bold">{getRecipientLabel()}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Envoi crypté par protocole T-Watch S3+</p>
                </div>
              </div>
              {recipientMode === 'miner' && selectedMiners.length > 0 && (
                <button
                  onClick={() => setSelectedMiners([])}
                  className="text-[10px] font-semibold text-red-400 hover:text-red-300 flex items-center gap-1 self-start sm:self-auto bg-red-500/10 border border-red-500/20 px-2 py-1 rounded transition-colors"
                >
                  <X size={12} /> Effacer la sélection
                </button>
              )}
            </div>

            {/* Selected miners chips */}
            {recipientMode === 'miner' && selectedMiners.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 max-h-[100px] overflow-y-auto pr-1 custom-scrollbar">
                {selectedMiners.map((id) => {
                  const miner = miners.find((m) => m.id === id);
                  if (!miner) return null;
                  return (
                    <span
                      key={id}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-[10px] font-medium"
                    >
                      {miner.name}
                      <button onClick={() => toggleMiner(id)} className="text-green-500 hover:text-green-300 transition-colors">
                        <X size={10} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Message Type Toggle */}
          <div className="bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800 p-4 shadow-xl">
            <h3 className="text-xs font-bold text-slate-400 tracking-wider mb-3">MODE DE TRANSMISSION</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMessageType('text')}
                className={`flex-1 flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
                  messageType === 'text'
                    ? 'bg-blue-500/10 border-blue-500/50 shadow-lg shadow-blue-500/5'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700/80 hover:bg-slate-900/30'
                }`}
              >
                <div className={`p-2 rounded-lg ${messageType === 'text' ? 'bg-blue-500/20' : 'bg-slate-900'}`}>
                  <Type
                    size={16}
                    className={messageType === 'text' ? 'text-blue-400' : 'text-slate-400'}
                  />
                </div>
                <div className="text-left">
                  <p className="text-xs text-white font-semibold">Texte</p>
                  <p className="text-[10px] text-slate-400">Message écrit sur écran</p>
                </div>
              </button>
              <button
                onClick={() => setMessageType('voice')}
                className={`flex-1 flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
                  messageType === 'voice'
                    ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/5'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700/80 hover:bg-slate-900/30'
                }`}
              >
                <div className={`p-2 rounded-lg ${messageType === 'voice' ? 'bg-amber-500/20' : 'bg-slate-900'}`}>
                  <Mic
                    size={16}
                    className={messageType === 'voice' ? 'text-amber-400' : 'text-slate-400'}
                  />
                </div>
                <div className="text-left">
                  <p className="text-xs text-white font-semibold">Note vocale</p>
                  <p className="text-[10px] text-slate-400">Enregistrement audio TTS</p>
                </div>
              </button>
            </div>
          </div>

          {/* Message Input */}
          <div className="bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800 p-4 shadow-xl">
            <h3 className="text-xs font-bold text-slate-400 tracking-wider mb-3">CONTENU</h3>

            {messageType === 'text' ? (
              <div className="space-y-3">
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Saisissez votre message écrit ici..."
                  rows={5}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 text-white text-sm placeholder-slate-500 focus:border-green-500/50 focus:outline-none resize-none transition-colors"
                />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <span className="text-[10px] font-medium text-slate-500">{textContent.length} caractères</span>
                  <div className="flex flex-wrap items-center gap-1.5 justify-end">
                    {/* Quick messages */}
                    {[
                      'Évacuation immédiate',
                      'Rassemblement zone A',
                      'Fin de poste',
                      'Alerte gaz',
                    ].map((qm) => (
                      <button
                        key={qm}
                        onClick={() => setTextContent(qm)}
                        className="px-2.5 py-1 bg-slate-800/80 text-slate-300 text-[10px] font-semibold border border-slate-700 rounded-md hover:bg-slate-700 hover:text-white transition-all duration-200 active:scale-95"
                      >
                        {qm}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Recording UI */}
                <div className="flex flex-col items-center justify-center py-6 bg-slate-950/80 rounded-xl border border-slate-800 shadow-inner">
                  {isRecording ? (
                    <>
                      <div className="relative flex items-center justify-center my-2">
                        {/* Wave animation circles */}
                        <div className="absolute w-24 h-24 bg-red-500/10 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                        <div className="absolute w-16 h-16 bg-red-500/20 rounded-full animate-ping" style={{ animationDuration: '1.5s' }} />
                        <div className="w-14 h-14 bg-red-500/30 border border-red-500/40 rounded-full flex items-center justify-center shadow-lg shadow-red-500/25">
                          <Mic size={24} className="text-red-400" />
                        </div>
                      </div>
                      
                      {/* Audio visualizer wave simulation */}
                      <div className="flex items-center gap-1 h-8 my-3">
                        <div className="w-1 bg-red-500 rounded-full animate-bounce h-[30%]" style={{ animationDelay: '0.1s', animationDuration: '0.6s' }} />
                        <div className="w-1 bg-red-500 rounded-full animate-bounce h-[60%]" style={{ animationDelay: '0.2s', animationDuration: '0.7s' }} />
                        <div className="w-1 bg-red-500 rounded-full animate-bounce h-[40%]" style={{ animationDelay: '0.3s', animationDuration: '0.5s' }} />
                        <div className="w-1 bg-red-500 rounded-full animate-bounce h-[90%]" style={{ animationDelay: '0.4s', animationDuration: '0.8s' }} />
                        <div className="w-1 bg-red-500 rounded-full animate-bounce h-[50%]" style={{ animationDelay: '0.5s', animationDuration: '0.6s' }} />
                        <div className="w-1 bg-red-500 rounded-full animate-bounce h-[75%]" style={{ animationDelay: '0.6s', animationDuration: '0.7s' }} />
                        <div className="w-1 bg-red-500 rounded-full animate-bounce h-[35%]" style={{ animationDelay: '0.7s', animationDuration: '0.5s' }} />
                      </div>

                      <p className="text-xl text-white font-mono font-bold tracking-wider mt-1 drop-shadow-md">
                        {formatDuration(recordingDuration)}
                      </p>
                      <p className="text-[10px] text-red-400 font-semibold uppercase tracking-widest mt-1">Enregistrement en cours</p>
                      <button
                        onClick={() => setIsRecording(false)}
                        className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-all duration-300 shadow-lg shadow-red-500/20 active:scale-95 border border-red-400"
                      >
                        <MicOff size={14} />
                        Arrêter
                      </button>
                    </>
                  ) : (
                    <>
                      {recordingDuration > 0 ? (
                        <div className="w-full px-6 flex flex-col items-center">
                          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-4 mb-4 shadow-md">
                            <button
                              onClick={() => setIsPlayingVoice(!isPlayingVoice)}
                              className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center hover:bg-amber-500/30 transition-colors text-amber-400 shrink-0"
                            >
                              {isPlayingVoice ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                            </button>
                            
                            {/* Visual soundwave simulator */}
                            <div className="flex-1 h-8 flex items-center gap-0.5 relative overflow-hidden">
                              {/* Background silent wave */}
                              <div className="absolute inset-0 flex items-center gap-0.5 opacity-20">
                                {[30, 60, 40, 80, 50, 70, 30, 60, 50, 80, 40, 70, 30, 60, 40, 90, 50].map((h, i) => (
                                  <div key={i} className="flex-1 bg-amber-400 rounded-full" style={{ height: `${h}%` }} />
                                ))}
                              </div>
                              {/* Played wave overlay */}
                              <div className="absolute inset-0 flex items-center gap-0.5 transition-all duration-300" style={{ clipPath: `inset(0 ${100 - voiceProgress}% 0 0)` }}>
                                {[30, 60, 40, 80, 50, 70, 30, 60, 50, 80, 40, 70, 30, 60, 40, 90, 50].map((h, i) => (
                                  <div key={i} className="flex-1 bg-amber-400 rounded-full" style={{ height: `${h}%` }} />
                                ))}
                              </div>
                            </div>
                            
                            <span className="text-xs font-mono text-amber-400 font-semibold shrink-0">
                              {formatDuration(recordingDuration)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mb-4">Note vocale prête à être envoyée</p>
                        </div>
                      ) : (
                        <div className="w-14 h-14 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-slate-400">
                          <Mic size={24} className="opacity-60" />
                        </div>
                      )}
                      
                      {recordingDuration === 0 && (
                        <p className="text-xs text-slate-400 mt-3">
                          Appuyez ci-dessous pour lancer l'enregistrement audio
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-4">
                        <button
                          onClick={() => {
                            setIsPlayingVoice(false);
                            setIsRecording(true);
                          }}
                          className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-all duration-300 shadow-lg shadow-amber-500/25 active:scale-95 border border-amber-400"
                        >
                          <Mic size={14} />
                          {recordingDuration > 0 ? 'Réenregistrer' : 'Enregistrer'}
                        </button>
                        {recordingDuration > 0 && (
                          <button
                            onClick={() => {
                              setIsPlayingVoice(false);
                              setRecordingDuration(0);
                            }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-all duration-300 border border-slate-700 active:scale-95"
                          >
                            <X size={14} />
                            Supprimer
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!canSend() || sending}
            className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl text-white text-sm font-bold transition-all duration-300 active:scale-[0.98] ${
              canSend() && !sending
                ? 'bg-green-500 hover:bg-green-600 shadow-xl shadow-green-500/20 border border-green-400/30'
                : 'bg-slate-800 text-slate-500 border border-slate-900 cursor-not-allowed'
            }`}
          >
            {sending ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Transmission sécurisée en cours...
              </>
            ) : (
              <>
                <Send size={16} />
                Envoyer le message{' '}
                {recipientMode === 'all'
                  ? 'à tous'
                  : recipientMode === 'zone'
                    ? `à ${selectedZone || 'la zone'}`
                    : `à ${selectedMiners.length} mineur(s)`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
