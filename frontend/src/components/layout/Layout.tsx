import { ReactNode, useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useStore } from '../../store/useStore';
import { AlertTriangle, X, MapPin } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
  onLogout?: () => void;
}

export default function Layout({ children, currentPage, onPageChange, onLogout }: LayoutProps) {
  const { alerts, miners, setSelectedMiner } = useStore();
  const [latestToast, setLatestToast] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);
  const prevAlertsLength = useRef(alerts.length);

  useEffect(() => {
    // Detect new alerts
    if (alerts.length > prevAlertsLength.current) {
      const newAlert = alerts[0];
      if (newAlert && !newAlert.resolved) {
        setLatestToast(newAlert);
        
        // Afficher la notification POPUP uniquement pour les vrais SOS
        if (newAlert.type === 'emergency') {
          setShowToast(true);
          
          // Auto-dismiss after 8 seconds
          const timer = setTimeout(() => {
            setShowToast(false);
          }, 8000);
          return () => clearTimeout(timer);
        }
      }
    }
    prevAlertsLength.current = alerts.length;
  }, [alerts]);

  // Web Audio Alarm synthesis
  useEffect(() => {
    if (showToast && latestToast) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioCtx)();
        
        const playBeep = (freq: number, duration: number, delay: number) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
          gain.gain.setValueAtTime(0.15, audioCtx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + duration - 0.02);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(audioCtx.currentTime + delay);
          osc.stop(audioCtx.currentTime + delay + duration);
        };

        const isCritical = latestToast.type === 'emergency' || latestToast.severity === 'high';
        if (isCritical) {
          // Play repeating warning chime
          playBeep(880, 0.15, 0);
          playBeep(880, 0.15, 0.25);
          playBeep(880, 0.15, 0.5);
        } else {
          // Play warning chime
          playBeep(587.33, 0.2, 0);
          playBeep(880, 0.25, 0.15);
        }
      } catch (e) {
        console.warn('Audio notification failed:', e);
      }
    }
  }, [showToast, latestToast]);

  const handleLocateMiner = () => {
    if (!latestToast) return;
    const miner = miners.find((m) => m.id === latestToast.minerId);
    if (miner) {
      setSelectedMiner(miner);
      onPageChange('dashboard');
    }
    setShowToast(false);
  };

  return (
    <div className="flex min-h-screen bg-[#0f172a] relative overflow-hidden">
      <Sidebar currentPage={currentPage} onPageChange={onPageChange} onLogout={onLogout} />
      <div className="flex-1 flex flex-col">
        <Topbar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>

      {/* Global Real-time Alert Toast Notification */}
      {showToast && latestToast && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm w-full p-4 rounded-xl border shadow-2xl transition-all duration-500 transform translate-x-0 ${
          latestToast.type === 'emergency' || latestToast.severity === 'high'
            ? 'bg-red-950/90 border-red-500 text-white shadow-[0_0_25px_rgba(239,68,68,0.25)]'
            : 'bg-orange-950/90 border-orange-500 text-white shadow-[0_0_25px_rgba(249,115,22,0.25)]'
        }`}>
          {/* Pulse ring indicator */}
          <div className="absolute top-3 left-3 w-2.5 h-2.5 rounded-full bg-current animate-ping pointer-events-none opacity-75" />
          
          <div className="flex items-start gap-3 pl-2.5">
            <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
              latestToast.type === 'emergency' || latestToast.severity === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
            }`}>
              <AlertTriangle size={20} className="animate-bounce" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-400">
                  {latestToast.type === 'emergency' ? '🚨 BOUTON SOS ACTIVÉ' : '⚠️ ALERTE CRITIQUE'}
                </span>
                <button 
                  onClick={() => setShowToast(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <h4 className="text-sm font-bold mt-1 text-white truncate">
                Urgence Signalée par {latestToast.minerName}
              </h4>
              
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {latestToast.message || "Un incident a été signalé depuis la montre du mineur."}
              </p>

              {latestToast.predictedCause && (
                <div className="mt-2 text-[10px] bg-black/30 border border-red-500/20 text-red-300 px-2 py-1.5 rounded flex flex-col gap-0.5">
                  <span className="font-semibold text-red-400 uppercase tracking-wide text-[9px]">Analyse Prédictive :</span>
                  <span className="text-slate-200">{latestToast.predictedCause}</span>
                </div>
              )}

              {/* Position details */}
              <div className="flex items-center gap-1.5 mt-3 text-xs bg-black/40 px-2.5 py-1.5 rounded border border-gray-800">
                <MapPin size={12} className="text-cyan-400" />
                <span className="text-slate-300 font-medium truncate">
                  Zone d'exploitation : <strong className="text-white">{latestToast.zone || 'ZONE A'}</strong>
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={handleLocateMiner}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-1.5 px-3 rounded transition-all duration-300 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                >
                  Localiser le mineur
                </button>
                <button
                  onClick={() => setShowToast(false)}
                  className="px-3 py-1.5 bg-[#334155]/60 hover:bg-[#334155] border border-gray-700 rounded text-slate-300 hover:text-white text-xs font-semibold transition-all"
                >
                  Ignorer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
