import { ReactNode, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

const WATCH_ALERT_TOAST_MS = 18000;

function isWatchUrgency(alert: { type?: string; source?: string } | null) {
  if (!alert) return false;
  return (
    alert.type === 'emergency' ||
    alert.type === 'fall' ||
    alert.source === 'LILYGO_INCIDENT'
  );
}

function watchAlertTitle(alert: { type?: string }) {
  if (alert.type === 'emergency') return 'BOUTON SOS ACTIVÉ';
  if (alert.type === 'fall') return 'CHUTE DÉTECTÉE';
  return 'ALERTE CRITIQUE';
}

export default function Layout({ children, currentPage, onPageChange, onLogout }: LayoutProps) {
  const navigate = useNavigate();
  const { miners, setSelectedMiner } = useStore();
  const liveToastAlert = useStore((state) => state.liveToastAlert);
  const setLiveToastAlert = useStore((state) => state.setLiveToastAlert);
  const [latestToast, setLatestToast] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (liveToastAlert && !liveToastAlert.resolved) {
      const isLilygo =
        liveToastAlert.type === 'emergency' ||
        liveToastAlert.type === 'fall' ||
        liveToastAlert.source === 'LILYGO_INCIDENT' ||
        liveToastAlert.source === 'SYSTEM' ||
        liveToastAlert.source === 'MANUAL';
      if (isLilygo) {
        setLatestToast(liveToastAlert);
        setShowToast(true);

        const holdMs = isWatchUrgency(liveToastAlert) ? WATCH_ALERT_TOAST_MS : 10000;
        const timer = setTimeout(() => {
          setShowToast(false);
          setLiveToastAlert(null);
        }, holdMs);
        return () => clearTimeout(timer);
      }
    }
  }, [liveToastAlert, liveToastAlert?.id, setLiveToastAlert]);

  useEffect(() => {
    if (!showToast || !latestToast) return;

    let audioCtx: AudioContext | null = null;
    let intervalId: number | undefined;

    const playBurst = () => {
      try {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return;
        if (!audioCtx) audioCtx = new Ctx();
        const ctx = audioCtx;
        const beep = (freq: number, duration: number, delay: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
          gain.gain.setValueAtTime(0.12, ctx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + duration - 0.02);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + duration);
        };
        if (latestToast.type === 'emergency') {
          beep(880, 0.18, 0);
          beep(880, 0.18, 0.28);
          beep(660, 0.22, 0.56);
        } else if (latestToast.type === 'fall') {
          beep(740, 0.2, 0);
          beep(520, 0.25, 0.28);
        } else {
          beep(587.33, 0.2, 0);
          beep(880, 0.25, 0.15);
        }
      } catch (e) {
        console.warn('Audio notification failed:', e);
      }
    };

    playBurst();
    if (isWatchUrgency(latestToast)) {
      intervalId = window.setInterval(playBurst, 1200);
    }

    return () => {
      if (intervalId) window.clearInterval(intervalId);
      if (audioCtx) {
        audioCtx.close().catch(() => undefined);
      }
    };
  }, [showToast, latestToast, latestToast?.id]);

  const dismissToast = () => {
    setShowToast(false);
    setLiveToastAlert(null);
  };

  const handleLocateMiner = () => {
    if (!latestToast) return;
    const isUrgency =
      latestToast.type === 'emergency' || latestToast.type === 'fall';
    if (!isUrgency || latestToast.resolved) {
      dismissToast();
      return;
    }
    const miner = miners.find((m) => m.id === latestToast.minerId);
    const hasWatch = miner ? !!(miner.watchId || (miner as { watch_id?: string }).watch_id) : false;
    if (miner && hasWatch) {
      setSelectedMiner(miner);
      navigate('/localisation?tab=evacuation');
    }
    dismissToast();
  };

  return (
    <div className="flex h-screen bg-[#0f172a] relative overflow-hidden">
      <Sidebar currentPage={currentPage} onPageChange={onPageChange} onLogout={onLogout} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {showToast && latestToast && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm w-full p-4 rounded-xl border shadow-2xl transition-all duration-500 transform translate-x-0 ${
          latestToast.type === 'emergency' || latestToast.type === 'fall' || latestToast.severity === 'high'
            ? 'bg-red-950/90 border-red-500 text-white shadow-[0_0_25px_rgba(239,68,68,0.25)]'
            : 'bg-orange-950/90 border-orange-500 text-white shadow-[0_0_25px_rgba(249,115,22,0.25)]'
        }`}>
          <div className="absolute top-3 left-3 w-2.5 h-2.5 rounded-full bg-current animate-ping pointer-events-none opacity-75" />

          <div className="flex items-start gap-3 pl-2.5">
            <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
              latestToast.type === 'emergency' || latestToast.type === 'fall' || latestToast.severity === 'high'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-orange-500/20 text-orange-400'
            }`}>
              <AlertTriangle size={20} className="animate-bounce" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-400">
                  {watchAlertTitle(latestToast)}
                </span>
                <button
                  onClick={dismissToast}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <h4 className="text-sm font-bold mt-1 text-white truncate">
                {latestToast.minerName || 'INCIDENT DE ZONE'}
              </h4>

              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {latestToast.message || 'Un incident a été signalé.'}
              </p>

              {latestToast.predictedCause && (
                <div className="mt-2 text-[10px] bg-black/30 border border-red-500/20 text-red-300 px-2 py-1.5 rounded flex flex-col gap-0.5">
                  <span className="font-semibold text-red-400 uppercase tracking-wide text-[9px]">Analyse Prédictive :</span>
                  <span className="text-slate-200">{latestToast.predictedCause}</span>
                </div>
              )}

              <div className="flex items-center gap-1.5 mt-3 text-xs bg-black/40 px-2.5 py-1.5 rounded border border-gray-800">
                <MapPin size={12} className="text-cyan-400" />
                <span className="text-slate-300 font-medium truncate">
                  Zone d&apos;exploitation :{' '}
                  <strong className="text-white">
                    {latestToast.zone || 'Zone inconnue (montre)'}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={handleLocateMiner}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-1.5 px-3 rounded transition-all duration-300 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                >
                  Localiser le mineur
                </button>
                <button
                  onClick={dismissToast}
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
