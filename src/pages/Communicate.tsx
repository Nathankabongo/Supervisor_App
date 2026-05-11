import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import apiService from '../services/api';
import {
  Send, Mic, MicOff, Type, Users, MapPin, User,
  CheckCircle, Volume2, MessageSquare, X, Search, ChevronDown, ChevronUp
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
  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const zones = [...new Set(miners.map(m => m.currentZone))].sort();

  const filteredMiners = miners.filter(m => {
    if (searchQuery && !m.name.toLowerCase().includes(searchQuery.toLowerCase()) && !m.matricule.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (recipientMode === 'zone' && selectedZone && m.currentZone !== selectedZone) return false;
    return true;
  });

  const toggleMiner = (id: string) => {
    setSelectedMiners(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllVisible = () => {
    const visibleIds = filteredMiners.map(m => m.id);
    const allSelected = visibleIds.every(id => selectedMiners.includes(id));
    if (allSelected) {
      setSelectedMiners(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedMiners(prev => [...new Set([...prev, ...visibleIds])]);
    }
  };

  // Recording
  useEffect(() => {
    if (isRecording) {
      recordingTimer.current = setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);
    } else {
      if (recordingTimer.current) clearInterval(recordingTimer.current);
      setRecordingDuration(0);
    }
    return () => { if (recordingTimer.current) clearInterval(recordingTimer.current); };
  }, [isRecording]);

  const formatDuration = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const getRecipientLabel = () => {
    switch (recipientMode) {
      case 'all': return `Tous les mineurs (${miners.length})`;
      case 'zone': return selectedZone ? `${selectedZone} (${miners.filter(m => m.currentZone === selectedZone).length} mineurs)` : 'Sélectionner une zone';
      case 'miner': return selectedMiners.length > 0 ? `${selectedMiners.length} mineur(s) sélectionné(s)` : 'Sélectionner des mineurs';
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

    const targets = recipientMode === 'all'
      ? miners.map(m => m.id)
      : recipientMode === 'zone'
        ? miners.filter(m => m.currentZone === selectedZone).map(m => m.id)
        : selectedMiners;

    const content = messageType === 'text' ? textContent : `Note vocale (${formatDuration(recordingDuration)})`;

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
      setSentMessages(prev => [msg, ...prev]);
      setTextContent('');
      setIsRecording(false);
      setRecordingDuration(0);

      // Poll for status updates from backend
      const msgId = result.message.id;
      setTimeout(async () => {
        try {
          const statusRes = await apiService.getMessageStatus(msgId);
          setSentMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: statusRes.message.status } : m));
        } catch {}
      }, 2000);
      setTimeout(async () => {
        try {
          const statusRes = await apiService.getMessageStatus(msgId);
          setSentMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: statusRes.message.status } : m));
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
      case 'sent': return 'text-blue-400';
      case 'delivered': return 'text-amber-400';
      case 'read': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'sent': return 'Envoyé';
      case 'delivered': return 'Délivré';
      case 'read': return 'Lu';
      default: return status;
    }
  };

  return (
    <div className="p-4 space-y-4 bg-[#0f172a] min-h-screen">
      {/* Header */}
      <div className="bg-[#1e293b] rounded-lg border border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={`/LOGO.png`} alt="SupervisorApp" className="h-10 w-auto" />
            <div>
              <h1 className="text-xl font-bold text-white">Communiquer</h1>
              <p className="text-sm text-gray-400">Envoyer des messages aux mineurs via T-Watch</p>
            </div>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#334155] hover:bg-[#475569] text-gray-300 text-xs rounded transition-colors"
          >
            <MessageSquare size={14} />
            Historique ({sentMessages.length})
            {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Message History (collapsible) */}
      {showHistory && sentMessages.length > 0 && (
        <div className="bg-[#1e293b] rounded-lg border border-gray-700 p-3 max-h-[200px] overflow-y-auto">
          <div className="space-y-2">
            {sentMessages.map(msg => (
              <div key={msg.id} className="flex items-center justify-between p-2 bg-[#0b1a2a] rounded border border-gray-700">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`p-1.5 rounded ${msg.type === 'voice' ? 'bg-amber-500/20' : 'bg-blue-500/20'}`}>
                    {msg.type === 'voice' ? <Volume2 size={12} className="text-amber-400" /> : <Type size={12} className="text-blue-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">{msg.content}</p>
                    <p className="text-[10px] text-gray-400">
                      {msg.recipientMode === 'all' ? 'Tous' : msg.recipientMode === 'zone' ? msg.targets[0] : `${msg.targets.length} mineurs`}
                      {' • '}
                      {new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-medium ${getStatusColor(msg.status)}`}>{getStatusLabel(msg.status)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {/* Left: Recipient Selection */}
        <div className="space-y-3">
          {/* Recipient Mode */}
          <div className="bg-[#1e293b] rounded-lg border border-gray-700 p-4">
            <h3 className="text-xs font-semibold text-white mb-3">DESTINATAIRES</h3>
            <div className="space-y-2">
              <button
                onClick={() => { setRecipientMode('all'); setSelectedMiners([]); setSelectedZone(''); }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  recipientMode === 'all' ? 'bg-green-500/20 border-green-500' : 'bg-[#0b1a2a] border-gray-700 hover:border-gray-600'
                }`}
              >
                <Users size={18} className={recipientMode === 'all' ? 'text-green-400' : 'text-gray-400'} />
                <div className="text-left">
                  <p className="text-sm text-white font-medium">Tous les mineurs</p>
                  <p className="text-[10px] text-gray-400">Diffusion générale</p>
                </div>
                {recipientMode === 'all' && <CheckCircle size={16} className="text-green-400 ml-auto" />}
              </button>

              <button
                onClick={() => { setRecipientMode('zone'); setSelectedMiners([]); }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  recipientMode === 'zone' ? 'bg-green-500/20 border-green-500' : 'bg-[#0b1a2a] border-gray-700 hover:border-gray-600'
                }`}
              >
                <MapPin size={18} className={recipientMode === 'zone' ? 'text-green-400' : 'text-gray-400'} />
                <div className="text-left">
                  <p className="text-sm text-white font-medium">Par zone</p>
                  <p className="text-[10px] text-gray-400">Sélectionner une zone</p>
                </div>
                {recipientMode === 'zone' && <CheckCircle size={16} className="text-green-400 ml-auto" />}
              </button>

              <button
                onClick={() => { setRecipientMode('miner'); setSelectedZone(''); }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  recipientMode === 'miner' ? 'bg-green-500/20 border-green-500' : 'bg-[#0b1a2a] border-gray-700 hover:border-gray-600'
                }`}
              >
                <User size={18} className={recipientMode === 'miner' ? 'text-green-400' : 'text-gray-400'} />
                <div className="text-left">
                  <p className="text-sm text-white font-medium">Par mineur</p>
                  <p className="text-[10px] text-gray-400">Sélection individuelle</p>
                </div>
                {recipientMode === 'miner' && <CheckCircle size={16} className="text-green-400 ml-auto" />}
              </button>
            </div>
          </div>

          {/* Zone selector */}
          {recipientMode === 'zone' && (
            <div className="bg-[#1e293b] rounded-lg border border-gray-700 p-4">
              <h3 className="text-xs font-semibold text-white mb-3">ZONES</h3>
              <div className="space-y-1">
                {zones.map(zone => {
                  const count = miners.filter(m => m.currentZone === zone).length;
                  return (
                    <button
                      key={zone}
                      onClick={() => setSelectedZone(selectedZone === zone ? '' : zone)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                        selectedZone === zone ? 'bg-green-500/20 border-green-500' : 'bg-[#0b1a2a] border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className={selectedZone === zone ? 'text-green-400' : 'text-gray-400'} />
                        <span className="text-xs text-white">{zone}</span>
                      </div>
                      <span className="text-[10px] text-gray-400">{count} mineurs</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Miner selector */}
          {recipientMode === 'miner' && (
            <div className="bg-[#1e293b] rounded-lg border border-gray-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-white">MINEURS</h3>
                <button onClick={selectAllVisible} className="text-[10px] text-green-400 hover:text-green-300">
                  {filteredMiners.every(m => selectedMiners.includes(m.id)) ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-2">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0b1a2a] border border-gray-700 rounded pl-8 pr-3 py-1.5 text-white text-xs placeholder-gray-500 focus:border-green-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1 max-h-[250px] overflow-y-auto">
                {filteredMiners.map(miner => {
                  const isSelected = selectedMiners.includes(miner.id);
                  const statusColor = miner.status === 'safe' ? 'bg-green-500' : miner.status === 'warning' ? 'bg-orange-500' : 'bg-red-500';
                  return (
                    <button
                      key={miner.id}
                      onClick={() => toggleMiner(miner.id)}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                        isSelected ? 'bg-green-500/20 border-green-500/50' : 'bg-[#0b1a2a] border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full ${statusColor} flex items-center justify-center text-white text-[9px] font-bold shrink-0`}>
                        {miner.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-[11px] text-white font-medium truncate">{miner.name}</p>
                        <p className="text-[9px] text-gray-400">{miner.currentZone} • {miner.matricule}</p>
                      </div>
                      {isSelected && <CheckCircle size={14} className="text-green-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Message Compose */}
        <div className="col-span-2 space-y-3">
          {/* Recipient Summary */}
          <div className="bg-[#1e293b] rounded-lg border border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Send size={18} className="text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-white font-medium">{getRecipientLabel()}</p>
                  <p className="text-[10px] text-gray-400">Via T-Watch S3+</p>
                </div>
              </div>
              {recipientMode === 'miner' && selectedMiners.length > 0 && (
                <button
                  onClick={() => setSelectedMiners([])}
                  className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1"
                >
                  <X size={12} /> Effacer sélection
                </button>
              )}
            </div>

            {/* Selected miners chips */}
            {recipientMode === 'miner' && selectedMiners.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {selectedMiners.map(id => {
                  const miner = miners.find(m => m.id === id);
                  if (!miner) return null;
                  return (
                    <span key={id} className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded text-[10px]">
                      {miner.name}
                      <button onClick={() => toggleMiner(id)}><X size={10} /></button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Message Type Toggle */}
          <div className="bg-[#1e293b] rounded-lg border border-gray-700 p-4">
            <h3 className="text-xs font-semibold text-white mb-3">TYPE DE MESSAGE</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMessageType('text')}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                  messageType === 'text' ? 'bg-blue-500/20 border-blue-500' : 'bg-[#0b1a2a] border-gray-700 hover:border-gray-600'
                }`}
              >
                <Type size={18} className={messageType === 'text' ? 'text-blue-400' : 'text-gray-400'} />
                <div className="text-left">
                  <p className="text-sm text-white font-medium">Texte</p>
                  <p className="text-[10px] text-gray-400">Message écrit</p>
                </div>
              </button>
              <button
                onClick={() => setMessageType('voice')}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                  messageType === 'voice' ? 'bg-amber-500/20 border-amber-500' : 'bg-[#0b1a2a] border-gray-700 hover:border-gray-600'
                }`}
              >
                <Mic size={18} className={messageType === 'voice' ? 'text-amber-400' : 'text-gray-400'} />
                <div className="text-left">
                  <p className="text-sm text-white font-medium">Note vocale</p>
                  <p className="text-[10px] text-gray-400">Enregistrement audio</p>
                </div>
              </button>
            </div>
          </div>

          {/* Message Input */}
          <div className="bg-[#1e293b] rounded-lg border border-gray-700 p-4">
            <h3 className="text-xs font-semibold text-white mb-3">MESSAGE</h3>

            {messageType === 'text' ? (
              <div className="space-y-3">
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Écrire votre message..."
                  rows={5}
                  className="w-full bg-[#0b1a2a] border border-gray-700 rounded-lg p-3 text-white text-sm placeholder-gray-500 focus:border-green-500 focus:outline-none resize-none"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">{textContent.length} caractères</span>
                  <div className="flex items-center gap-2">
                    {/* Quick messages */}
                    {['Évacuation immédiate', 'Rassemblement zone A', 'Fin de poste', 'Alerte gaz'].map(qm => (
                      <button
                        key={qm}
                        onClick={() => setTextContent(qm)}
                        className="px-2 py-1 bg-[#334155] text-gray-300 text-[10px] rounded hover:bg-[#475569] transition-colors"
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
                <div className="flex flex-col items-center justify-center py-8 bg-[#0b1a2a] rounded-lg border border-gray-700">
                  {isRecording ? (
                    <>
                      <div className="relative">
                        <div className="w-20 h-20 bg-red-500/30 rounded-full flex items-center justify-center animate-pulse">
                          <Mic size={32} className="text-red-400" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping" />
                      </div>
                      <p className="text-lg text-white font-mono mt-4">{formatDuration(recordingDuration)}</p>
                      <p className="text-xs text-gray-400 mt-1">Enregistrement en cours...</p>
                      <button
                        onClick={() => setIsRecording(false)}
                        className="mt-4 flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
                      >
                        <MicOff size={16} />
                        Arrêter
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center">
                        <Mic size={32} className="text-amber-400" />
                      </div>
                      <p className="text-sm text-gray-400 mt-4">
                        {recordingDuration > 0
                          ? `Note vocale enregistrée (${formatDuration(recordingDuration)})`
                          : 'Appuyez pour enregistrer'}
                      </p>
                      <div className="flex items-center gap-3 mt-4">
                        <button
                          onClick={() => setIsRecording(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm rounded-lg transition-colors"
                        >
                          <Mic size={16} />
                          {recordingDuration > 0 ? 'Réenregistrer' : 'Enregistrer'}
                        </button>
                        {recordingDuration > 0 && (
                          <button
                            onClick={() => setRecordingDuration(0)}
                            className="flex items-center gap-2 px-4 py-2 bg-[#334155] hover:bg-[#475569] text-gray-300 text-sm rounded-lg transition-colors"
                          >
                            <X size={16} />
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
            className={`w-full flex items-center justify-center gap-3 py-4 rounded-lg text-white text-sm font-semibold transition-all ${
              canSend() && !sending
                ? 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/20'
                : 'bg-gray-600 cursor-not-allowed'
            }`}
          >
            {sending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send size={18} />
                Envoyer {recipientMode === 'all' ? 'à tous' : recipientMode === 'zone' ? `à ${selectedZone}` : `à ${selectedMiners.length} mineur(s)`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
